package com.gala.otw_server.profile.controller;

import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.profile.dto.RoomMemberProfileDto;
import com.gala.otw_server.profile.service.ProfileService;
import com.gala.otw_server.security.auth.RequireRoomRole;
import com.gala.otw_server.security.auth.RoomRole;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Room-scoped read of the members' account profiles (photo, colour, status): members of the gala only. */
@RestController
public class RoomProfilesController {

    /** Photos are up to ~60 KB each, so pages stay small. */
    static final int MAX_LIMIT = 25;

    private final ProfileService profileService;

    public RoomProfilesController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @GetMapping("/api/v1/rooms/{roomId}/members/profiles")
    @RequireRoomRole(RoomRole.MEMBER)
    public PageResponse<RoomMemberProfileDto> memberProfiles(
            @PathVariable UUID roomId,
            @RequestParam(required = false) UUID cursor,
            @RequestParam(defaultValue = "25") int limit) {
        return profileService.listForRoom(roomId, cursor, Math.max(1, Math.min(limit, MAX_LIMIT)));
    }
}
