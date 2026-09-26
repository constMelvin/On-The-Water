package com.gala.otw_server.expense.service;

import com.gala.otw_server.common.DomainExceptions.*;
import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.expense.dto.*;
import com.gala.otw_server.expense.entity.Expense;
import com.gala.otw_server.expense.entity.ExpenseShare;
import com.gala.otw_server.expense.repository.ExpenseRepository;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.entity.RoomMember;
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

    private final ExpenseRepository expenseRepo;
    private final RoomRepository roomRepo;
    private final RoomMemberRepository memberRepo;
    private final RealtimeEventPublisher realtime;

    public ExpenseService(ExpenseRepository expenseRepo,
                          RoomRepository roomRepo,
                          RoomMemberRepository memberRepo,
                          RealtimeEventPublisher realtime) {
        this.expenseRepo = expenseRepo;
        this.roomRepo = roomRepo;
        this.memberRepo = memberRepo;
        this.realtime = realtime;
    }

    // ── List expenses ─────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PageResponse<ExpenseDto> getExpenses(UUID roomId, UUID cursor, int limit) {
        verifyActiveRoom(roomId);

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
        Room room = verifyActiveRoom(roomId);
        verifyMemberOfRoom(roomId, callerId);

        BigDecimal totalAmount = req.amount().setScale(2, RoundingMode.HALF_UP);

        Expense expense = new Expense();
        expense.setRoom(room);
        expense.setDescription(req.description().trim());
        expense.setAmount(totalAmount);
        expense.setPaidBy(callerId);

        List<ExpenseShare> sharesToCreate;

        if (req.shares() != null && !req.shares().isEmpty()) {
            // Explicit custom shares provided: validate participants and sum
            sharesToCreate = processExplicitShares(roomId, totalAmount, req.shares());
        } else {
            // Equal split among specified participants or all active room members
            sharesToCreate = processEqualSplit(roomId, totalAmount, req.splitWithUserIds(), callerId);
        }

        for (ExpenseShare share : sharesToCreate) {
            expense.addShare(share);
        }

        Expense saved = expenseRepo.save(expense);
        ExpenseDto dto = ExpenseDto.from(saved);

        publishAfterCommit(roomId, "expense.created", dto);
        return dto;
    }

    // ── Delete expense ────────────────────────────────────────────────────────

    public void deleteExpense(UUID roomId, UUID expenseId, UUID callerId) {
        verifyActiveRoom(roomId);

        Expense expense = expenseRepo.findByIdAndRoom_Id(expenseId, roomId)
                .orElseThrow(ExpenseNotFoundException::new);

        // Host or the original payer can delete
        if (!expense.getPaidBy().equals(callerId)) {
            RoomMember member = memberRepo.findByRoom_IdAndUserIdAndLeftAtIsNull(roomId, callerId)
                    .orElseThrow(NotARoomMemberException::new);
            if (member.getRole() != RoomRole.HOST) {
                throw new ForbiddenException("Only the payer or the room host can delete this expense");
            }
        }

        expenseRepo.delete(expense);

        publishAfterCommit(roomId, "expense.deleted", Map.of(
                "id", expenseId,
                "roomId", roomId
        ));
    }

    // ── Calculate settlement ──────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public SettlementDto calculateSettlement(UUID roomId) {
        verifyActiveRoom(roomId);

        List<Expense> expenses = expenseRepo.findAllWithSharesByRoomId(roomId);
        List<RoomMember> activeMembers = memberRepo.findByRoom_IdAndLeftAtIsNull(roomId);

        Set<UUID> allParticipants = new LinkedHashSet<>();
        for (RoomMember m : activeMembers) {
            allParticipants.add(m.getUserId());
        }

        Map<UUID, BigDecimal> paidMap = new HashMap<>();
        Map<UUID, BigDecimal> owedMap = new HashMap<>();
        BigDecimal totalExpenses = BigDecimal.ZERO.setScale(2);

        for (Expense expense : expenses) {
            totalExpenses = totalExpenses.add(expense.getAmount());
            allParticipants.add(expense.getPaidBy());
            paidMap.merge(expense.getPaidBy(), expense.getAmount(), BigDecimal::add);

            for (ExpenseShare share : expense.getShares()) {
                allParticipants.add(share.getUserId());
                owedMap.merge(share.getUserId(), share.getShareAmount(), BigDecimal::add);
            }
        }

        List<SettlementDto.UserBalanceDto> balances = new ArrayList<>();
        List<ParticipantBalance> debtors = new ArrayList<>();
        List<ParticipantBalance> creditors = new ArrayList<>();

        for (UUID userId : allParticipants) {
            BigDecimal paid = paidMap.getOrDefault(userId, BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
            BigDecimal owed = owedMap.getOrDefault(userId, BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
            BigDecimal net = paid.subtract(owed).setScale(2, RoundingMode.HALF_UP);

            balances.add(new SettlementDto.UserBalanceDto(userId, paid, owed, net));

            int comparison = net.compareTo(BigDecimal.ZERO);
            if (comparison > 0) {
                creditors.add(new ParticipantBalance(userId, net));
            } else if (comparison < 0) {
                debtors.add(new ParticipantBalance(userId, net.negate()));
            }
        }

        // Greedy debt simplification algorithm: minimize the number of cross-member transactions
        List<SettlementDto.DebtTransferDto> transfers = simplifyDebts(debtors, creditors);

        return new SettlementDto(roomId, totalExpenses, balances, transfers);
    }

    // ── Helper methods ────────────────────────────────────────────────────────

    private List<ExpenseShare> processExplicitShares(UUID roomId, BigDecimal totalAmount, List<ExpenseShareDto> shares) {
        BigDecimal sum = BigDecimal.ZERO.setScale(2);
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

    private List<ExpenseShare> processEqualSplit(UUID roomId, BigDecimal totalAmount, List<UUID> splitWithUserIds, UUID callerId) {
        Set<UUID> targets = new LinkedHashSet<>();

        if (splitWithUserIds != null && !splitWithUserIds.isEmpty()) {
            for (UUID uid : splitWithUserIds) {
                verifyMemberOfRoom(roomId, uid);
                targets.add(uid);
            }
        } else {
            List<RoomMember> active = memberRepo.findByRoom_IdAndLeftAtIsNull(roomId);
            for (RoomMember m : active) {
                targets.add(m.getUserId());
            }
        }

        if (targets.isEmpty()) {
            targets.add(callerId);
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

    private Room verifyActiveRoom(UUID roomId) {
        return roomRepo.findById(roomId)
                .filter(r -> "ACTIVE".equals(r.getStatus()))
                .orElseThrow(RoomNotFoundException::new);
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
