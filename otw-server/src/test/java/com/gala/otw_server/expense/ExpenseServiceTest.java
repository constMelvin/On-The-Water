package com.gala.otw_server.expense;

import com.gala.otw_server.common.DomainExceptions.ForbiddenException;
import com.gala.otw_server.common.DomainExceptions.InvalidRequestException;
import com.gala.otw_server.expense.dto.CreateExpenseRequest;
import com.gala.otw_server.expense.dto.ExpenseDto;
import com.gala.otw_server.expense.dto.ExpenseShareDto;
import com.gala.otw_server.expense.dto.SettlementDto;
import com.gala.otw_server.expense.entity.Expense;
import com.gala.otw_server.expense.entity.ExpenseShare;
import com.gala.otw_server.expense.repository.ExpenseRepository;
import com.gala.otw_server.expense.service.ExpenseService;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.entity.RoomMember;
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
    private RoomRepository roomRepo;

    @Mock
    private RoomMemberRepository memberRepo;

    @Mock
    private RealtimeEventPublisher realtime;

    private ExpenseService expenseService;

    private final UUID roomId = UUID.randomUUID();
    private final UUID userA = UUID.randomUUID();
    private final UUID userB = UUID.randomUUID();
    private final UUID userC = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        expenseService = new ExpenseService(expenseRepo, roomRepo, memberRepo, realtime);
    }

    @Test
    @DisplayName("createExpense with equal split distributes remainder cents correctly without loss")
    void createExpense_EqualSplitWithRemainderCents() {
        Room room = new Room();
        room.setId(roomId);
        room.setStatus("ACTIVE");

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
        CreateExpenseRequest req = new CreateExpenseRequest(
                "Dinner",
                new BigDecimal("100.00"),
                null,
                List.of(userA, userB, userC)
        );

        ExpenseDto dto = expenseService.createExpense(roomId, userA, req);

        assertThat(dto.amount()).isEqualByComparingTo("100.00");
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
    @DisplayName("createExpense with custom shares throws InvalidRequestException if sum != amount")
    void createExpense_CustomSharesMismatch() {
        Room room = new Room();
        room.setId(roomId);
        room.setStatus("ACTIVE");

        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        when(memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, userA)).thenReturn(true);
        when(memberRepo.existsByRoom_IdAndUserIdAndLeftAtIsNull(roomId, userB)).thenReturn(true);

        // Sum is 40.00 + 50.00 = 90.00, but amount is 100.00
        CreateExpenseRequest req = new CreateExpenseRequest(
                "Groceries",
                new BigDecimal("100.00"),
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
        Room room = new Room();
        room.setId(roomId);
        room.setStatus("ACTIVE");

        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        when(memberRepo.findByRoom_IdAndLeftAtIsNull(roomId)).thenReturn(List.of());

        // Expense 1: User A paid 300.00, split equally 100 each among A, B, C
        Expense e1 = new Expense();
        e1.setId(UUID.randomUUID());
        e1.setRoom(room);
        e1.setDescription("Villa Rental");
        e1.setAmount(new BigDecimal("300.00"));
        e1.setPaidBy(userA);

        ExpenseShare s1A = new ExpenseShare();
        s1A.setUserId(userA);
        s1A.setShareAmount(new BigDecimal("100.00"));
        e1.addShare(s1A);

        ExpenseShare s1B = new ExpenseShare();
        s1B.setUserId(userB);
        s1B.setShareAmount(new BigDecimal("100.00"));
        e1.addShare(s1B);

        ExpenseShare s1C = new ExpenseShare();
        s1C.setUserId(userC);
        s1C.setShareAmount(new BigDecimal("100.00"));
        e1.addShare(s1C);

        // Expense 2: User B paid 60.00, split 30 each between B and C
        Expense e2 = new Expense();
        e2.setId(UUID.randomUUID());
        e2.setRoom(room);
        e2.setDescription("Groceries");
        e2.setAmount(new BigDecimal("60.00"));
        e2.setPaidBy(userB);

        ExpenseShare s2B = new ExpenseShare();
        s2B.setUserId(userB);
        s2B.setShareAmount(new BigDecimal("30.00"));
        e2.addShare(s2B);

        ExpenseShare s2C = new ExpenseShare();
        s2C.setUserId(userC);
        s2C.setShareAmount(new BigDecimal("30.00"));
        e2.addShare(s2C);

        when(expenseRepo.findAllWithSharesByRoomId(roomId)).thenReturn(List.of(e1, e2));

        SettlementDto settlement = expenseService.calculateSettlement(roomId);

        // Total expenses = 300 + 60 = 360.00
        assertThat(settlement.totalExpenses()).isEqualByComparingTo("360.00");

        // Net balances:
        // A paid 300, owed 100 -> net +200
        // B paid 60, owed 130 -> net -70
        // C paid 0, owed 130 -> net -130
        SettlementDto.UserBalanceDto balA = settlement.balances().stream()
                .filter(b -> b.userId().equals(userA)).findFirst().orElseThrow();
        SettlementDto.UserBalanceDto balB = settlement.balances().stream()
                .filter(b -> b.userId().equals(userB)).findFirst().orElseThrow();
        SettlementDto.UserBalanceDto balC = settlement.balances().stream()
                .filter(b -> b.userId().equals(userC)).findFirst().orElseThrow();

        assertThat(balA.netBalance()).isEqualByComparingTo("200.00");
        assertThat(balB.netBalance()).isEqualByComparingTo("-70.00");
        assertThat(balC.netBalance()).isEqualByComparingTo("-130.00");

        // Transfers:
        // C owes 130 to A
        // B owes 70 to A
        assertThat(settlement.transfers()).hasSize(2);

        BigDecimal totalTransferred = settlement.transfers().stream()
                .map(SettlementDto.DebtTransferDto::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        assertThat(totalTransferred).isEqualByComparingTo("200.00");

        SettlementDto.DebtTransferDto transferFromC = settlement.transfers().stream()
                .filter(t -> t.fromUserId().equals(userC)).findFirst().orElseThrow();
        assertThat(transferFromC.toUserId()).isEqualTo(userA);
        assertThat(transferFromC.amount()).isEqualByComparingTo("130.00");

        SettlementDto.DebtTransferDto transferFromB = settlement.transfers().stream()
                .filter(t -> t.fromUserId().equals(userB)).findFirst().orElseThrow();
        assertThat(transferFromB.toUserId()).isEqualTo(userA);
        assertThat(transferFromB.amount()).isEqualByComparingTo("70.00");
    }

    @Test
    @DisplayName("deleteExpense rejects non-payer non-host with ForbiddenException")
    void deleteExpense_ForbiddenForNonPayerNonHost() {
        Room room = new Room();
        room.setId(roomId);
        room.setStatus("ACTIVE");

        Expense e = new Expense();
        e.setId(UUID.randomUUID());
        e.setPaidBy(userA); // Paid by userA

        RoomMember memberB = new RoomMember();
        memberB.setRole(RoomRole.MEMBER); // Regular member

        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        when(expenseRepo.findByIdAndRoom_Id(e.getId(), roomId)).thenReturn(Optional.of(e));
        when(memberRepo.findByRoom_IdAndUserIdAndLeftAtIsNull(roomId, userB)).thenReturn(Optional.of(memberB));

        assertThatThrownBy(() -> expenseService.deleteExpense(roomId, e.getId(), userB))
                .isInstanceOf(ForbiddenException.class);

        verify(expenseRepo, never()).delete(any());
    }
}
