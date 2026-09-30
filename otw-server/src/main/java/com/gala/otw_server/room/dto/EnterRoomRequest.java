package com.gala.otw_server.room.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request body for {@code POST /rooms/enter} — "Welcome back": Gala Code + Gala Password. */
public record EnterRoomRequest(

        @NotBlank(message = "Room code is required")
        @Size(max = 16, message = "Room code is too long")
        String roomCode,

        @NotBlank(message = "Gala password is required")
        @Size(max = 72, message = "Gala password is too long")
        String password
) {}
