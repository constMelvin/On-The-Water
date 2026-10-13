package com.gala.otw_server.profile.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;

/**
 * Request body for {@code POST /me/profile/photo/uploads}: the small square photo the browser is
 * about to upload. The server names the file itself (tied to the caller's account).
 */
public record StartProfilePhotoUploadRequest(
        @NotBlank(message = "File type is required")
        @Pattern(regexp = "^image/(webp|jpeg|png)$", message = "Profile photos must be WebP, JPEG or PNG")
        String mimeType,

        @NotNull(message = "File size is required")
        @Positive(message = "The file is empty")
        @Max(value = 2L * 1024 * 1024, message = "That photo is too big (2 MB max)")
        Long size
) {}
