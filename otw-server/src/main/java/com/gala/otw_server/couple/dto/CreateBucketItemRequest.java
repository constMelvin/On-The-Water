package com.gala.otw_server.couple.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Request body for {@code POST /api/v1/rooms/{roomId}/couple/bucket}. */
public record CreateBucketItemRequest(

        @NotBlank(message = "Give it a title")
        @Size(max = 120, message = "Title must be at most 120 characters")
        String title,

        @Size(max = 500, message = "Description must be at most 500 characters")
        String description,

        @DecimalMin(value = "0.00", message = "Budget can't be negative")
        @Digits(integer = 10, fraction = 2, message = "Budget has too many digits")
        BigDecimal estBudget,

        LocalDate targetDate
) {}
