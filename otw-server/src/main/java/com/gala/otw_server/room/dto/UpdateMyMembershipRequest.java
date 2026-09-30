package com.gala.otw_server.room.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request body for {@code PATCH /rooms/{roomId}/members/me} — "Your name" in this gala. */
public record UpdateMyMembershipRequest(

        @NotBlank(message = "Nickname is required")
        @Size(max = 60, message = "Nickname must be at most 60 characters")
        String nickname
) {}
