package com.gala.otw_server.budget.service;

import com.gala.otw_server.budget.dto.BudgetDto;
import com.gala.otw_server.budget.dto.UpdateBudgetRequest;
import com.gala.otw_server.budget.entity.BudgetEstimate;
import com.gala.otw_server.budget.repository.BudgetEstimateRepository;
import com.gala.otw_server.common.DomainExceptions.RoomNotFoundException;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.repository.RoomRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.RoundingMode;
import java.util.UUID;

@Service
@Transactional
public class BudgetService {

    private final BudgetEstimateRepository budgetRepo;
    private final RoomRepository roomRepo;

    public BudgetService(BudgetEstimateRepository budgetRepo, RoomRepository roomRepo) {
        this.budgetRepo = budgetRepo;
        this.roomRepo = roomRepo;
    }

    @Transactional(readOnly = true)
    public BudgetDto getBudget(UUID roomId) {
        verifyActiveRoom(roomId);
        return budgetRepo.findById(roomId)
                .map(BudgetDto::from)
                .orElseGet(() -> BudgetDto.empty(roomId));
    }

    public BudgetDto setBudget(UUID roomId, UUID callerId, UpdateBudgetRequest req) {
        Room room = verifyActiveRoom(roomId);

        BudgetEstimate estimate = budgetRepo.findById(roomId).orElseGet(() -> {
            BudgetEstimate be = new BudgetEstimate();
            be.setRoomId(roomId);
            be.setRoom(room);
            return be;
        });

        estimate.setEstimatedAmount(req.estimatedAmount().setScale(2, RoundingMode.HALF_UP));
        if (req.currency() != null && !req.currency().isBlank()) {
            estimate.setCurrency(req.currency().trim().toUpperCase());
        }
        estimate.setUpdatedBy(callerId);

        BudgetEstimate saved = budgetRepo.save(estimate);
        return BudgetDto.from(saved);
    }

    private Room verifyActiveRoom(UUID roomId) {
        return roomRepo.findById(roomId)
                .filter(r -> "ACTIVE".equals(r.getStatus()))
                .orElseThrow(RoomNotFoundException::new);
    }
}
