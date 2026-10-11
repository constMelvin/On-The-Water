package com.gala.otw_server.couple.controller;

import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.couple.dto.BucketProgressDto;
import com.gala.otw_server.couple.dto.CoupleBucketItemDto;
import com.gala.otw_server.couple.dto.CreateBucketItemRequest;
import com.gala.otw_server.couple.dto.UpdateBucketItemRequest;
import com.gala.otw_server.couple.service.CoupleBucketService;
import com.gala.otw_server.security.auth.CurrentUserProvider;
import com.gala.otw_server.security.auth.RequireRoomRole;
import com.gala.otw_server.security.auth.RoomRole;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/** Our Little Bucket List: one list per couple gala. */
@RestController
@RequestMapping("/api/v1/rooms/{roomId}/couple/bucket")
public class CoupleBucketController {

    private final CoupleBucketService bucketService;
    private final CurrentUserProvider currentUser;

    public CoupleBucketController(CoupleBucketService bucketService, CurrentUserProvider currentUser) {
        this.bucketService = bucketService;
        this.currentUser = currentUser;
    }

    @GetMapping
    @RequireRoomRole(RoomRole.MEMBER)
    public PageResponse<CoupleBucketItemDto> getItems(
            @PathVariable UUID roomId,
            @RequestParam(required = false) UUID cursor,
            @RequestParam(defaultValue = "50") int limit) {
        return bucketService.getItems(roomId, cursor, Math.max(1, Math.min(limit, 50)));
    }

    @GetMapping("/progress")
    @RequireRoomRole(RoomRole.MEMBER)
    public BucketProgressDto getProgress(@PathVariable UUID roomId) {
        return bucketService.getProgress(roomId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @RequireRoomRole(RoomRole.MEMBER)
    public CoupleBucketItemDto createItem(
            @PathVariable UUID roomId,
            @Valid @RequestBody CreateBucketItemRequest req) {
        return bucketService.createItem(roomId, currentUser.getUserId(), req);
    }

    @PatchMapping("/{itemId}")
    @RequireRoomRole(RoomRole.MEMBER)
    public CoupleBucketItemDto updateItem(
            @PathVariable UUID roomId,
            @PathVariable UUID itemId,
            @Valid @RequestBody UpdateBucketItemRequest req) {
        return bucketService.updateItem(roomId, itemId, currentUser.getUserId(), req);
    }

    @DeleteMapping("/{itemId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @RequireRoomRole(RoomRole.MEMBER)
    public void deleteItem(@PathVariable UUID roomId, @PathVariable UUID itemId) {
        bucketService.deleteItem(roomId, itemId, currentUser.getUserId());
    }
}
