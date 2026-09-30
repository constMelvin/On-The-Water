package com.gala.otw_server.photo.dto;

import com.gala.otw_server.photo.entity.Photo;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Public response DTO for a registered photo metadata record.
 */
public record PhotoDto(
        UUID id,
        UUID roomId,
        String driveFileId,
        UUID uploadedBy,
        String caption,
        String status,
        OffsetDateTime createdAt
) {
    public static PhotoDto from(Photo photo) {
        return new PhotoDto(
                photo.getId(),
                photo.getRoom().getId(),
                photo.getDriveFileId(),
                photo.getUploadedBy(),
                photo.getCaption(),
                photo.getStatus(),
                photo.getCreatedAt()
        );
    }
}
