package com.gala.otw_server.notification.service;

import com.gala.otw_server.notification.entity.NotificationType;
import com.gala.otw_server.room.service.GalaClock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Hourly job for the date-based reminders: "Gala coming up" (3 days before),
 * "Tomorrow's the day." + "Quick check" (1 day before), "Today's the day." (gala day).
 *
 * <p>Idempotent: every row carries a dedupe key per (type, room, gala date), and the
 * {@code UNIQUE(user_id, dedupe_key)} constraint turns reruns — or several app
 * instances running the job at once — into no-ops.
 */
@Component
public class ReminderScheduler {

    private static final Logger log = LoggerFactory.getLogger(ReminderScheduler.class);

    private final JdbcTemplate jdbc;
    private final NotificationService notificationService;
    private final GalaClock galaClock;

    public ReminderScheduler(JdbcTemplate jdbc, NotificationService notificationService, GalaClock galaClock) {
        this.jdbc = jdbc;
        this.notificationService = notificationService;
        this.galaClock = galaClock;
    }

    private record UpcomingRoom(UUID id, String title, LocalDate startDate) {}

    @Scheduled(cron = "0 5 * * * *", zone = "${otw.timezone:Asia/Manila}")
    public void sendDueReminders() {
        try {
            runFor(galaClock.today());
        } catch (Exception ex) {
            log.warn("Reminder run failed: {}", ex.getMessage());
        }
    }

    /** Package-visible for tests. */
    int runFor(LocalDate today) {
        LocalDate inThreeDays = today.plusDays(3);
        LocalDate tomorrow = today.plusDays(1);

        List<UpcomingRoom> rooms = jdbc.query("""
                        SELECT id, title, start_date FROM rooms
                        WHERE status = 'ACTIVE' AND start_date IN (?, ?, ?)
                        """,
                (rs, i) -> new UpcomingRoom(
                        rs.getObject("id", UUID.class),
                        rs.getString("title"),
                        rs.getObject("start_date", LocalDate.class)),
                today, tomorrow, inThreeDays);

        int sent = 0;
        for (UpcomingRoom room : rooms) {
            String date = room.startDate().toString();
            if (room.startDate().equals(inThreeDays)) {
                sent += send(room, NotificationType.GALA_SOON, "Gala coming up",
                        room.title() + " is 3 days away.", date, false);
            } else if (room.startDate().equals(tomorrow)) {
                sent += send(room, NotificationType.DAY_BEFORE, "Tomorrow's the day.",
                        "Charge your phone. Pack your things. Don't be that friend.", date, false);
                sent += send(room, NotificationType.CHECKLIST_REMINDER, "Quick check",
                        "May nakalimutan ka ba? You still have things to bring for " + room.title() + ".", date, true);
            } else {
                sent += send(room, NotificationType.GALA_DAY, "Today's the day.",
                        room.title() + " — time to go.", date, false);
            }
        }
        if (sent > 0) log.info("Sent {} reminder notifications", sent);
        return sent;
    }

    private int send(UpcomingRoom room, NotificationType type, String title, String body,
                     String date, boolean onlyWithOpenChecklistItems) {
        String dedupeKey = type.name() + ":" + room.id() + ":" + date;
        return notificationService.fanOut(room.id(), type, null, null, title, body, dedupeKey,
                onlyWithOpenChecklistItems);
    }
}
