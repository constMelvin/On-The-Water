package com.gala.otw_server.profile.dto;

import com.gala.otw_server.profile.entity.UserProfile;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Used for both GET and PUT ({@code PUT} replaces the whole profile). {@code color} and {@code photo}
 * are nullable ("never picked" / "no photo"); the photo format and size are checked in
 * {@code ProfileService} (a regex over a ~60 KB string doesn't belong in bean validation).
 */
public record ProfileDto(
        @NotNull @Size(max = 20) String nickname,
        @NotNull @Size(max = 40) String status,
        @Pattern(regexp = "rosy|teal|zest|blossom") String color,
        String photo
) {
    public static ProfileDto empty() {
        return new ProfileDto("", "", null, null);
    }

    public static ProfileDto from(UserProfile p) {
        return new ProfileDto(p.getNickname(), p.getStatus(), p.getColor(), p.getPhoto());
    }
}
