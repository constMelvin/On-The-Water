package com.gala.otw_server.itinerary.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;

/**
 * Request body for {@code POST /api/v1/rooms/{roomId}/itinerary}.
 */
public record CreateItineraryItemRequest(

        @NotBlank(message = "Title is required")
        @Size(max = 150, message = "Title must be at most 150 characters")
        String title,

        String notes,

        OffsetDateTime startsAt,

        @PositiveOrZero(message = "Position must be greater than or equal to 0")
        Integer position
) {}
