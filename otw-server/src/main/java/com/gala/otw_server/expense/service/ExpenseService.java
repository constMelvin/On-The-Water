package com.gala.otw_server.expense.service;

import com.gala.otw_server.cache.CacheKeys;
import com.gala.otw_server.cache.CacheService;
import com.gala.otw_server.chat.service.ChatSystemMessageService;
import com.gala.otw_server.common.DomainExceptions.*;
import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.expense.dto.*;
import com.gala.otw_server.expense.entity.Expense;
import com.gala.otw_server.expense.entity.ExpenseCategory;
import com.gala.otw_server.expense.entity.ExpenseShare;
import com.gala.otw_server.expense.entity.SettlementPayment;
import com.gala.otw_server.expense.repository.ExpenseRepository;
import com.gala.otw_server.expense.repository.SettlementPaymentRepository;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.entity.RoomMember;
import com.gala.otw_server.room.entity.RsvpStatus;
import com.gala.otw_server.room.repository.RoomMemberRepository;
import com.gala.otw_server.room.repository.RoomRepository;
import com.gala.otw_server.security.auth.RoomRole;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Service
@Transactional
public class ExpenseService {

    private static final int MAX_PAYMENTS_RETURNED = 200;
    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2);

    private final ExpenseRepository expenseRepo;
    private final SettlementPaymentRepository paymentRepo;
    private final RoomRepository roomRepo;
    private final RoomMemberRepository memberRepo;
    private final RealtimeEventPublisher realtime;
    private final CacheService cacheService;
    private final ChatSystemMessageService chatSystem;

    public ExpenseService(ExpenseRepository expenseRepo,
                          SettlementPaymentRepository paymentRepo,
                          RoomRepository roomRepo,
                          RoomMemberRepository memberRepo,
                          RealtimeEventPublisher realtime,
                          CacheService cacheService,
                          ChatSystemMessageService chatSystem) {
        this.expenseRepo = expenseRepo;
        this.paymentRepo = paymentRepo;
        this.roomRepo = roomRepo;
        this.memberRepo = memberRepo;
        this.realtime = realtime;
        this.cacheService = cacheService;
        this.chatSystem = chatSystem;
    }

    // ── List expenses ─────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PageResponse<ExpenseDto> getExpenses(UUID roomId, UUID cursor, int limit) {
        verifyRoomExists(roomId);

        List<Expense> expenses = expenseRepo.findExpenses(
                roomId,
                cursor,
                PageRequest.of(0, limit + 1)
        );

        boolean hasMore = expenses.size() > limit;
        List<ExpenseDto> page = expenses.stream()
                .limit(limit)
                .map(ExpenseDto::from)
                .toList();

        String nextCursor = (hasMore && !page.isEmpty())
                ? page.get(page.size() - 1).id().toString()
                : null;

        return PageResponse.of(page, nextCursor, limit);
    }

    // ── Create expense ────────────────────────────────────────────────────────

    public ExpenseDto createExpense(UUID roomId, UUID callerId, CreateExpenseRequest req) {
        Room room = verifyRoomExists(roomId);
        verifyMemberOfRoom(roomId, callerId);

        UUID paidBy = req.paidBy() != null ? req.paidBy() : callerId;
        if (!paidBy.equals(callerId)) {
            verifyMemberOfRoom(roomId, paidBy);
        }

        BigDecimal totalAmount = req.amount().setScale(2, RoundingMode.HALF_UP);

        Expense expense = new Expense();
        expense.setRoom(room);
        expense.setDescription(req.description().trim());
        expense.setAmount(totalAmount);
        expense.setPaidBy(paidBy);
        expense.setCategory(req.category() != null ? req.category() : ExpenseCategory.OTHER);
        expense.setNote(req.note() == null || req.note().isBlank() ? null : req.note().trim());

        List<ExpenseShare> sharesToCreate;

        if (req.shares() != null && !req.shares().isEmpty()) {
            // Explicit custom shares provided: validate participants and sum
            sharesToCreate = processExplicitShares(roomId, totalAmount, req.shares());
        } else {
            // Equal split among specified participants, the members who are G, or everyone
            sharesToCreate = processEqualSplit(roomId, totalAmount, req.splitWithUserIds(), paidBy);
        }

        for (ExpenseShare share : sharesToCreate) {
            expense.addShare(share);
        }

        Expense saved = expenseRepo.save(expense);
        ExpenseDto dto = ExpenseDto.from(saved);

        cacheService.evictAfterCommit(CacheKeys.roomSettlement(roomId));
        publishAfterCommit(roomId, "expense.created", dto);
        chatSystem.card(roomId, callerId, "added an expense: " + saved.getDescription() + " · "
                + saved.getAmount().toPlainString(), ChatSystemMessageService.REF_EXPENSE, saved.getId());
        return dto;
    }

    // ── Delete expense ────────────────────────────────────────────────────────

    public void deleteExpense(UUID roomId, UUID expenseId, UUID callerId) {
        verifyRoomExists(roomId);

        Expense expense = expenseRepo.findByIdAndRoom_Id(expenseId, roomId)
                .orElseThrow(ExpenseNotFoundException::new);

        // Host or the original payer can delete
        if (!expense.getPaidBy().equals(callerId) && !isHost(roomId, callerId)) {
            throw new ForbiddenException("Only the payer or the room host can delete this expense");
        }

        expenseRepo.delete(expense);

        cacheService.evictAfterCommit(CacheKeys.roomSettlement(roomId));
        publishAfterCommit(roomId, "expense.deleted", Map.of(
                "id", expenseId,
                "roomId", roomId
        ));
    }

    // ── Calculate settlement ──────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public SettlementDto calculateSettlement(UUID roomId, UUID callerId) {
        verifyRoomExists(roomId);

        List<Expense> expenses = expenseRepo.findAllWithSharesByRoomId(roomId);
        List<SettlementPayment> payments = paymentRepo.findByRoomIdOrderByCreatedAtDesc(roomId);
        List<RoomMember> activeMembers = memberRepo.findByRoom_IdAndLeftAtIsNull(roomId);

        Set<UUID> allParticipants = new LinkedHashSet<>();
        for (RoomMember m : activeMembers) {
            allParticipants.add(m.getUserId());
        }

        Map<UUID, BigDecimal> paidMap = new HashMap<>();
        Map<UUID, BigDecimal> owedMap = new HashMap<>();
        Map<UUID, BigDecimal> sentMap = new HashMap<>();
        Map<UUID, BigDecimal> receivedMap = new HashMap<>();
        BigDecimal totalExpenses = ZERO;

        for (Expense expense : expenses) {
            totalExpenses = totalExpenses.add(expense.getAmount());
            allParticipants.add(expense.getPaidBy());
            paidMap.merge(expense.getPaidBy(), expense.getAmount(), BigDecimal::add);

            for (ExpenseShare share : expense.getShares()) {
                allParticipants.add(share.getUserId());
                owedMap.merge(share.getUserId(), share.getShareAmount(), BigDecimal::add);
            }
        }

        for (SettlementPayment p : payments) {
            allParticipants.add(p.getFromUserId());
            allParticipants.add(p.getToUserId());
            sentMap.merge(p.getFromUserId(), p.getAmount(), BigDecimal::add);
            receivedMap.merge(p.getToUserId(), p.getAmount(), BigDecimal::add);
        }

        List<SettlementDto.UserBalanceDto> balances = new ArrayList<>();
        List<ParticipantBalance> debtors = new ArrayList<>();
        List<ParticipantBalance> creditors = new ArrayList<>();

        for (UUID userId : allParticipants) {
            BigDecimal paid = money(paidMap.get(userId));
            BigDecimal owed = money(owedMap.get(userId));
            BigDecimal sent = money(sentMap.get(userId));
            BigDecimal received = money(receivedMap.get(userId));
            // Paying someone back raises your balance; being paid back lowers theirs.
            BigDecimal net = paid.subtract(owed).add(sent).subtract(received).setScale(2, RoundingMode.HALF_UP);

            balances.add(new SettlementDto.UserBalanceDto(userId, paid, owed, sent, received, net));

            int comparison = net.compareTo(BigDecimal.ZERO);
            if (comparison > 0) {
                creditors.add(new ParticipantBalance(userId, net));
            } else if (comparison < 0) {
                debtors.add(new ParticipantBalance(userId, net.negate()));
            }
        }

        // Greedy debt simplification algorithm: minimize the number of cross-member transactions
        List<SettlementDto.DebtTransferDto> transfers = simplifyDebts(debtors, creditors);

        SettlementDto.MyTotalsDto me = null;
        if (callerId != null) {
            BigDecimal myNet = balances.stream().filter(b -> b.userId().equals(callerId))
                    .map(SettlementDto.UserBalanceDto::netBalance).findFirst().orElse(ZERO);
            me = new SettlementDto.MyTotalsDto(money(owedMap.get(callerId)), money(paidMap.get(callerId)), myNet);
        }

        List<SettlementPaymentDto> paymentDtos = payments.stream()
                .limit(MAX_PAYMENTS_RETURNED)
                .map(SettlementPaymentDto::from)
                .toList();

        boolean settled = !expenses.isEmpty() && transfers.isEmpty();
        return new SettlementDto(roomId, totalExpenses, balances, transfers, paymentDtos, me, settled);
    }

    // ── Mark paid ─────────────────────────────────────────────────────────────

    /**
     * Records that {@code fromUserId} paid {@code toUserId}. Only the two people involved
     * or the host can record it, and it must match an outstanding transfer (a partial
     * amount is fine; more than is owed is not).
     */
    public SettlementPaymentDto recordPayment(UUID roomId, UUID callerId, RecordPaymentRequest req) {
        if (req.fromUserId().equals(req.toUserId())) {
            throw new InvalidRequestException("Someone can't pay themselves back");
        }
        verifyMemberOfRoom(roomId, req.fromUserId());
        verifyMemberOfRoom(roomId, req.toUserId());
        boolean involved = callerId.equals(req.fromUserId()) || callerId.equals(req.toUserId());
        if (!involved && !isHost(roomId, callerId)) {
            throw new ForbiddenException("Only the two people involved or the Gala Leader can mark this paid");
        }

        BigDecimal outstanding = calculateSettlement(roomId, null).transfers().stream()
                .filter(t -> t.fromUserId().equals(req.fromUserId()) && t.toUserId().equals(req.toUserId()))
                .map(SettlementDto.DebtTransferDto::amount)
                .findFirst()
                .orElseThrow(() -> new SettlementMismatchException("Nothing is owed between these two right now"));

        BigDecimal amount = req.amount() != null ? req.amount().setScale(2, RoundingMode.HALF_UP) : outstanding;
        if (amount.compareTo(outstanding) > 0) {
            throw new SettlementMismatchException("That's more than the " + outstanding.toPlainString() + " still owed");
        }

        SettlementPayment p = new SettlementPayment();
        p.setRoomId(roomId);
        p.setFromUserId(req.fromUserId());
        p.setToUserId(req.toUserId());
        p.setAmount(amount);
        p.setRecordedBy(callerId);
        SettlementPaymentDto dto = SettlementPaymentDto.from(paymentRepo.save(p));

        cacheService.evictAfterCommit(CacheKeys.roomSettlement(roomId));
        publishAfterCommit(roomId, "settlement.payment.recorded", dto);
        return dto;
    }

    /** Undo a "Mark paid" — the person who recorded it, or the host. */
    public void deletePayment(UUID roomId, UUID paymentId, UUID callerId) {
        SettlementPayment p = paymentRepo.findByIdAndRoomId(paymentId, roomId)
                .orElseThrow(PaymentNotFoundException::new);
        if (!p.getRecordedBy().equals(callerId) && !isHost(roomId, callerId)) {
            throw new ForbiddenException("Only whoever marked it paid or the Gala Leader can undo this");
        }
        paymentRepo.delete(p);

        cacheService.evictAfterCommit(CacheKeys.roomSettlement(roomId));
        publishAfterCommit(roomId, "settlement.payment.deleted", Map.of("id", paymentId, "roomId", roomId));
    }

    // ── Helper methods ────────────────────────────────────────────────────────

    private List<ExpenseShare> processExplicitShares(UUID roomId, BigDecimal totalAmount, List<ExpenseShareDto> shares) {
        BigDecimal sum = ZERO;
        Set<UUID> seenUsers = new HashSet<>();
        List<ExpenseShare> result = new ArrayList<>();

        for (ExpenseShareDto s : shares) {
            if (!seenUsers.add(s.userId())) {
                throw new InvalidRequestException("Duplicate user ID in expense shares: " + s.userId());
            }
            verifyMemberOfRoom(roomId, s.userId());

            BigDecimal shareAmount = s.shareAmount().setScale(2, RoundingMode.HALF_UP);
            sum = sum.add(shareAmount);

            ExpenseShare share = new ExpenseShare();
            share.setUserId(s.userId());
            share.setShareAmount(shareAmount);
            result.add(share);
        }

        if (sum.compareTo(totalAmount) != 0) {
            throw new InvalidRequestException(
                    "The sum of shares (" + sum + ") must equal the total expense amount (" + totalAmount + ")");
        }

        return result;
    }

    private List<ExpenseShare> processEqualSplit(UUID roomId, BigDecimal totalAmount, List<UUID> splitWithUserIds, UUID payerId) {
        Set<UUID> targets = new LinkedHashSet<>();

        if (splitWithUserIds != null && !splitWithUserIds.isEmpty()) {
            for (UUID uid : splitWithUserIds) {
                verifyMemberOfRoom(roomId, uid);
                targets.add(uid);
            }
        } else {
            // Default: "Split equally between" the people who are G; everyone if nobody answered yet.
            List<RoomMember> active = memberRepo.findByRoom_IdAndLeftAtIsNull(roomId);
            for (RoomMember m : active) {
                if (m.getRsvpStatus() == RsvpStatus.GOING) targets.add(m.getUserId());
            }
            if (targets.isEmpty()) {
                for (RoomMember m : active) {
                    targets.add(m.getUserId());
                }
            }
        }

        if (targets.isEmpty()) {
            targets.add(payerId);
        }

        int count = targets.size();
        BigDecimal base = totalAmount.divide(BigDecimal.valueOf(count), 2, RoundingMode.DOWN);
        BigDecimal remainder = totalAmount.subtract(base.multiply(BigDecimal.valueOf(count)));
        int centsRemainder = remainder.movePointRight(2).intValueExact();

        List<ExpenseShare> result = new ArrayList<>();
        int index = 0;
        for (UUID uid : targets) {
            BigDecimal shareAmount = base;
            if (index < centsRemainder) {
                shareAmount = shareAmount.add(new BigDecimal("0.01"));
            }
            ExpenseShare share = new ExpenseShare();
            share.setUserId(uid);
            share.setShareAmount(shareAmount.setScale(2, RoundingMode.HALF_UP));
            result.add(share);
            index++;
        }

        return result;
    }

    private List<SettlementDto.DebtTransferDto> simplifyDebts(List<ParticipantBalance> debtors, List<ParticipantBalance> creditors) {
        List<SettlementDto.DebtTransferDto> transfers = new ArrayList<>();

        while (!debtors.isEmpty() && !creditors.isEmpty()) {
            debtors.sort((a, b) -> b.amount.compareTo(a.amount));
            creditors.sort((a, b) -> b.amount.compareTo(a.amount));

            ParticipantBalance debtor = debtors.get(0);
            ParticipantBalance creditor = creditors.get(0);

            BigDecimal transferAmount = debtor.amount.min(creditor.amount).setScale(2, RoundingMode.HALF_UP);

            if (transferAmount.compareTo(BigDecimal.ZERO) > 0) {
                transfers.add(new SettlementDto.DebtTransferDto(debtor.userId, creditor.userId, transferAmount));
            }

            debtor.amount = debtor.amount.subtract(transferAmount);
            creditor.amount = creditor.amount.subtract(transferAmount);

            if (debtor.amount.compareTo(BigDecimal.ZERO) <= 0) {
                debtors.remove(0);
            }
            if (creditor.amount.compareTo(BigDecimal.ZERO) <= 0) {
                creditors.remove(0);
            }
        }

        return transfers;
    }

    private static class ParticipantBalance {
        final UUID userId;
        BigDecimal amount;

        ParticipantBalance(UUID userId, BigDecimal amount) {
            this.userId = userId;
            this.amount = amount;
        }
    }

    private static BigDecimal money(BigDecimal v) {
        return v == null ? ZERO : v.setScale(2, RoundingMode.HALF_UP);
    }

    private boolean isHost(UUID roomId, UUID userId) {
        RoomMember member = memberRepo.findByRoom_IdAndUserIdAndLeftAtIsNull(roomId, userId)
                .orElseThrow(NotARoomMemberException::new);
        return member.getRole() == RoomRole.HOST;
    }

    /** Archived rooms stay readable; writes are already blocked by {@code RoomAccessAspect}. */
    private Room verifyRoomExists(UUID roomId) {
        return roomRepo.findById(roomId).orElseThrow(RoomNotFoundException::new);
    }

    private void verifyMemberOfRoom(UUID roomId, UUID userId) {
        boolean isMember = memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, userId);
        if (!isMember) {
            throw new MemberNotFoundException();
        }
    }

    private void publishAfterCommit(UUID roomId, String event, Object payload) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    realtime.publish(roomId, event, payload);
                }
            });
        } else {
            realtime.publish(roomId, event, payload);
        }
    }
}
