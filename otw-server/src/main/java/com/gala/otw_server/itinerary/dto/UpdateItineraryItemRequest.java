package com.gala.otw_server.itinerary.dto;

import com.gala.otw_server.itinerary.entity.StopType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;

/**
 * Request body for {@code PATCH /api/v1/rooms/{roomId}/itinerary/{itemId}}.
 * {@code version} is required for optimistic locking concurrency control.
 * To move stops around, prefer {@code POST /itinerary/reorder}. {@code lat}/{@code lng} move the
 * pin (both or neither); {@code clearPin = true} removes it.
 */
public record UpdateItineraryItemRequest(

        @Size(max = 150, message = "Title must be at most 150 characters")
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

        Boolean clearPin,

        @PositiveOrZero(message = "Position must be greater than or equal to 0")
        Integer position,

        Boolean completed,

        @NotNull(message = "Version is required for concurrency control")
        Integer version
) {}
