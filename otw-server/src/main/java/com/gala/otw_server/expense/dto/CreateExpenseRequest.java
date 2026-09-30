package com.gala.otw_server.expense.dto;

import com.gala.otw_server.expense.entity.ExpenseCategory;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
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
 * Otherwise the amount is split equally among {@code splitWithUserIds}; if that is empty too,
 * among the members who said "I'm G" (falling back to every active member).
 * {@code paidBy} defaults to the caller ("Paid by" picker in Add an expense).
 */
public record CreateExpenseRequest(

        @NotBlank(message = "Description is required")
        @Size(max = 150, message = "Description must be at most 150 characters")
        String description,

        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
        @DecimalMax(value = "9999999999.99", message = "Amount is too large")
        BigDecimal amount,

        UUID paidBy,

        ExpenseCategory category,

        @Size(max = 255, message = "Note must be at most 255 characters")
        String note,

        @Valid
        @Size(max = 200, message = "At most 200 shares")
        List<ExpenseShareDto> shares,

        @Size(max = 200, message = "At most 200 people")
        List<UUID> splitWithUserIds
) {}
