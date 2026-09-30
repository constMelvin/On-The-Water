package com.gala.otw_server.room.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Request body for {@code POST /rooms/enter/claim} — "Which one are you?".
 * Code + password are sent again so the endpoint stays stateless.
 */
public record ClaimMemberRequest(

        @NotBlank(message = "Room code is required")
        @Size(max = 16, message = "Room code is too long")
        String roomCode,

        @NotBlank(message = "Gala password is required")
        @Size(max = 72, message = "Gala password is too long")
        String password,

        @NotNull(message = "Pick which member you are")
        UUID memberId
) {}
