package com.gala.otw_server.photo.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * Request body for {@code POST /rooms/{roomId}/photos/uploads}: what the browser is about to
 * upload. The server opens a Drive upload session for exactly this type and size.
 */
public record StartUploadRequest(
        @NotBlank(message = "File name is required")
        @Size(max = 200, message = "File name must be at most 200 characters")
        String fileName,

        @NotBlank(message = "File type is required")
        @Pattern(regexp = "^(image|video)/[A-Za-z0-9.+-]{1,80}$", message = "Only photos and videos can go in the Gala Dump")
        String mimeType,

        @NotNull(message = "File size is required")
        @Positive(message = "The file is empty")
        @Max(value = 300L * 1024 * 1024, message = "That file is too big (300 MB max)")
        Long size
) {}
