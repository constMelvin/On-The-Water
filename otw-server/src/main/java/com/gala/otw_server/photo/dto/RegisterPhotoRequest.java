package com.gala.otw_server.photo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for {@code POST /api/v1/rooms/{roomId}/photos}.
 */
public record RegisterPhotoRequest(

        @NotBlank(message = "Google Drive file ID is required")
        @Size(max = 200, message = "Drive file ID must be at most 200 characters")
        String driveFileId,

        @Size(max = 140, message = "Caption must be at most 140 characters")
        String caption
) {}
