package com.gala.otw_server.budget.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Request body for {@code PUT /api/v1/rooms/{roomId}/budget} — replaces the estimate.
 * Missing categories count as 0. {@code participantCount} defaults to the number of
 * members who said "I'm G" (and is always 2 in Couple Mode).
 */
public record UpdateBudgetRequest(

        @DecimalMin(value = "0.00", message = "Amounts can't be negative")
        @DecimalMax(value = "999999999.99", message = "Amount is too large")
        BigDecimal transportAmount,

        @DecimalMin(value = "0.00", message = "Amounts can't be negative")
        @DecimalMax(value = "999999999.99", message = "Amount is too large")
        BigDecimal stayAmount,

        @DecimalMin(value = "0.00", message = "Amounts can't be negative")
        @DecimalMax(value = "999999999.99", message = "Amount is too large")
        BigDecimal foodAmount,

        @DecimalMin(value = "0.00", message = "Amounts can't be negative")
        @DecimalMax(value = "999999999.99", message = "Amount is too large")
        BigDecimal activitiesAmount,

        @DecimalMin(value = "0.00", message = "Amounts can't be negative")
        @DecimalMax(value = "999999999.99", message = "Amount is too large")
        BigDecimal otherAmount,

        @Min(value = 1, message = "At least 1 person")
        @Max(value = 500, message = "At most 500 people")
        Integer participantCount,

        @Size(min = 3, max = 3, message = "Currency must be a 3-character ISO code (e.g. PHP, USD)")
        String currency
) {}
