package com.gala.otw_server.profile.controller;

import com.gala.otw_server.photo.dto.UploadSessionDto;
import com.gala.otw_server.profile.dto.ProfileDto;
import com.gala.otw_server.profile.dto.StartProfilePhotoUploadRequest;
import com.gala.otw_server.profile.service.ProfileService;
import com.gala.otw_server.security.auth.CurrentUserProvider;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Account-level, like notification preferences: not room-scoped, so no {@code @RequireRoomRole};
 * every read and write is keyed by the caller's own user id from the JWT.
 */
@RestController
@RequestMapping("/api/v1/me/profile")
public class ProfileController {

    private final ProfileService profileService;
    private final CurrentUserProvider currentUser;
    private final Set<String> allowedOrigins;

    public ProfileController(ProfileService profileService,
                             CurrentUserProvider currentUser,
                             @Value("${app.cors.allowed-origins:http://localhost:5173,http://localhost:3000}") String origins) {
        this.profileService = profileService;
        this.currentUser = currentUser;
        this.allowedOrigins = Arrays.stream(origins.split(",")).map(String::trim).filter(o -> !o.isEmpty())
                .collect(Collectors.toSet());
    }

    @GetMapping
    public ProfileDto get() {
        return profileService.get(currentUser.getUserId());
    }

    @PutMapping
    public ProfileDto update(@Valid @RequestBody ProfileDto req) {
        return profileService.update(currentUser.getUserId(), req);
    }

    /** One-time Drive upload URL for the caller's profile photo (the shared "Profile Photos" folder). */
    @PostMapping("/photo/uploads")
    @ResponseStatus(HttpStatus.CREATED)
    public UploadSessionDto startPhotoUpload(
            @RequestHeader(value = "Origin", required = false) String origin,
            @Valid @RequestBody StartProfilePhotoUploadRequest req) {
        // Only an allowed frontend origin is passed to Google (it decides who may PUT the bytes).
        String safeOrigin = origin != null && allowedOrigins.contains(origin) ? origin : null;
        return profileService.startPhotoUpload(currentUser.getUserId(), req, safeOrigin);
    }
}
