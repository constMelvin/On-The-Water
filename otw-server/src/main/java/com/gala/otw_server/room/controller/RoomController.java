package com.gala.otw_server.room.controller;

import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.room.dto.*;
import com.gala.otw_server.room.service.RoomService;
import com.gala.otw_server.room.service.RoomSummaryService;
import com.gala.otw_server.security.auth.CurrentUserProvider;
import com.gala.otw_server.security.auth.RequireRoomRole;
import com.gala.otw_server.security.auth.RoomRole;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Getting into a gala and the shared overview. An account is required like on
 * every endpoint (enforced globally by AccountRequiredFilter).
 */
@RestController
public class RoomController {

    private final RoomService roomService;
    private final RoomSummaryService summaryService;
    private final CurrentUserProvider currentUser;

    public RoomController(RoomService roomService,
                          RoomSummaryService summaryService,
                          CurrentUserProvider currentUser) {
        this.roomService = roomService;
        this.summaryService = summaryService;
        this.currentUser = currentUser;
    }

    // ── POST /rooms — Plan a Gala ─────────────────────────────────────────────

    @PostMapping("/api/v1/rooms")
    @ResponseStatus(HttpStatus.CREATED)
    public RoomDto createRoom(@Valid @RequestBody CreateRoomRequest req) {
        return roomService.createRoom(currentUser.getUserId(), !currentUser.isAnonymous(), req);
    }

    // ── GET /rooms/preview?code= — "Is this the one?" (not room-scoped: no id yet) ──

    @GetMapping("/api/v1/rooms/preview")
    public RoomPreviewDto previewRoom(@RequestParam String code) {
        return roomService.previewRoom(code);
    }

    // ── POST /rooms/join — join by code ───────────────────────────────────────

    @PostMapping("/api/v1/rooms/join")
    @ResponseStatus(HttpStatus.CREATED)
    public RoomMemberDto joinRoom(@Valid @RequestBody JoinRoomRequest req) {
        return roomService.joinRoom(currentUser.getUserId(), !currentUser.isAnonymous(), req);
    }

    // ── POST /rooms/enter — Enter a Gala: code + password ─────────────────────

    @PostMapping("/api/v1/rooms/enter")
    public EnterRoomResponse enterRoom(@Valid @RequestBody EnterRoomRequest req) {
        return roomService.enterRoom(currentUser.getUserId(), req);
    }

    // ── POST /rooms/enter/claim — "Which one are you?" ────────────────────────

    @PostMapping("/api/v1/rooms/enter/claim")
    public RoomMemberDto claimMember(@Valid @RequestBody ClaimMemberRequest req) {
        return roomService.claimMember(currentUser.getUserId(), !currentUser.isAnonymous(), req);
    }

    // ── GET /rooms/{roomId} — room overview ───────────────────────────────────

    @GetMapping("/api/v1/rooms/{roomId}")
    @RequireRoomRole(RoomRole.MEMBER)
    public RoomDto getRoom(@PathVariable UUID roomId) {
        return roomService.getRoom(roomId, currentUser.getUserId());
    }

    // ── GET /rooms/{roomId}/summary — dashboard cards + recap ─────────────────

    @GetMapping("/api/v1/rooms/{roomId}/summary")
    @RequireRoomRole(RoomRole.MEMBER)
    public RoomSummaryDto getSummary(@PathVariable UUID roomId) {
        return summaryService.getSummary(roomId, currentUser.getUserId());
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
}
