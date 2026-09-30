package com.gala.otw_server.checklist.controller;

import com.gala.otw_server.checklist.dto.ChecklistItemDto;
import com.gala.otw_server.checklist.dto.ClaimChecklistItemRequest;
import com.gala.otw_server.checklist.dto.CreateChecklistItemRequest;
import com.gala.otw_server.checklist.dto.UpdateChecklistItemRequest;
import com.gala.otw_server.checklist.service.ChecklistService;
import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.security.auth.CurrentUserProvider;
import com.gala.otw_server.security.auth.RequireRoomRole;
import com.gala.otw_server.security.auth.RoomRole;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/rooms/{roomId}/checklist")
public class ChecklistController {

    private final ChecklistService checklistService;
    private final CurrentUserProvider currentUser;

    public ChecklistController(ChecklistService checklistService, CurrentUserProvider currentUser) {
        this.checklistService = checklistService;
        this.currentUser = currentUser;
    }

    // ── GET /rooms/{roomId}/checklist — list items (All / Mine / Done) ─────────

    @GetMapping
    @RequireRoomRole(RoomRole.MEMBER)
    public PageResponse<ChecklistItemDto> getItems(
            @PathVariable UUID roomId,
            @RequestParam(required = false) Boolean isDone,
            @RequestParam(defaultValue = "false") boolean mine,
            @RequestParam(required = false) UUID cursor,
            @RequestParam(defaultValue = "50") int limit) {
        UUID assignedTo = mine ? currentUser.getUserId() : null;
        return checklistService.getItems(roomId, isDone, assignedTo, cursor, Math.min(limit, 50));
    }

    // ── POST /rooms/{roomId}/checklist — add item ──────────────────────────────

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @RequireRoomRole(RoomRole.MEMBER)
    public ChecklistItemDto createItem(
            @PathVariable UUID roomId,
            @Valid @RequestBody CreateChecklistItemRequest req) {
        return checklistService.createItem(roomId, currentUser.getUserId(), req);
    }

    // ── PATCH /rooms/{roomId}/checklist/{itemId} — edit / toggle / assign ──────

    @PatchMapping("/{itemId}")
    @RequireRoomRole(RoomRole.MEMBER)
    public ChecklistItemDto updateItem(
            @PathVariable UUID roomId,
            @PathVariable UUID itemId,
            @Valid @RequestBody UpdateChecklistItemRequest req) {
        return checklistService.updateItem(roomId, itemId, currentUser.getUserId(), req);
    }

    // ── POST /rooms/{roomId}/checklist/{itemId}/claim — assign to me ───────────

    @PostMapping("/{itemId}/claim")
    @RequireRoomRole(RoomRole.MEMBER)
    public ChecklistItemDto claimItem(
            @PathVariable UUID roomId,
            @PathVariable UUID itemId,
            @Valid @RequestBody ClaimChecklistItemRequest req) {
        return checklistService.claimItem(roomId, itemId, currentUser.getUserId(), req.version());
    }

    // ── DELETE /rooms/{roomId}/checklist/{itemId} — remove item ────────────────

    @DeleteMapping("/{itemId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @RequireRoomRole(RoomRole.MEMBER)
    public void deleteItem(
            @PathVariable UUID roomId,
            @PathVariable UUID itemId) {
        checklistService.deleteItem(roomId, itemId, currentUser.getUserId());
    }
}
