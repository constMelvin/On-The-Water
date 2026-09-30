package com.gala.otw_server.budget.dto;

import com.gala.otw_server.budget.entity.BudgetEstimate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Public response DTO for a room's budget estimate. {@code estimatedAmount} is the
 * total of the five categories; {@code perPerson} is total ÷ participants (HALF_UP).
 */
public record BudgetDto(
        UUID roomId,
        BigDecimal transportAmount,
        BigDecimal stayAmount,
        BigDecimal foodAmount,
        BigDecimal activitiesAmount,
        BigDecimal otherAmount,
        int participantCount,
        BigDecimal estimatedAmount,
        BigDecimal perPerson,
        String currency,
        UUID updatedBy,
        OffsetDateTime updatedAt
) {
    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2);

    public static BudgetDto from(BudgetEstimate e) {
        BigDecimal total = e.total();
        return new BudgetDto(
                e.getRoomId(),
                e.getTransportAmount(),
                e.getStayAmount(),
                e.getFoodAmount(),
                e.getActivitiesAmount(),
                e.getOtherAmount(),
                e.getParticipantCount(),
                total,
                perPerson(total, e.getParticipantCount()),
                e.getCurrency(),
                e.getUpdatedBy(),
                e.getUpdatedAt()
        );
    }

    public static BudgetDto empty(UUID roomId, int participantCount) {
        return new BudgetDto(roomId, ZERO, ZERO, ZERO, ZERO, ZERO, participantCount, ZERO, ZERO,
                "PHP", null, OffsetDateTime.now());
    }

    public static BigDecimal perPerson(BigDecimal total, int participants) {
        return total.divide(BigDecimal.valueOf(Math.max(1, participants)), 2, RoundingMode.HALF_UP);
    }
}
