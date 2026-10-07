package com.gala.otw_server.profile.controller;

import com.gala.otw_server.profile.dto.ProfileDto;
import com.gala.otw_server.profile.service.ProfileService;
import com.gala.otw_server.security.auth.CurrentUserProvider;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

/**
 * Account-level, like notification preferences: not room-scoped, so no {@code @RequireRoomRole};
 * every read and write is keyed by the caller's own user id from the JWT.
 */
@RestController
@RequestMapping("/api/v1/me/profile")
public class ProfileController {

    private final ProfileService profileService;
    private final CurrentUserProvider currentUser;

    public ProfileController(ProfileService profileService, CurrentUserProvider currentUser) {
        this.profileService = profileService;
        this.currentUser = currentUser;
    }

    @GetMapping
    public ProfileDto get() {
        return profileService.get(currentUser.getUserId());
    }

    @PutMapping
    public ProfileDto update(@Valid @RequestBody ProfileDto req) {
        return profileService.update(currentUser.getUserId(), req);
    }
}
