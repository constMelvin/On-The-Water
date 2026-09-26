package com.gala.otw_server.expense.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Computed settlement calculation for a room.
 * Derived dynamically on read — never stored as a mutable running total in the database.
 */
public record SettlementDto(
        UUID roomId,
        BigDecimal totalExpenses,
        List<UserBalanceDto> balances,
        List<DebtTransferDto> transfers
) {
    public record UserBalanceDto(
            UUID userId,
            BigDecimal totalPaid,
            BigDecimal totalOwed,
            BigDecimal netBalance
    ) {}

    public record DebtTransferDto(
            UUID fromUserId,
            UUID toUserId,
            BigDecimal amount
    ) {}
}
