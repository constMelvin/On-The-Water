package com.gala.otw_server.notification.controller;

import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.notification.dto.NotificationDto;
import com.gala.otw_server.notification.dto.NotificationPreferencesDto;
import com.gala.otw_server.notification.dto.UnreadCountDto;
import com.gala.otw_server.notification.service.NotificationService;
import com.gala.otw_server.security.auth.CurrentUserProvider;
import com.gala.otw_server.security.auth.RequireAccount;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Account-only: reminders reach you "even when you're not inside a gala", so they
 * belong to the account, not to a room. Not room-scoped, so no {@code @RequireRoomRole};
 * every query is keyed by the caller's own user id.
 */
@RestController
@RequestMapping("/api/v1/me")
@RequireAccount
public class NotificationController {

    private final NotificationService notificationService;
    private final CurrentUserProvider currentUser;

    public NotificationController(NotificationService notificationService, CurrentUserProvider currentUser) {
        this.notificationService = notificationService;
        this.currentUser = currentUser;
    }

    @GetMapping("/notification-preferences")
    public NotificationPreferencesDto getPreferences() {
        return notificationService.getPreferences(currentUser.getUserId());
    }

    @PutMapping("/notification-preferences")
    public NotificationPreferencesDto updatePreferences(@Valid @RequestBody NotificationPreferencesDto req) {
        return notificationService.updatePreferences(currentUser.getUserId(), req);
    }

    @GetMapping("/notifications")
    public PageResponse<NotificationDto> getNotifications(
            @RequestParam(required = false) UUID cursor,
            @RequestParam(defaultValue = "20") int limit) {
        return notificationService.getNotifications(currentUser.getUserId(), cursor, Math.max(1, Math.min(limit, 50)));
    }

    @GetMapping("/notifications/unread-count")
    public UnreadCountDto getUnreadCount() {
        return new UnreadCountDto(notificationService.countUnread(currentUser.getUserId()));
    }

    @PatchMapping("/notifications/{notificationId}/read")
    public NotificationDto markRead(@PathVariable UUID notificationId) {
        return notificationService.markRead(currentUser.getUserId(), notificationId);
    }

    @PostMapping("/notifications/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markAllRead() {
        notificationService.markAllRead(currentUser.getUserId());
    }
}
