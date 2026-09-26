package com.gala.otw_server.itinerary.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;

/**
 * Request body for {@code PATCH /api/v1/rooms/{roomId}/itinerary/{itemId}}.
 * {@code version} is required for optimistic locking concurrency control.
 */
public record UpdateItineraryItemRequest(

        @Size(max = 150, message = "Title must be at most 150 characters")
        String title,

        String notes,

        OffsetDateTime startsAt,

        @PositiveOrZero(message = "Position must be greater than or equal to 0")
        Integer position,

        Boolean completed,

        @NotNull(message = "Version is required for concurrency control")
        Integer version
) {}
