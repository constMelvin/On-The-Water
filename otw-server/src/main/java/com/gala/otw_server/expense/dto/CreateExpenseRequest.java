package com.gala.otw_server.expense.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Request body for {@code POST /api/v1/rooms/{roomId}/expenses}.
 * <p>
 * If {@code shares} is provided, the sum of all {@code shareAmount} must equal {@code amount}.
 * If {@code shares} is empty, the amount will be split equally among the participants listed in
 * {@code splitWithUserIds}, or among all active room members if {@code splitWithUserIds} is also empty.
 */
public record CreateExpenseRequest(

        @NotBlank(message = "Description is required")
        @Size(max = 150, message = "Description must be at most 150 characters")
        String description,

        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
        BigDecimal amount,

        @Valid
        List<ExpenseShareDto> shares,

        List<UUID> splitWithUserIds
) {}
