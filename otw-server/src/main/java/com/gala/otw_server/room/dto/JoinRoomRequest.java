package com.gala.otw_server.room.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for {@code POST /rooms/join} — join by room code.
 */
public record JoinRoomRequest(

        @NotBlank(message = "Room code is required")
        @Size(min = 8, max = 8, message = "Room code must be exactly 8 characters")
        String roomCode,

        @NotBlank(message = "Nickname is required")
        @Size(max = 60, message = "Nickname must be at most 60 characters")
        String nickname
) {}
