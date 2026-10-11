package com.gala.otw_server.profile.service;

import com.gala.otw_server.common.DomainExceptions.InvalidRequestException;
import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.profile.dto.ProfileDto;
import com.gala.otw_server.profile.dto.RoomMemberProfileDto;
import com.gala.otw_server.profile.entity.UserProfile;
import com.gala.otw_server.profile.repository.UserProfileRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ProfileService {

    /** The browser keeps the data URL under 60,000 chars; a little headroom for the prefix. */
    static final int PHOTO_MAX_CHARS = 65_000;

    private static final String[] PHOTO_PREFIXES = {
            "data:image/webp;base64,", "data:image/jpeg;base64,", "data:image/png;base64,"
    };

    private final UserProfileRepository profiles;

    public ProfileService(UserProfileRepository profiles) {
        this.profiles = profiles;
    }

    @Transactional(readOnly = true)
    public ProfileDto get(UUID userId) {
        return profiles.findById(userId).map(ProfileDto::from).orElseGet(ProfileDto::empty);
    }

    /** Saved profiles of a gala's active members, one page at a time (caller is already checked as a member). */
    @Transactional(readOnly = true)
    public PageResponse<RoomMemberProfileDto> listForRoom(UUID roomId, UUID cursor, int limit) {
        List<UserProfile> found = profiles.findForActiveMembers(roomId, cursor, PageRequest.of(0, limit + 1));

        boolean hasMore = found.size() > limit;
        List<RoomMemberProfileDto> page = found.stream()
                .limit(limit)
                .map(RoomMemberProfileDto::from)
                .toList();

        String nextCursor = hasMore ? page.get(page.size() - 1).userId().toString() : null;
        return PageResponse.of(page, nextCursor, limit);
    }

    @Transactional
    public ProfileDto update(UUID userId, ProfileDto req) {
        String photo = req.photo() == null || req.photo().isBlank() ? null : req.photo();
        if (photo != null) validatePhoto(photo);

        UserProfile p = profiles.findById(userId).orElseGet(() -> new UserProfile(userId));
        p.setNickname(req.nickname().trim());
        p.setStatus(req.status().trim());
        p.setColor(req.color());
        p.setPhoto(photo);
        return ProfileDto.from(profiles.save(p));
    }

    private static void validatePhoto(String photo) {
        if (photo.length() > PHOTO_MAX_CHARS) {
            throw new InvalidRequestException("Profile photo is too large");
        }
        String prefix = null;
        for (String candidate : PHOTO_PREFIXES) {
            if (photo.startsWith(candidate)) {
                prefix = candidate;
                break;
            }
        }
        if (prefix == null) {
            throw new InvalidRequestException("Profile photo must be a webp, jpeg or png data URL");
        }
        // Base64 payload only: no markup or whitespace can ride along in a value other users may render.
        for (int i = prefix.length(); i < photo.length(); i++) {
            char c = photo.charAt(i);
            boolean ok = (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9')
                    || c == '+' || c == '/' || c == '=';
            if (!ok) throw new InvalidRequestException("Profile photo is not valid base64");
        }
    }
}
