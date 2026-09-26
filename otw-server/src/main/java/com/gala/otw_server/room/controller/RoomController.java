package com.gala.otw_server.room.controller;

import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.room.dto.*;
import com.gala.otw_server.room.service.RoomService;
import com.gala.otw_server.security.auth.CurrentUserProvider;
import com.gala.otw_server.security.auth.GroupRole;
import com.gala.otw_server.security.auth.RequireGroupRole;
import com.gala.otw_server.security.auth.RequireRoomRole;
import com.gala.otw_server.security.auth.RoomRole;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
public class RoomController {

    private final RoomService roomService;
    private final CurrentUserProvider currentUser;

    public RoomController(RoomService roomService, CurrentUserProvider currentUser) {
        this.roomService = roomService;
        this.currentUser = currentUser;
    }

    // ── POST /rooms — standalone room ─────────────────────────────────────────

    @PostMapping("/api/v1/rooms")
    @ResponseStatus(HttpStatus.CREATED)
    public RoomDto createRoom(@Valid @RequestBody CreateRoomRequest req) {
        return roomService.createRoom(currentUser.getUserId(), req);
    }

    // ── POST /rooms/join — join by code ───────────────────────────────────────

    @PostMapping("/api/v1/rooms/join")
    @ResponseStatus(HttpStatus.CREATED)
    public RoomMemberDto joinRoom(@Valid @RequestBody JoinRoomRequest req) {
        return roomService.joinRoom(currentUser.getUserId(), req);
    }

    // ── GET /rooms/{roomId} — room overview ───────────────────────────────────

    @GetMapping("/api/v1/rooms/{roomId}")
    @RequireRoomRole(RoomRole.MEMBER)
    public RoomDto getRoom(@PathVariable UUID roomId) {
        return roomService.getRoom(roomId);
    }

    // ── GET /rooms/{roomId}/members — member list ─────────────────────────────

    @GetMapping("/api/v1/rooms/{roomId}/members")
    @RequireRoomRole(RoomRole.MEMBER)
    public PageResponse<RoomMemberDto> getMembers(
            @PathVariable UUID roomId,
            @RequestParam(required = false) UUID cursor,
            @RequestParam(defaultValue = "20") int limit) {
        return roomService.getMembers(roomId, cursor, Math.min(limit, 50));
    }

    // ── DELETE /rooms/{roomId}/members/{userId} — remove member (host only) ──

    @DeleteMapping("/api/v1/rooms/{roomId}/members/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @RequireRoomRole(RoomRole.HOST)
    public void removeMember(
            @PathVariable UUID roomId,
            @PathVariable UUID userId) {
        roomService.removeMember(roomId, userId);
    }

    // ── PATCH /rooms/{roomId}/members/me/rsvp — update own RSVP ─────────────

    @PatchMapping("/api/v1/rooms/{roomId}/members/me/rsvp")
    @RequireRoomRole(RoomRole.MEMBER)
    public RoomMemberDto updateRsvp(
            @PathVariable UUID roomId,
            @Valid @RequestBody UpdateRsvpRequest req) {
        return roomService.updateRsvp(roomId, currentUser.getUserId(), req);
    }

    // ── POST /groups/{groupId}/rooms — gala inside a group ───────────────────

    @PostMapping("/api/v1/groups/{groupId}/rooms")
    @ResponseStatus(HttpStatus.CREATED)
    @RequireGroupRole(GroupRole.MEMBER)
    public RoomDto createGroupRoom(
            @PathVariable UUID groupId,
            @Valid @RequestBody CreateRoomRequest req) {
        return roomService.createGroupRoom(currentUser.getUserId(), groupId, req);
    }

    // ── GET /groups/{groupId}/rooms — list galas in group ────────────────────

    @GetMapping("/api/v1/groups/{groupId}/rooms")
    @RequireGroupRole(GroupRole.MEMBER)
    public PageResponse<RoomDto> listGroupRooms(
            @PathVariable UUID groupId,
            @RequestParam(required = false) UUID cursor,
            @RequestParam(defaultValue = "20") int limit) {
        return roomService.getRoomsInGroup(groupId, cursor, Math.min(limit, 50));
    }
}
