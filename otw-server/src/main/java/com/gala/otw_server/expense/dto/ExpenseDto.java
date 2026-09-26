package com.gala.otw_server.expense.dto;

import com.gala.otw_server.expense.entity.Expense;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Public response DTO for an expense.
 */
public record ExpenseDto(
        UUID id,
        UUID roomId,
        String description,
        BigDecimal amount,
        UUID paidBy,
        List<ExpenseShareDto> shares,
        OffsetDateTime createdAt
) {
    public static ExpenseDto from(Expense expense) {
        List<ExpenseShareDto> shareDtos = expense.getShares().stream()
                .map(ExpenseShareDto::from)
                .toList();

        return new ExpenseDto(
                expense.getId(),
                expense.getRoom().getId(),
                expense.getDescription(),
                expense.getAmount(),
                expense.getPaidBy(),
                shareDtos,
                expense.getCreatedAt()
        );
    }
}
