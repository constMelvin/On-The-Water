package com.gala.otw_server.notification.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * One in-app notification for an account user. Rows are written by
 * {@code NotificationService} (event fan-out and the reminder scheduler) with plain
 * SQL; this entity is used for reading and marking read.
 */
@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column(name = "room_id", updatable = false)
    private UUID roomId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 30, updatable = false)
    private NotificationType type;

    @Column(name = "title", nullable = false, length = 120, updatable = false)
    private String title;

    @Column(name = "body", nullable = false, length = 300, updatable = false)
    private String body;

    @Column(name = "dedupe_key", length = 120, updatable = false)
    private String dedupeKey;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "read_at")
    private OffsetDateTime readAt;

    @PrePersist
    void onPrePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }
}
