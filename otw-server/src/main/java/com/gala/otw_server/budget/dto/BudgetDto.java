package com.gala.otw_server.budget.dto;

import com.gala.otw_server.budget.entity.BudgetEstimate;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Public response DTO for a room's budget estimate.
 */
public record BudgetDto(
        UUID roomId,
        BigDecimal estimatedAmount,
        String currency,
        UUID updatedBy,
        OffsetDateTime updatedAt
) {
    public static BudgetDto from(BudgetEstimate estimate) {
        return new BudgetDto(
                estimate.getRoomId(),
                estimate.getEstimatedAmount(),
                estimate.getCurrency(),
                estimate.getUpdatedBy(),
                estimate.getUpdatedAt()
        );
    }

    public static BudgetDto empty(UUID roomId) {
        return new BudgetDto(
                roomId,
                BigDecimal.ZERO.setScale(2),
                "PHP",
                null,
                OffsetDateTime.now()
        );
    }
}
