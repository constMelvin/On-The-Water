package com.gala.otw_server.budget;

import com.gala.otw_server.budget.dto.BudgetDto;
import com.gala.otw_server.budget.dto.UpdateBudgetRequest;
import com.gala.otw_server.budget.entity.BudgetEstimate;
import com.gala.otw_server.budget.repository.BudgetEstimateRepository;
import com.gala.otw_server.budget.service.BudgetService;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.repository.RoomRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BudgetServiceTest {

    @Mock
    private BudgetEstimateRepository budgetRepo;

    @Mock
    private RoomRepository roomRepo;

    private BudgetService budgetService;

    private final UUID roomId = UUID.randomUUID();
    private final UUID callerId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        budgetService = new BudgetService(budgetRepo, roomRepo);
    }

    @Test
    @DisplayName("getBudget returns default zero budget if estimate does not exist yet")
    void getBudget_DefaultEmpty() {
        Room room = new Room();
        room.setId(roomId);
        room.setStatus("ACTIVE");

        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        when(budgetRepo.findById(roomId)).thenReturn(Optional.empty());

        BudgetDto dto = budgetService.getBudget(roomId);

        assertThat(dto.roomId()).isEqualTo(roomId);
        assertThat(dto.estimatedAmount()).isEqualByComparingTo("0.00");
        assertThat(dto.currency()).isEqualTo("PHP");
    }

    @Test
    @DisplayName("setBudget updates estimated amount and currency with BigDecimal scale 2")
    void setBudget_Success() {
        Room room = new Room();
        room.setId(roomId);
        room.setStatus("ACTIVE");

        when(roomRepo.findById(roomId)).thenReturn(Optional.of(room));
        when(budgetRepo.findById(roomId)).thenReturn(Optional.empty());
        when(budgetRepo.save(any(BudgetEstimate.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateBudgetRequest req = new UpdateBudgetRequest(new BigDecimal("15000.5"), "PHP");
        BudgetDto dto = budgetService.setBudget(roomId, callerId, req);

        assertThat(dto.estimatedAmount()).isEqualByComparingTo("15000.50");
        assertThat(dto.currency()).isEqualTo("PHP");
        assertThat(dto.updatedBy()).isEqualTo(callerId);
        verify(budgetRepo).save(any(BudgetEstimate.class));
    }
}
