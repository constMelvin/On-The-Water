package com.gala.otw_server.notification.service;

import com.gala.otw_server.notification.dto.RoomNotificationEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Turns {@link RoomNotificationEvent}s into feed rows after the originating
 * transaction commits (so a rolled-back change never notifies anyone), in its own
 * transaction. Notifications are best-effort: a failure is logged and never
 * affects the request that caused it.
 */
@Component
public class NotificationEventListener {

    private static final Logger log = LoggerFactory.getLogger(NotificationEventListener.class);

    private final NotificationService notificationService;

    public NotificationEventListener(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void on(RoomNotificationEvent event) {
        try {
            notificationService.fanOut(event.roomId(), event.type(), event.actorUserId(), event.targetUserId(),
                    event.title(), event.body(), null, false);
        } catch (Exception ex) {
            log.warn("Failed to write {} notifications for room {}: {}", event.type(), event.roomId(), ex.getMessage());
        }
    }
}
