package com.gala.otw_server.notification.service;

import com.gala.otw_server.common.DomainExceptions.NotificationNotFoundException;
import com.gala.otw_server.common.PageResponse;
import com.gala.otw_server.notification.dto.NotificationDto;
import com.gala.otw_server.notification.dto.NotificationPreferencesDto;
import com.gala.otw_server.notification.entity.Notification;
import com.gala.otw_server.notification.entity.NotificationPreference;
import com.gala.otw_server.notification.entity.NotificationType;
import com.gala.otw_server.notification.repository.NotificationPreferenceRepository;
import com.gala.otw_server.notification.repository.NotificationRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class NotificationService {

    private final NotificationPreferenceRepository prefRepo;
    private final NotificationRepository notificationRepo;
    private final JdbcTemplate jdbc;

    public NotificationService(NotificationPreferenceRepository prefRepo,
                               NotificationRepository notificationRepo,
                               JdbcTemplate jdbc) {
        this.prefRepo = prefRepo;
        this.notificationRepo = notificationRepo;
        this.jdbc = jdbc;
    }

    // ── Preferences ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public NotificationPreferencesDto getPreferences(UUID userId) {
        return NotificationPreferencesDto.from(
                prefRepo.findById(userId).orElseGet(() -> new NotificationPreference(userId)));
    }

    public NotificationPreferencesDto updatePreferences(UUID userId, NotificationPreferencesDto req) {
        NotificationPreference p = prefRepo.findById(userId).orElseGet(() -> new NotificationPreference(userId));
        p.setGalaSoon(req.galaSoon());
        p.setSomeoneJoined(req.someoneJoined());
        p.setAttendanceChanged(req.attendanceChanged());
        p.setChecklistReminder(req.checklistReminder());
        p.setBudgetUpdated(req.budgetUpdated());
        p.setDayBefore(req.dayBefore());
        p.setGalaDay(req.galaDay());
        return NotificationPreferencesDto.from(prefRepo.save(p));
    }

    // ── Feed ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PageResponse<NotificationDto> getNotifications(UUID userId, UUID cursor, int limit) {
        OffsetDateTime cursorAt = com.gala.otw_server.common.CursorBounds.NEWEST;
        UUID cursorId = null;
        if (cursor != null) {
            Notification c = notificationRepo.findByIdAndUserId(cursor, userId).orElse(null);
            if (c != null) {
                cursorAt = c.getCreatedAt();
                cursorId = c.getId();
            }
        }
        List<Notification> rows = notificationRepo.findPage(userId, cursorAt, cursorId, PageRequest.of(0, limit + 1));
        boolean hasMore = rows.size() > limit;
        List<NotificationDto> page = rows.stream().limit(limit).map(NotificationDto::from).toList();
        String next = (hasMore && !page.isEmpty()) ? page.get(page.size() - 1).id().toString() : null;
        return PageResponse.of(page, next, limit);
    }

    @Transactional(readOnly = true)
    public long countUnread(UUID userId) {
        return notificationRepo.countByUserIdAndReadAtIsNull(userId);
    }

    public NotificationDto markRead(UUID userId, UUID notificationId) {
        Notification n = notificationRepo.findByIdAndUserId(notificationId, userId)
                .orElseThrow(NotificationNotFoundException::new);
        if (n.getReadAt() == null) {
            n.setReadAt(OffsetDateTime.now());
        }
        return NotificationDto.from(notificationRepo.save(n));
    }

    public int markAllRead(UUID userId) {
        return notificationRepo.markAllRead(userId, OffsetDateTime.now());
    }

    // ── Fan-out (called after commit by the listener, and by the scheduler) ───

    /**
     * Inserts one notification per matching member in a single statement:
     * active members of the room who have an account and haven't turned this type off.
     *
     * @param actorUserId         excluded when not null
     * @param targetUserId        restrict to this member when not null
     * @param dedupeKey           when not null, reruns with the same key insert nothing
     * @param onlyWithOpenChecklistItems restrict to members who still have undone assigned checklist items
     * @return rows inserted
     */
    public int fanOut(UUID roomId, NotificationType type, UUID actorUserId, UUID targetUserId,
                      String title, String body, String dedupeKey, boolean onlyWithOpenChecklistItems) {
        StringBuilder sql = new StringBuilder("""
                INSERT INTO notifications (user_id, room_id, type, title, body, dedupe_key)
                SELECT rm.user_id, rm.room_id,
                       CAST(? AS VARCHAR), CAST(? AS VARCHAR), CAST(? AS VARCHAR), CAST(? AS VARCHAR)
                FROM room_members rm
                LEFT JOIN notification_preferences p ON p.user_id = rm.user_id
                WHERE rm.room_id = ? AND rm.left_at IS NULL AND rm.has_account = true
                """);
        List<Object> args = new ArrayList<>(List.of(type.name(), truncate(title, 120), truncate(body, 300)));
        args.add(dedupeKey);
        args.add(roomId);

        if (type.prefColumn() != null) {
            sql.append(" AND COALESCE(p.").append(type.prefColumn()).append(", ")
                    .append(type.defaultOn()).append(")");
        }
        if (actorUserId != null) {
            sql.append(" AND rm.user_id <> ?");
            args.add(actorUserId);
        }
        if (targetUserId != null) {
            sql.append(" AND rm.user_id = ?");
            args.add(targetUserId);
        }
        if (onlyWithOpenChecklistItems) {
            sql.append("""
                     AND EXISTS (SELECT 1 FROM checklist_items c
                                 WHERE c.room_id = rm.room_id AND c.assigned_to = rm.user_id AND c.is_done = false)
                    """);
        }
        sql.append(" ON CONFLICT (user_id, dedupe_key) DO NOTHING");

        return jdbc.update(sql.toString(), args.toArray());
    }

    private static String truncate(String s, int max) {
        return s.length() > max ? s.substring(0, max) : s;
    }
}
