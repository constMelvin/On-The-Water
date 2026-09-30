package com.gala.otw_server.notification.service;

import com.gala.otw_server.notification.entity.NotificationType;
import com.gala.otw_server.room.service.GalaClock;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.lang.reflect.Constructor;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class ReminderSchedulerTest {

    private final JdbcTemplate jdbc = mock(JdbcTemplate.class);
    private final NotificationService notifications = mock(NotificationService.class);
    private final ReminderScheduler scheduler =
            new ReminderScheduler(jdbc, notifications, new GalaClock("Asia/Manila"));

    private final LocalDate today = LocalDate.of(2026, 11, 11);
    private final UUID soonRoom = UUID.randomUUID();
    private final UUID tomorrowRoom = UUID.randomUUID();
    private final UUID todayRoom = UUID.randomUUID();

    @SuppressWarnings("unchecked")
    private void stubRooms() throws Exception {
        Class<?> rowType = Class.forName(ReminderScheduler.class.getName() + "$UpcomingRoom");
        Constructor<?> ctor = rowType.getDeclaredConstructor(UUID.class, String.class, LocalDate.class);
        ctor.setAccessible(true);
        List<Object> rows = List.of(
                ctor.newInstance(soonRoom, "Baguio", today.plusDays(3)),
                ctor.newInstance(tomorrowRoom, "Tagaytay", today.plusDays(1)),
                ctor.newInstance(todayRoom, "Food Crawl", today));
        when(jdbc.query(anyString(), any(RowMapper.class), eq(today), eq(today.plusDays(1)), eq(today.plusDays(3))))
                .thenReturn((List) rows);
    }

    @Test
    @DisplayName("each upcoming gala gets its reminder with a stable dedupe key; the day before also checks the checklist")
    void runFor() throws Exception {
        stubRooms();

        scheduler.runFor(today);

        verify(notifications).fanOut(eq(soonRoom), eq(NotificationType.GALA_SOON), isNull(), isNull(),
                anyString(), anyString(), eq("GALA_SOON:" + soonRoom + ":" + today.plusDays(3)), eq(false));
        verify(notifications).fanOut(eq(tomorrowRoom), eq(NotificationType.DAY_BEFORE), isNull(), isNull(),
                anyString(), anyString(), eq("DAY_BEFORE:" + tomorrowRoom + ":" + today.plusDays(1)), eq(false));
        verify(notifications).fanOut(eq(tomorrowRoom), eq(NotificationType.CHECKLIST_REMINDER), isNull(), isNull(),
                anyString(), anyString(), eq("CHECKLIST_REMINDER:" + tomorrowRoom + ":" + today.plusDays(1)), eq(true));
        verify(notifications).fanOut(eq(todayRoom), eq(NotificationType.GALA_DAY), isNull(), isNull(),
                anyString(), anyString(), eq("GALA_DAY:" + todayRoom + ":" + today), eq(false));
        verifyNoMoreInteractions(notifications);
    }
}
