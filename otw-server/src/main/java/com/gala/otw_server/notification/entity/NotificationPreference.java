package com.gala.otw_server.notification.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/** One row per account user; absent row = artifact defaults (see {@link NotificationType}). */
@Entity
@Table(name = "notification_preferences")
@Getter
@Setter
@NoArgsConstructor
public class NotificationPreference {

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "gala_soon", nullable = false)
    private boolean galaSoon = NotificationType.GALA_SOON.defaultOn();

    @Column(name = "someone_joined", nullable = false)
    private boolean someoneJoined = NotificationType.SOMEONE_JOINED.defaultOn();

    @Column(name = "attendance_changed", nullable = false)
    private boolean attendanceChanged = NotificationType.ATTENDANCE_CHANGED.defaultOn();

    @Column(name = "checklist_reminder", nullable = false)
    private boolean checklistReminder = NotificationType.CHECKLIST_REMINDER.defaultOn();

    @Column(name = "budget_updated", nullable = false)
    private boolean budgetUpdated = NotificationType.BUDGET_UPDATED.defaultOn();

    @Column(name = "day_before", nullable = false)
    private boolean dayBefore = NotificationType.DAY_BEFORE.defaultOn();

    @Column(name = "gala_day", nullable = false)
    private boolean galaDay = NotificationType.GALA_DAY.defaultOn();

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public NotificationPreference(UUID userId) {
        this.userId = userId;
    }

    @PrePersist
    @PreUpdate
    void touch() {
        updatedAt = OffsetDateTime.now();
    }
}
