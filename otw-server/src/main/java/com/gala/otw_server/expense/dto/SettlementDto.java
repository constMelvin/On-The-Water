package com.gala.otw_server.expense.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Computed settlement calculation for a room.
 * Derived dynamically on read — never stored as a mutable running total in the database.
 *
 * <p>{@code transfers} are what is still outstanding after recorded payments;
 * {@code payments} are the recorded "Mark paid" rows (shown with a Paid tag);
 * {@code me} feeds the four Ambagan tiles for the caller.
 */
public record SettlementDto(
        UUID roomId,
        BigDecimal totalExpenses,
        List<UserBalanceDto> balances,
        List<DebtTransferDto> transfers,
        List<SettlementPaymentDto> payments,
        MyTotalsDto me,
        boolean settled
) {
    public record UserBalanceDto(
            UUID userId,
            BigDecimal totalPaid,
            BigDecimal totalOwed,
            BigDecimal paymentsSent,
            BigDecimal paymentsReceived,
            BigDecimal netBalance
    ) {}

    public record DebtTransferDto(
            UUID fromUserId,
            UUID toUserId,
            BigDecimal amount
    ) {}

    /**
     * "Total spent / Your share / You've paid / Remaining": {@code remaining} is positive when
     * the caller is owed money and negative when they owe.
     */
    public record MyTotalsDto(
            BigDecimal share,
            BigDecimal paid,
            BigDecimal remaining
    ) {}
}
