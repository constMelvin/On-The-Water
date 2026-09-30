package com.gala.otw_server.expense.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Request body for {@code POST /rooms/{roomId}/expenses/settlement/payments} — "Mark paid".
 * {@code amount} defaults to the full outstanding transfer from → to; a smaller amount
 * records a partial payment.
 */
public record RecordPaymentRequest(

        @NotNull(message = "Who paid is required")
        UUID fromUserId,

        @NotNull(message = "Who was paid is required")
        UUID toUserId,

        @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
        BigDecimal amount
) {}
