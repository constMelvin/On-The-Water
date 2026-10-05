package com.gala.otw_server.photo.controller;

import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.photo.dto.PhotoDto;
import com.gala.otw_server.photo.dto.StartUploadRequest;
import com.gala.otw_server.photo.dto.UploadSessionDto;
import com.gala.otw_server.photo.dto.RegisterPhotoRequest;
import com.gala.otw_server.photo.service.PhotoService;
import com.gala.otw_server.security.auth.CurrentUserProvider;
import com.gala.otw_server.security.auth.RequireRoomRole;
import com.gala.otw_server.security.auth.RoomRole;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/rooms/{roomId}/photos")
public class PhotoController {

    private final PhotoService photoService;
    private final CurrentUserProvider currentUser;
    private final Set<String> allowedOrigins;

    public PhotoController(PhotoService photoService,
                           CurrentUserProvider currentUser,
                           @Value("${app.cors.allowed-origins:http://localhost:5173,http://localhost:3000}") String origins) {
        this.photoService = photoService;
        this.currentUser = currentUser;
        this.allowedOrigins = Arrays.stream(origins.split(",")).map(String::trim).filter(o -> !o.isEmpty())
                .collect(Collectors.toSet());
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

    // ── POST /rooms/{roomId}/photos/uploads — one-time Drive upload URL ───────

    @PostMapping("/uploads")
    @ResponseStatus(HttpStatus.CREATED)
    @RequireRoomRole(RoomRole.MEMBER)
    public UploadSessionDto startUpload(
            @PathVariable UUID roomId,
            @RequestHeader(value = "Origin", required = false) String origin,
            @Valid @RequestBody StartUploadRequest req) {
        // Only an allowed frontend origin is passed to Google (it decides who may PUT the bytes).
        String safeOrigin = origin != null && allowedOrigins.contains(origin) ? origin : null;
        return photoService.startUpload(roomId, currentUser.getUserId(), req, safeOrigin);
    }

    // ── GET /rooms/{roomId}/photos — list photos, paginated ───────────────────

    @GetMapping
    @RequireRoomRole(RoomRole.MEMBER)
    public PageResponse<PhotoDto> getPhotos(
            @PathVariable UUID roomId,
            @RequestParam(defaultValue = "false") boolean mine,
            @RequestParam(required = false) UUID cursor,
            @RequestParam(defaultValue = "50") int limit) {
        UUID uploadedBy = mine ? currentUser.getUserId() : null;
        return photoService.getPhotos(roomId, uploadedBy, cursor, Math.min(limit, 50));
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
