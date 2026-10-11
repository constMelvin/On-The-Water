package com.gala.otw_server.couple.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Request body for {@code PATCH /api/v1/rooms/{roomId}/couple/bucket/{itemId}}. A null field means "leave as is".
 * Editing the item (title, description, budget, date) follows the "Edit the plan" toggle; completing it and
 * attaching a memory is open to both people. {@code version} is required for optimistic locking.
 */
public record UpdateBucketItemRequest(

        @Size(max = 120, message = "Title must be at most 120 characters")
        String title,

        @Size(max = 500, message = "Description must be at most 500 characters")
        String description,

        @DecimalMin(value = "0.00", message = "Budget can't be negative")
        @Digits(integer = 10, fraction = 2, message = "Budget has too many digits")
        BigDecimal estBudget,
        Boolean clearBudget,

        LocalDate targetDate,
        Boolean clearDate,

        /** true = done, false = back to "not yet". */
        Boolean completed,

        /** A photo already in this gala's Gala Dump, attached as the memory (only on a completed item). */
        UUID photoId,
        Boolean clearPhoto,

        @Size(max = 500, message = "Memory must be at most 500 characters")
        String memory,

        @NotNull(message = "Version is required for concurrency control")
        Integer version
) {}
