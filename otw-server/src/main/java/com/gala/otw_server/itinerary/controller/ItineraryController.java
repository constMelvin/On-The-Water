package com.gala.otw_server.itinerary.controller;

import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.itinerary.dto.CreateItineraryItemRequest;
import com.gala.otw_server.itinerary.dto.ItineraryItemDto;
import com.gala.otw_server.itinerary.dto.ReorderItineraryRequest;
import com.gala.otw_server.itinerary.dto.UpdateItineraryItemRequest;
import com.gala.otw_server.itinerary.service.ItineraryService;
import com.gala.otw_server.security.auth.CurrentUserProvider;
import com.gala.otw_server.security.auth.RequireRoomRole;
import com.gala.otw_server.security.auth.RoomRole;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/rooms/{roomId}/itinerary")
public class ItineraryController {

    private final ItineraryService itineraryService;
    private final CurrentUserProvider currentUser;

    public ItineraryController(ItineraryService itineraryService, CurrentUserProvider currentUser) {
        this.itineraryService = itineraryService;
        this.currentUser = currentUser;
    }

    // ── GET /rooms/{roomId}/itinerary — list items ─────────────────────────────

    @GetMapping
    @RequireRoomRole(RoomRole.MEMBER)
    public PageResponse<ItineraryItemDto> getItems(
            @PathVariable UUID roomId,
            @RequestParam(required = false) UUID cursor,
            @RequestParam(defaultValue = "50") int limit) {
        return itineraryService.getItems(roomId, cursor, Math.min(limit, 50));
    }

    // ── POST /rooms/{roomId}/itinerary — add item ──────────────────────────────

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @RequireRoomRole(RoomRole.MEMBER)
    public ItineraryItemDto createItem(
            @PathVariable UUID roomId,
            @Valid @RequestBody CreateItineraryItemRequest req) {
        return itineraryService.createItem(roomId, currentUser.getUserId(), req);
    }

    // ── PATCH /rooms/{roomId}/itinerary/{itemId} — edit item ───────────────────

    @PatchMapping("/{itemId}")
    @RequireRoomRole(RoomRole.MEMBER)
    public ItineraryItemDto updateItem(
            @PathVariable UUID roomId,
            @PathVariable UUID itemId,
            @Valid @RequestBody UpdateItineraryItemRequest req) {
        return itineraryService.updateItem(roomId, itemId, currentUser.getUserId(), req);
    }

    // ── POST /rooms/{roomId}/itinerary/reorder — move stops ────────────────────

    @PostMapping("/reorder")
    @RequireRoomRole(RoomRole.MEMBER)
    public List<ItineraryItemDto> reorder(
            @PathVariable UUID roomId,
            @Valid @RequestBody ReorderItineraryRequest req) {
        return itineraryService.reorder(roomId, currentUser.getUserId(), req);
    }

    // ── DELETE /rooms/{roomId}/itinerary/{itemId} — remove item ────────────────

    @DeleteMapping("/{itemId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @RequireRoomRole(RoomRole.MEMBER)
    public void deleteItem(
            @PathVariable UUID roomId,
            @PathVariable UUID itemId) {
        itineraryService.deleteItem(roomId, itemId, currentUser.getUserId());
    }
}
