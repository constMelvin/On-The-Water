package com.gala.otw_server.budget.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Request body for {@code PUT /api/v1/rooms/{roomId}/budget}.
 */
public record UpdateBudgetRequest(

        @NotNull(message = "Estimated amount is required")
        @DecimalMin(value = "0.00", message = "Estimated amount must be greater than or equal to 0")
        BigDecimal estimatedAmount,

        @Size(min = 3, max = 3, message = "Currency must be a 3-character ISO code (e.g. PHP, USD)")
        String currency
) {}
