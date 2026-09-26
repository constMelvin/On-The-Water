package com.gala.otw_server.room.dto;

import com.gala.otw_server.room.entity.RsvpStatus;
import jakarta.validation.constraints.NotNull;

/**
 * Request body for {@code PATCH /rooms/{roomId}/members/me/rsvp}.
 */
public record UpdateRsvpRequest(

        @NotNull(message = "RSVP status is required")
        RsvpStatus rsvpStatus
) {}
