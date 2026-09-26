package com.gala.otw_server.group.dto;

import com.gala.otw_server.group.entity.Group;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Outbound representation of a Group — safe to expose over the API.
 */
public record GroupDto(
        UUID id,
        String groupCode,
        String name,
        UUID createdBy,
        String status,
        OffsetDateTime createdAt
) {
    public static GroupDto from(Group g) {
        return new GroupDto(
                g.getId(),
                g.getGroupCode(),
                g.getName(),
                g.getCreatedBy(),
                g.getStatus(),
                g.getCreatedAt()
        );
    }
}
