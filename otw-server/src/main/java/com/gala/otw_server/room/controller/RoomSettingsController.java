package com.gala.otw_server.room.controller;

import com.gala.otw_server.room.dto.*;
import com.gala.otw_server.room.service.RoomSettingsService;
import com.gala.otw_server.security.auth.CurrentUserProvider;
import com.gala.otw_server.security.auth.RequireRoomRole;
import com.gala.otw_server.security.auth.RoomRole;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Gala settings. Leader-only controls are HOST-guarded; the member's own
 * controls ("Your name", status, leave) are MEMBER-guarded.
 */
@RestController
@RequestMapping("/api/v1/rooms/{roomId}")
public class RoomSettingsController {

    private final RoomSettingsService settingsService;
    private final CurrentUserProvider currentUser;

    public RoomSettingsController(RoomSettingsService settingsService, CurrentUserProvider currentUser) {
        this.settingsService = settingsService;
        this.currentUser = currentUser;
    }

    // ── Leader: details + permissions ─────────────────────────────────────────

    @PatchMapping
    @RequireRoomRole(RoomRole.HOST)
    public RoomDto updateRoom(@PathVariable UUID roomId, @Valid @RequestBody UpdateRoomRequest req) {
        return settingsService.updateRoom(roomId, req);
    }

    // ── Leader: access ────────────────────────────────────────────────────────

    @PutMapping("/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @RequireRoomRole(RoomRole.HOST)
    public void changePassword(@PathVariable UUID roomId, @Valid @RequestBody ChangePasswordRequest req) {
        settingsService.changePassword(roomId, req);
    }

    @PostMapping("/code")
    @RequireRoomRole(RoomRole.HOST)
    public RoomDto regenerateCode(@PathVariable UUID roomId) {
        return settingsService.regenerateCode(roomId);
    }

    // ── Leader: danger zone ───────────────────────────────────────────────────

    @PostMapping("/archive")
    @RequireRoomRole(RoomRole.HOST)
    public RoomDto archiveRoom(@PathVariable UUID roomId) {
        return settingsService.archiveRoom(roomId);
    }

    @PostMapping("/restore")
    @RequireRoomRole(value = RoomRole.HOST, allowArchived = true)
    public RoomDto restoreRoom(@PathVariable UUID roomId) {
        return settingsService.restoreRoom(roomId);
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @RequireRoomRole(value = RoomRole.HOST, allowArchived = true)
    public void deleteRoom(@PathVariable UUID roomId) {
        settingsService.deleteRoom(roomId);
    }

    // ── Leader: nudge a Maybe ─────────────────────────────────────────────────

    @PostMapping("/members/{userId}/nudge")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @RequireRoomRole(RoomRole.HOST)
    public void nudge(@PathVariable UUID roomId, @PathVariable UUID userId) {
        settingsService.nudge(roomId, currentUser.getUserId(), userId);
    }

    // ── Member: self ──────────────────────────────────────────────────────────

    @PatchMapping("/members/me")
    @RequireRoomRole(RoomRole.MEMBER)
    public RoomMemberDto updateMyMembership(@PathVariable UUID roomId,
                                            @Valid @RequestBody UpdateMyMembershipRequest req) {
        return settingsService.updateMyMembership(roomId, currentUser.getUserId(), req);
    }

    @PutMapping("/members/me/travel-status")
    @RequireRoomRole(RoomRole.MEMBER)
    public RoomMemberDto updateTravelStatus(@PathVariable UUID roomId,
                                            @Valid @RequestBody UpdateTravelStatusRequest req) {
        return settingsService.updateTravelStatus(roomId, currentUser.getUserId(), req);
    }

    @PostMapping("/members/me/leave")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @RequireRoomRole(value = RoomRole.MEMBER, allowArchived = true)
    public void leaveRoom(@PathVariable UUID roomId) {
        settingsService.leaveRoom(roomId, currentUser.getUserId());
    }
}
