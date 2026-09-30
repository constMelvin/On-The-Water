package com.gala.otw_server.room.dto;

import com.gala.otw_server.room.entity.RoomMember;
import com.gala.otw_server.room.entity.RsvpStatus;
import com.gala.otw_server.room.entity.TravelStatus;
import com.gala.otw_server.security.auth.RoomRole;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Outbound representation of a single room member.
 */
public record RoomMemberDto(
        UUID id,
        UUID roomId,
        UUID userId,
        String nickname,
        RoomRole role,
        RsvpStatus rsvpStatus,
        TravelStatus travelStatus,
        boolean hasAccount,
        OffsetDateTime joinedAt
) {
    public static RoomMemberDto from(RoomMember m) {
        return new RoomMemberDto(
                m.getId(),
                m.getRoom() != null ? m.getRoom().getId() : null,
                m.getUserId(),
                m.getNickname(),
                m.getRole(),
                m.getRsvpStatus(),
                m.getTravelStatus(),
                m.isHasAccount(),
                m.getJoinedAt()
        );
    }
}
