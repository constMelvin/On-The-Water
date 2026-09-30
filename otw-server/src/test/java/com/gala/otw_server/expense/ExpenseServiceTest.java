package com.gala.otw_server.expense;

import com.gala.otw_server.cache.CacheService;
import com.gala.otw_server.chat.service.ChatSystemMessageService;
import com.gala.otw_server.common.DomainExceptions.ForbiddenException;
import com.gala.otw_server.common.DomainExceptions.InvalidRequestException;
import com.gala.otw_server.common.DomainExceptions.SettlementMismatchException;
import com.gala.otw_server.expense.dto.*;
import com.gala.otw_server.expense.entity.Expense;
import com.gala.otw_server.expense.entity.ExpenseCategory;
import com.gala.otw_server.expense.entity.ExpenseShare;
import com.gala.otw_server.expense.entity.SettlementPayment;
import com.gala.otw_server.expense.repository.ExpenseRepository;
import com.gala.otw_server.expense.repository.SettlementPaymentRepository;
import com.gala.otw_server.expense.service.ExpenseService;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.entity.RoomMember;
import com.gala.otw_server.room.entity.RsvpStatus;
import com.gala.otw_server.room.repository.RoomMemberRepository;
import com.gala.otw_server.room.repository.RoomRepository;
import com.gala.otw_server.security.auth.RoomRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ExpenseServiceTest {

    @Mock
    private ExpenseRepository expenseRepo;

    @Mock
    private SettlementPaymentRepository paymentRepo;

    @Mock
    private RoomRepository roomRepo;

    @Mock
    private RoomMemberRepository memberRepo;

    @Mock
    private RealtimeEventPublisher realtime;

    @Mock
    private CacheService cacheService;

    @Mock
    private ChatSystemMessageService chatSystem;

    private ExpenseService expenseService;

    private final UUID roomId = UUID.randomUUID();
    private final UUID userA = UUID.randomUUID();
    private final UUID userB = UUID.randomUUID();
    private final UUID userC = UUID.randomUUID();
    private Room room;

    @BeforeEach
    void setUp() {
        expenseService = new ExpenseService(expenseRepo, paymentRepo, roomRepo, memberRepo, realtime,
                cacheService, chatSystem);
        room = new Room();
        room.setId(roomId);
        room.setStatus("ACTIVE");
    }

    private CreateExpenseRequest equalSplit(String description, String amount, List<UUID> splitWith) {
        return new CreateExpenseRequest(description, new BigDecimal(amount), null, null, null, null, splitWith);
    }

    private RoomMember member(UUID userId, RsvpStatus status) {
        RoomMember m = new RoomMember();
        m.setUserId(userId);
        m.setRsvpStatus(status);
        m.setRole(RoomRole.MEMBER);
        return m;
    }

    private Expense expense(UUID paidBy, String amount, Object... sharePairs) {
        Expense e = new Expense();
        e.setId(UUID.randomUUID());
        e.setRoom(room);
        e.setDescription("x");
        e.setAmount(new BigDecimal(amount));
        e.setPaidBy(paidBy);
        for (int i = 0; i < sharePairs.length; i += 2) {
            ExpenseShare s = new ExpenseShare();
            s.setUserId((UUID) sharePairs[i]);
            s.setShareAmount(new BigDecimal((String) sharePairs[i + 1]));
            e.addShare(s);
        }
        return e;
    }

    private SettlementPayment payment(UUID from, UUID to, String amount) {
        SettlementPayment p = new SettlementPayment();
        p.setId(UUID.randomUUID());
        p.setRoomId(roomId);
        p.setFromUserId(from);
        p.setToUserId(to);
        p.setAmount(new BigDecimal(amount));
        p.setRecordedBy(from);
        return p;
    }

    @Test
    @DisplayName("createExpense with equal split distributes remainder cents correctly without loss")
    void createExpense_EqualSplitWithRemainderCents() {
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        when(memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, userA)).thenReturn(true);
        when(memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, userB)).thenReturn(true);
        when(memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, userC)).thenReturn(true);

        when(expenseRepo.save(any(Expense.class))).thenAnswer(inv -> {
            Expense e = inv.getArgument(0);
            e.setId(UUID.randomUUID());
            return e;
        });

        // 100.00 split among 3 users -> 33.34, 33.33, 33.33 -> sum = 100.00
        ExpenseDto dto = expenseService.createExpense(roomId, userA,
                equalSplit("Dinner", "100.00", List.of(userA, userB, userC)));

        assertThat(dto.amount()).isEqualByComparingTo("100.00");
        assertThat(dto.category()).isEqualTo(ExpenseCategory.OTHER);
        assertThat(dto.shares()).hasSize(3);

        BigDecimal totalShares = dto.shares().stream()
                .map(ExpenseShareDto::shareAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        assertThat(totalShares).isEqualByComparingTo("100.00");
        assertThat(dto.shares().get(0).shareAmount()).isEqualByComparingTo("33.34");
        assertThat(dto.shares().get(1).shareAmount()).isEqualByComparingTo("33.33");
        assertThat(dto.shares().get(2).shareAmount()).isEqualByComparingTo("33.33");
    }

    @Test
    @DisplayName("createExpense defaults to splitting between the members who are G, paid by the chosen member")
    void createExpense_DefaultSplitAmongGoing() {
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        when(memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, userA)).thenReturn(true);
        when(memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, userB)).thenReturn(true);
        when(memberRepo.findByRoom_IdAndLeftAtIsNull(roomId)).thenReturn(List.of(
                member(userA, RsvpStatus.GOING), member(userB, RsvpStatus.GOING), member(userC, RsvpStatus.MAYBE)));
        when(expenseRepo.save(any(Expense.class))).thenAnswer(inv -> inv.getArgument(0));

        ExpenseDto dto = expenseService.createExpense(roomId, userA, new CreateExpenseRequest(
                "Bus tickets", new BigDecimal("4800"), userB, ExpenseCategory.TRANSPORTATION, "Booked for all", null, null));

        assertThat(dto.paidBy()).isEqualTo(userB);
        assertThat(dto.category()).isEqualTo(ExpenseCategory.TRANSPORTATION);
        assertThat(dto.note()).isEqualTo("Booked for all");
        assertThat(dto.shares()).extracting(ExpenseShareDto::userId).containsExactly(userA, userB);
        assertThat(dto.shares()).allSatisfy(s -> assertThat(s.shareAmount()).isEqualByComparingTo("2400.00"));
    }

    @Test
    @DisplayName("createExpense with custom shares throws InvalidRequestException if sum != amount")
    void createExpense_CustomSharesMismatch() {
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        when(memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, userA)).thenReturn(true);
        when(memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, userB)).thenReturn(true);

        // Sum is 40.00 + 50.00 = 90.00, but amount is 100.00
        CreateExpenseRequest req = new CreateExpenseRequest(
                "Groceries",
                new BigDecimal("100.00"),
                null, null, null,
                List.of(
                        new ExpenseShareDto(userA, new BigDecimal("40.00")),
                        new ExpenseShareDto(userB, new BigDecimal("50.00"))
                ),
                null
        );

        assertThatThrownBy(() -> expenseService.createExpense(roomId, userA, req))
                .isInstanceOf(InvalidRequestException.class)
                .hasMessageContaining("must equal the total expense amount");

        verify(expenseRepo, never()).save(any());
    }

    @Test
    @DisplayName("calculateSettlement computes accurate who-owes-who transfers for multi-party uneven splits")
    void calculateSettlement_MultiPartyUnevenSplits() {
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        when(memberRepo.findByRoom_IdAndLeftAtIsNull(roomId)).thenReturn(List.of());
        when(paymentRepo.findByRoomIdOrderByCreatedAtDesc(roomId)).thenReturn(List.of());

        // Expense 1: User A paid 300.00, split equally 100 each among A, B, C
        // Expense 2: User B paid 60.00, split 30 each between B and C
        when(expenseRepo.findAllWithSharesByRoomId(roomId)).thenReturn(List.of(
                expense(userA, "300.00", userA, "100.00", userB, "100.00", userC, "100.00"),
                expense(userB, "60.00", userB, "30.00", userC, "30.00")));

        SettlementDto settlement = expenseService.calculateSettlement(roomId, userC);

        // Total expenses = 300 + 60 = 360.00
        assertThat(settlement.totalExpenses()).isEqualByComparingTo("360.00");

        // Net balances: A +200, B -70, C -130
        assertThat(net(settlement, userA)).isEqualByComparingTo("200.00");
        assertThat(net(settlement, userB)).isEqualByComparingTo("-70.00");
        assertThat(net(settlement, userC)).isEqualByComparingTo("-130.00");

        // Transfers: C owes 130 to A, B owes 70 to A
        assertThat(settlement.transfers()).hasSize(2);
        assertThat(transfer(settlement, userC).toUserId()).isEqualTo(userA);
        assertThat(transfer(settlement, userC).amount()).isEqualByComparingTo("130.00");
        assertThat(transfer(settlement, userB).toUserId()).isEqualTo(userA);
        assertThat(transfer(settlement, userB).amount()).isEqualByComparingTo("70.00");

        // Caller's tiles: share 130, paid 0, remaining -130 (owes)
        assertThat(settlement.me().share()).isEqualByComparingTo("130.00");
        assertThat(settlement.me().paid()).isEqualByComparingTo("0.00");
        assertThat(settlement.me().remaining()).isEqualByComparingTo("-130.00");
        assertThat(settlement.settled()).isFalse();
    }

    @Test
    @DisplayName("recorded payments reduce outstanding debts; a partial payment leaves the rest, a full one settles")
    void calculateSettlement_WithPayments() {
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        when(memberRepo.findByRoom_IdAndLeftAtIsNull(roomId)).thenReturn(List.of());
        when(expenseRepo.findAllWithSharesByRoomId(roomId)).thenReturn(List.of(
                expense(userA, "300.00", userA, "100.00", userB, "100.00", userC, "100.00")));

        // B paid A back fully, C paid 40 of 100
        when(paymentRepo.findByRoomIdOrderByCreatedAtDesc(roomId)).thenReturn(List.of(
                payment(userB, userA, "100.00"), payment(userC, userA, "40.00")));

        SettlementDto s = expenseService.calculateSettlement(roomId, userA);

        assertThat(net(s, userB)).isEqualByComparingTo("0.00");
        assertThat(net(s, userC)).isEqualByComparingTo("-60.00");
        assertThat(net(s, userA)).isEqualByComparingTo("60.00");
        assertThat(s.transfers()).hasSize(1);
        assertThat(transfer(s, userC).amount()).isEqualByComparingTo("60.00");
        assertThat(s.payments()).hasSize(2);
        assertThat(s.settled()).isFalse();

        // Once C pays the remaining 60, everything is settled.
        when(paymentRepo.findByRoomIdOrderByCreatedAtDesc(roomId)).thenReturn(List.of(
                payment(userB, userA, "100.00"), payment(userC, userA, "40.00"), payment(userC, userA, "60.00")));

        SettlementDto settled = expenseService.calculateSettlement(roomId, userA);
        assertThat(settled.transfers()).isEmpty();
        assertThat(settled.settled()).isTrue();
    }

    @Test
    @DisplayName("recordPayment defaults to the full outstanding amount and saves it")
    void recordPayment_FullAmount() {
        stubOneDebt(); // C owes A 100
        when(paymentRepo.save(any(SettlementPayment.class))).thenAnswer(inv -> inv.getArgument(0));

        SettlementPaymentDto dto = expenseService.recordPayment(roomId, userC,
                new RecordPaymentRequest(userC, userA, null));

        assertThat(dto.amount()).isEqualByComparingTo("100.00");
        assertThat(dto.recordedBy()).isEqualTo(userC);
        verify(realtime).publish(eq(roomId), eq("settlement.payment.recorded"), any());
    }

    @Test
    @DisplayName("recordPayment for more than is owed is rejected with SettlementMismatchException")
    void recordPayment_TooMuch() {
        stubOneDebt();

        assertThatThrownBy(() -> expenseService.recordPayment(roomId, userA,
                new RecordPaymentRequest(userC, userA, new BigDecimal("150.00"))))
                .isInstanceOf(SettlementMismatchException.class);
        verify(paymentRepo, never()).save(any());
    }

    @Test
    @DisplayName("recordPayment by someone not involved and not host is forbidden")
    void recordPayment_ByOutsider() {
        when(memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, userC)).thenReturn(true);
        when(memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, userA)).thenReturn(true);
        when(memberRepo.findByRoom_IdAndUserIdAndLeftAtIsNull(roomId, userB))
                .thenReturn(Optional.of(member(userB, RsvpStatus.GOING)));

        assertThatThrownBy(() -> expenseService.recordPayment(roomId, userB,
                new RecordPaymentRequest(userC, userA, null)))
                .isInstanceOf(ForbiddenException.class);
    }

    private void stubOneDebt() {
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        when(memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, userC)).thenReturn(true);
        when(memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, userA)).thenReturn(true);
        when(memberRepo.findByRoom_IdAndLeftAtIsNull(roomId)).thenReturn(List.of());
        when(expenseRepo.findAllWithSharesByRoomId(roomId)).thenReturn(List.of(
                expense(userA, "200.00", userA, "100.00", userC, "100.00")));
        when(paymentRepo.findByRoomIdOrderByCreatedAtDesc(roomId)).thenReturn(new ArrayList<>());
    }

    @Test
    @DisplayName("deleteExpense rejects non-payer non-host with ForbiddenException")
    void deleteExpense_ForbiddenForNonPayerNonHost() {
        Expense e = new Expense();
        e.setId(UUID.randomUUID());
        e.setPaidBy(userA); // Paid by userA

        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        when(expenseRepo.findByIdAndRoom_Id(e.getId(), roomId)).thenReturn(Optional.of(e));
        when(memberRepo.findByRoom_IdAndUserIdAndLeftAtIsNull(roomId, userB))
                .thenReturn(Optional.of(member(userB, RsvpStatus.GOING)));

        assertThatThrownBy(() -> expenseService.deleteExpense(roomId, e.getId(), userB))
                .isInstanceOf(ForbiddenException.class);

        verify(expenseRepo, never()).delete(any());
    }

    private static BigDecimal net(SettlementDto s, UUID userId) {
        return s.balances().stream().filter(b -> b.userId().equals(userId))
                .findFirst().orElseThrow().netBalance();
    }

    private static SettlementDto.DebtTransferDto transfer(SettlementDto s, UUID from) {
        return s.transfers().stream().filter(t -> t.fromUserId().equals(from)).findFirst().orElseThrow();
    }
}
