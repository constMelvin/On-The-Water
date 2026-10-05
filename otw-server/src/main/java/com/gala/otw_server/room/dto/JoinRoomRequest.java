package com.gala.otw_server.room.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for {@code POST /rooms/join} — join by room code. The code may be
 * typed with an {@code OTW-} prefix, dashes or spaces; the service normalizes it.
 */
public record JoinRoomRequest(

        @NotBlank(message = "Room code is required")
        @Size(max = 16, message = "Room code is too long")
        String roomCode,

        @NotBlank(message = "Nickname is required")
        @Size(max = 60, message = "Nickname must be at most 60 characters")
        String nickname,

        /** Every join needs the Gala Password (2026-10-05). */
        @NotBlank(message = "Gala password is required")
        @Size(max = 72, message = "Gala password is too long")
        String password
) {}
