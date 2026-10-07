package com.gala.otw_server.itinerary.dto;

import com.gala.otw_server.itinerary.entity.StopType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;

/**
 * Request body for {@code POST /api/v1/rooms/{roomId}/itinerary} — "Add a Stop".
 * {@code title} is the place; {@code stopType} defaults to ACTIVITY; {@code lat}/{@code lng} its pin.
 */
public record CreateItineraryItemRequest(

        @NotBlank(message = "Place is required")
        @Size(max = 150, message = "Place must be at most 150 characters")
        String title,

        @Size(max = 2000, message = "Notes must be at most 2000 characters")
        String notes,

        OffsetDateTime startsAt,

        StopType stopType,

        /** The stop's map pin (from Add a Stop's place picker); send both or neither. */
        @DecimalMin(value = "-90", message = "Latitude must be between -90 and 90")
        @DecimalMax(value = "90", message = "Latitude must be between -90 and 90")
        Double lat,

        @DecimalMin(value = "-180", message = "Longitude must be between -180 and 180")
        @DecimalMax(value = "180", message = "Longitude must be between -180 and 180")
        Double lng,

        @PositiveOrZero(message = "Position must be greater than or equal to 0")
        Integer position
) {}
