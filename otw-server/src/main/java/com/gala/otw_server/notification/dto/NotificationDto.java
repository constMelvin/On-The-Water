package com.gala.otw_server.notification.dto;

import com.gala.otw_server.notification.entity.Notification;
import com.gala.otw_server.notification.entity.NotificationType;

import java.time.OffsetDateTime;
import java.util.UUID;

public record NotificationDto(
        UUID id,
        UUID roomId,
        NotificationType type,
        String title,
        String body,
        OffsetDateTime createdAt,
        OffsetDateTime readAt
) {
    public static NotificationDto from(Notification n) {
        return new NotificationDto(
                n.getId(),
                n.getRoomId(),
                n.getType(),
                n.getTitle(),
                n.getBody(),
                n.getCreatedAt(),
                n.getReadAt());
    }
}
