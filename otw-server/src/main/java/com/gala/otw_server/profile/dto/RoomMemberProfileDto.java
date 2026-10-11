package com.gala.otw_server.profile.dto;

import com.gala.otw_server.profile.entity.UserProfile;

import java.util.UUID;

/**
 * What other members of a gala see of someone's account profile. Kept out of {@code RoomMemberDto}
 * on purpose: the photo is up to ~60 KB and that DTO is also pushed in realtime events.
 */
public record RoomMemberProfileDto(
        UUID userId,
        String nickname,
        String status,
        String color,
        String photo
) {
    public static RoomMemberProfileDto from(UserProfile p) {
        return new RoomMemberProfileDto(p.getUserId(), p.getNickname(), p.getStatus(), p.getColor(), p.getPhoto());
    }
}
