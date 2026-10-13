package com.gala.otw_server.profile.dto;

import com.gala.otw_server.profile.entity.UserProfile;

import java.util.UUID;

/**
 * What other members of a gala see of someone's account profile. Kept out of {@code RoomMemberDto}:
 * that DTO is also pushed in realtime events, and the profile is fetched once per gala.
 * {@code photoDriveFileId} is a link-viewable Drive file; the browser builds the thumbnail URL.
 */
public record RoomMemberProfileDto(
        UUID userId,
        String nickname,
        String status,
        String color,
        String photoDriveFileId
) {
    public static RoomMemberProfileDto from(UserProfile p) {
        return new RoomMemberProfileDto(p.getUserId(), p.getNickname(), p.getStatus(), p.getColor(),
                p.getPhotoDriveFileId());
    }
}
