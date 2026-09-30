package com.gala.otw_server.room.dto;

import com.gala.otw_server.room.entity.TravelStatus;
import jakarta.validation.constraints.NotNull;

/** Request body for {@code PUT /rooms/{roomId}/members/me/travel-status}. */
public record UpdateTravelStatusRequest(

        @NotNull(message = "Status is required")
        TravelStatus status
) {}
