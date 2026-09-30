package com.gala.otw_server.itinerary.dto;

import com.gala.otw_server.itinerary.entity.StopType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;

/**
 * Request body for {@code POST /api/v1/rooms/{roomId}/itinerary} — "Add a Stop".
 * {@code title} is the place; {@code stopType} defaults to ACTIVITY.
 */
public record CreateItineraryItemRequest(

        @NotBlank(message = "Place is required")
        @Size(max = 150, message = "Place must be at most 150 characters")
        String title,

        @Size(max = 2000, message = "Notes must be at most 2000 characters")
        String notes,

        OffsetDateTime startsAt,

        StopType stopType,

        @PositiveOrZero(message = "Position must be greater than or equal to 0")
        Integer position
) {}
