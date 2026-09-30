package com.gala.otw_server.itinerary.dto;

import com.gala.otw_server.itinerary.entity.StopType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;

/**
 * Request body for {@code PATCH /api/v1/rooms/{roomId}/itinerary/{itemId}}.
 * {@code version} is required for optimistic locking concurrency control.
 * To move stops around, prefer {@code POST /itinerary/reorder}.
 */
public record UpdateItineraryItemRequest(

        @Size(max = 150, message = "Title must be at most 150 characters")
        String title,

        @Size(max = 2000, message = "Notes must be at most 2000 characters")
        String notes,

        OffsetDateTime startsAt,

        StopType stopType,

        @PositiveOrZero(message = "Position must be greater than or equal to 0")
        Integer position,

        Boolean completed,

        @NotNull(message = "Version is required for concurrency control")
        Integer version
) {}
