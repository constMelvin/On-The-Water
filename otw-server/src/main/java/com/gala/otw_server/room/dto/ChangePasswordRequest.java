package com.gala.otw_server.room.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request body for {@code PUT /rooms/{roomId}/password} (host only). */
public record ChangePasswordRequest(

        @NotBlank(message = "New gala password is required")
        @Size(min = 6, max = 72, message = "Gala password must be 6 to 72 characters")
        String newPassword
) {}
