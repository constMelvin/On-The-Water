package com.gala.otw_server.group.dto;

import com.gala.otw_server.group.entity.GroupMember;
import com.gala.otw_server.security.auth.GroupRole;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Outbound representation of a single group member.
 */
public record GroupMemberDto(
        UUID id,
        UUID userId,
        String nickname,
        GroupRole role,
        OffsetDateTime joinedAt
) {
    public static GroupMemberDto from(GroupMember m) {
        return new GroupMemberDto(
                m.getId(),
                m.getUserId(),
                m.getNickname(),
                m.getRole(),
                m.getJoinedAt()
        );
    }
}
