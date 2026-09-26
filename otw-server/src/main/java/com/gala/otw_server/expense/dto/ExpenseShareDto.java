package com.gala.otw_server.expense.dto;

import com.gala.otw_server.expense.entity.ExpenseShare;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * DTO representing an individual member's share of an expense.
 */
public record ExpenseShareDto(
        @NotNull(message = "User ID is required")
        UUID userId,

        @NotNull(message = "Share amount is required")
        @DecimalMin(value = "0.00", message = "Share amount must be greater than or equal to 0")
        BigDecimal shareAmount
) {
    public static ExpenseShareDto from(ExpenseShare share) {
        return new ExpenseShareDto(share.getUserId(), share.getShareAmount());
    }
}
