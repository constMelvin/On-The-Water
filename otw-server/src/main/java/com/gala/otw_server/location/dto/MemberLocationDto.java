package com.gala.otw_server.location.dto;

import com.gala.otw_server.location.entity.MemberLocation;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Public response DTO for a shared member location.
 */
public record MemberLocationDto(
        UUID userId,
        double lat,
        double lng,
        ShareMode shareMode,
        OffsetDateTime expiresAt,
        OffsetDateTime updatedAt
) {
    public static MemberLocationDto from(MemberLocation location) {
        return new MemberLocationDto(
                location.getId().getUserId(),
                location.getLat(),
                location.getLng(),
                location.getShareMode(),
                location.getExpiresAt(),
                location.getUpdatedAt()
        );
    }
}
