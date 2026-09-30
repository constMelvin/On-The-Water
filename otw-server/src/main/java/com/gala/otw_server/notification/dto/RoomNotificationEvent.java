package com.gala.otw_server.notification.dto;

import com.gala.otw_server.notification.entity.NotificationType;

import java.util.UUID;

/**
 * Published by feature services (Spring {@code ApplicationEventPublisher}) when
 * something happens that account members may want a notification for. Delivery is
 * after commit and best-effort — see {@code NotificationEventListener}.
 *
 * @param actorUserId  excluded from the recipients (nobody is notified of their own action); may be null
 * @param targetUserId when set, only this member is notified (e.g. a nudge); otherwise every account member
 */
public record RoomNotificationEvent(
        UUID roomId,
        NotificationType type,
        UUID actorUserId,
        UUID targetUserId,
        String title,
        String body
) {
    public static RoomNotificationEvent toRoom(UUID roomId, NotificationType type, UUID actorUserId,
                                               String title, String body) {
        return new RoomNotificationEvent(roomId, type, actorUserId, null, title, body);
    }

    public static RoomNotificationEvent toMember(UUID roomId, NotificationType type, UUID actorUserId,
                                                 UUID targetUserId, String title, String body) {
        return new RoomNotificationEvent(roomId, type, actorUserId, targetUserId, title, body);
    }
}
