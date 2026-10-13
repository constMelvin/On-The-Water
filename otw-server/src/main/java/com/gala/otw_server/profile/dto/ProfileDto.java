package com.gala.otw_server.profile.dto;

import com.gala.otw_server.profile.entity.UserProfile;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Used for both GET and PUT ({@code PUT} replaces the whole profile). {@code color} and
 * {@code photoDriveFileId} are nullable ("never picked" / "no photo"). The photo is a file the
 * browser uploaded to the "Profile Photos" Drive folder (see {@code POST /me/profile/photo/uploads});
 * {@code ProfileService} checks it is the caller's own image there before saving the id.
 */
public record ProfileDto(
        @NotNull @Size(max = 20) String nickname,
        @NotNull @Size(max = 40) String status,
        @Pattern(regexp = "rosy|teal|zest|blossom") String color,
        @Pattern(regexp = "^[A-Za-z0-9_-]{1,200}$", message = "Not a valid Drive file id") String photoDriveFileId
) {
    public static ProfileDto empty() {
        return new ProfileDto("", "", null, null);
    }

    public static ProfileDto from(UserProfile p) {
        return new ProfileDto(p.getNickname(), p.getStatus(), p.getColor(), p.getPhotoDriveFileId());
    }
}
