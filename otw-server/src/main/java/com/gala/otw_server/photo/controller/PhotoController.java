package com.gala.otw_server.photo.controller;

import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.photo.dto.PhotoDto;
import com.gala.otw_server.photo.dto.RegisterPhotoRequest;
import com.gala.otw_server.photo.service.PhotoService;
import com.gala.otw_server.security.auth.CurrentUserProvider;
import com.gala.otw_server.security.auth.RequireRoomRole;
import com.gala.otw_server.security.auth.RoomRole;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/rooms/{roomId}/photos")
public class PhotoController {

    private final PhotoService photoService;
    private final CurrentUserProvider currentUser;

    public PhotoController(PhotoService photoService, CurrentUserProvider currentUser) {
        this.photoService = photoService;
        this.currentUser = currentUser;
    }

    // ── POST /rooms/{roomId}/photos — register photo metadata ─────────────────

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @RequireRoomRole(RoomRole.MEMBER)
    public PhotoDto registerPhoto(
            @PathVariable UUID roomId,
            @Valid @RequestBody RegisterPhotoRequest req) {
        return photoService.registerPhoto(roomId, currentUser.getUserId(), req);
    }

    // ── GET /rooms/{roomId}/photos — list photos, paginated ───────────────────

    @GetMapping
    @RequireRoomRole(RoomRole.MEMBER)
    public PageResponse<PhotoDto> getPhotos(
            @PathVariable UUID roomId,
            @RequestParam(required = false) UUID cursor,
            @RequestParam(defaultValue = "50") int limit) {
        return photoService.getPhotos(roomId, cursor, Math.min(limit, 50));
    }

    // ── DELETE /rooms/{roomId}/photos/{photoId} — remove photo metadata ───────

    @DeleteMapping("/{photoId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @RequireRoomRole(RoomRole.MEMBER)
    public void deletePhoto(
            @PathVariable UUID roomId,
            @PathVariable UUID photoId) {
        photoService.deletePhoto(roomId, photoId, currentUser.getUserId());
    }
}
