package com.gala.otw_server.budget;

import com.gala.otw_server.budget.dto.BudgetDto;
import com.gala.otw_server.budget.dto.UpdateBudgetRequest;
import com.gala.otw_server.budget.entity.BudgetEstimate;
import com.gala.otw_server.budget.repository.BudgetEstimateRepository;
import com.gala.otw_server.budget.service.BudgetService;
import com.gala.otw_server.common.DomainExceptions.PermissionDisabledException;
import com.gala.otw_server.realtime.RealtimeEventPublisher;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.entity.RoomMember;
import com.gala.otw_server.room.entity.RoomType;
import com.gala.otw_server.room.entity.RsvpStatus;
import com.gala.otw_server.room.repository.RoomMemberRepository;
import com.gala.otw_server.room.repository.RoomRepository;
import com.gala.otw_server.room.service.RoomPermissionService;
import com.gala.otw_server.room.service.RoomPermissionService.Permission;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BudgetServiceTest {

    @Mock
    private BudgetEstimateRepository budgetRepo;

    @Mock
    private RoomRepository roomRepo;

    @Mock
    private RoomMemberRepository memberRepo;

    @Mock
    private RoomPermissionService permissions;

    @Mock
    private RealtimeEventPublisher realtime;

    @Mock
    private ApplicationEventPublisher events;

    private BudgetService budgetService;

    private final UUID roomId = UUID.randomUUID();
    private final UUID callerId = UUID.randomUUID();
    private Room room;

    @BeforeEach
    void setUp() {
        budgetService = new BudgetService(budgetRepo, roomRepo, memberRepo, permissions, realtime, events);
        room = new Room();
        room.setId(roomId);
        room.setTitle("Baguio");
        room.setStatus("ACTIVE");
    }

    private RoomMember member(RsvpStatus status) {
        RoomMember m = new RoomMember();
        m.setRsvpStatus(status);
        return m;
    }

    @Test
    @DisplayName("getBudget returns a zero budget whose people count defaults to the members who are G")
    void getBudget_DefaultEmpty() {
        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        when(budgetRepo.findById(roomId)).thenReturn(Optional.empty());
        when(memberRepo.findByRoom_IdAndLeftAtIsNull(roomId)).thenReturn(List.of(
                member(RsvpStatus.GOING), member(RsvpStatus.GOING), member(RsvpStatus.MAYBE)));

        BudgetDto dto = budgetService.getBudget(roomId);

        assertThat(dto.roomId()).isEqualTo(roomId);
        assertThat(dto.estimatedAmount()).isEqualByComparingTo("0.00");
        assertThat(dto.participantCount()).isEqualTo(2);
        assertThat(dto.currency()).isEqualTo("PHP");
    }

    @Test
    @DisplayName("setBudget sums the five categories and rounds per-person HALF_UP to 2 decimals")
    void setBudget_CategoriesAndPerPerson() {
        when(permissions.require(roomId, callerId, Permission.EDIT_PLAN)).thenReturn(room);
        when(budgetRepo.findById(roomId)).thenReturn(Optional.empty());
        when(budgetRepo.save(any(BudgetEstimate.class))).thenAnswer(inv -> inv.getArgument(0));

        // Artifact example: 5600 + 6400 + 4800 + 2000 + 800 = 19600 for 8 → 2450.00 each
        BudgetDto dto = budgetService.setBudget(roomId, callerId, new UpdateBudgetRequest(
                new BigDecimal("5600"), new BigDecimal("6400"), new BigDecimal("4800"),
                new BigDecimal("2000"), new BigDecimal("800"), 8, "PHP"));

        assertThat(dto.estimatedAmount()).isEqualByComparingTo("19600.00");
        assertThat(dto.perPerson()).isEqualByComparingTo("2450.00");
        assertThat(dto.participantCount()).isEqualTo(8);
        assertThat(dto.updatedBy()).isEqualTo(callerId);
        verify(realtime).publish(eq(roomId), eq("budget.updated"), any());
        verify(events).publishEvent(any(Object.class));
    }

    @Test
    @DisplayName("per-person rounds HALF_UP: 100.00 ÷ 3 = 33.33, 200.00 ÷ 3 = 66.67")
    void perPerson_Rounding() {
        assertThat(BudgetDto.perPerson(new BigDecimal("100.00"), 3)).isEqualByComparingTo("33.33");
        assertThat(BudgetDto.perPerson(new BigDecimal("200.00"), 3)).isEqualByComparingTo("66.67");
        assertThat(BudgetDto.perPerson(new BigDecimal("10.00"), 0)).isEqualByComparingTo("10.00");
    }

    @Test
    @DisplayName("setBudget in Couple Mode always splits between 2")
    void setBudget_CoupleIsAlwaysTwo() {
        room.setRoomType(RoomType.COUPLE);
        when(permissions.require(roomId, callerId, Permission.EDIT_PLAN)).thenReturn(room);
        when(budgetRepo.findById(roomId)).thenReturn(Optional.empty());
        when(budgetRepo.save(any(BudgetEstimate.class))).thenAnswer(inv -> inv.getArgument(0));

        BudgetDto dto = budgetService.setBudget(roomId, callerId, new UpdateBudgetRequest(
                new BigDecimal("900"), null, new BigDecimal("1800"), new BigDecimal("700"), null, 10, null));

        assertThat(dto.participantCount()).isEqualTo(2);
        assertThat(dto.estimatedAmount()).isEqualByComparingTo("3400.00");
        assertThat(dto.perPerson()).isEqualByComparingTo("1700.00");
    }

    @Test
    @DisplayName("setBudget is refused for members when plan editing is off")
    void setBudget_PermissionDisabled() {
        when(permissions.require(roomId, callerId, Permission.EDIT_PLAN))
                .thenThrow(new PermissionDisabledException("off"));

        assertThatThrownBy(() -> budgetService.setBudget(roomId, callerId,
                new UpdateBudgetRequest(null, null, null, null, null, null, null)))
                .isInstanceOf(PermissionDisabledException.class);
        verify(budgetRepo, never()).save(any());
    }
}
