package com.gala.otw_server.room.dto;

import com.gala.otw_server.room.entity.RoomMember;
import com.gala.otw_server.room.entity.RsvpStatus;
import com.gala.otw_server.security.auth.RoomRole;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Outbound representation of a single room member.
 */
public record RoomMemberDto(
        UUID id,
        UUID userId,
        String nickname,
        RoomRole role,
        RsvpStatus rsvpStatus,
        OffsetDateTime joinedAt
) {
    public static RoomMemberDto from(RoomMember m) {
        return new RoomMemberDto(
                m.getId(),
                m.getUserId(),
                m.getNickname(),
                m.getRole(),
                m.getRsvpStatus(),
                m.getJoinedAt()
        );
    }
}
