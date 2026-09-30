package com.gala.otw_server.notification.service;

import com.gala.otw_server.notification.dto.NotificationPreferencesDto;
import com.gala.otw_server.notification.entity.NotificationPreference;
import com.gala.otw_server.notification.entity.NotificationType;
import com.gala.otw_server.notification.repository.NotificationPreferenceRepository;
import com.gala.otw_server.notification.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock private NotificationPreferenceRepository prefRepo;
    @Mock private NotificationRepository notificationRepo;
    @Mock private JdbcTemplate jdbc;

    private NotificationService service;
    private final UUID userId = UUID.randomUUID();
    private final UUID roomId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new NotificationService(prefRepo, notificationRepo, jdbc);
    }

    @Test
    @DisplayName("preferences default to the artifact's toggles when never saved")
    void defaults() {
        when(prefRepo.findById(userId)).thenReturn(Optional.empty());

        NotificationPreferencesDto p = service.getPreferences(userId);

        assertThat(p.galaSoon()).isTrue();
        assertThat(p.someoneJoined()).isTrue();
        assertThat(p.attendanceChanged()).isFalse();
        assertThat(p.checklistReminder()).isTrue();
        assertThat(p.budgetUpdated()).isFalse();
        assertThat(p.dayBefore()).isTrue();
        assertThat(p.galaDay()).isTrue();
    }

    @Test
    @DisplayName("updatePreferences replaces all seven toggles")
    void update() {
        when(prefRepo.findById(userId)).thenReturn(Optional.empty());
        when(prefRepo.save(any(NotificationPreference.class))).thenAnswer(inv -> inv.getArgument(0));

        NotificationPreferencesDto saved = service.updatePreferences(userId,
                new NotificationPreferencesDto(false, false, true, false, true, false, false));

        assertThat(saved.galaSoon()).isFalse();
        assertThat(saved.attendanceChanged()).isTrue();
        assertThat(saved.budgetUpdated()).isTrue();
    }

    @Test
    @DisplayName("fanOut targets active account members, honours the type's preference with its default, excludes the actor")
    void fanOut_sql() {
        UUID actor = UUID.randomUUID();
        service.fanOut(roomId, NotificationType.ATTENDANCE_CHANGED, actor, null, "Attendance update",
                "Sam changed their status to I'm G.", null, false);

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Object[]> args = ArgumentCaptor.forClass(Object[].class);
        verify(jdbc).update(sql.capture(), args.capture());

        assertThat(sql.getValue())
                .contains("rm.left_at IS NULL AND rm.has_account = true")
                .contains("COALESCE(p.attendance_changed, false)")
                .contains("rm.user_id <> ?")
                .contains("ON CONFLICT (user_id, dedupe_key) DO NOTHING")
                .doesNotContain("checklist_items");
        assertThat(args.getValue()).contains("ATTENDANCE_CHANGED", roomId, actor);
    }

    @Test
    @DisplayName("NUDGE ignores preferences and goes to the target only")
    void fanOut_nudge() {
        UUID target = UUID.randomUUID();
        service.fanOut(roomId, NotificationType.NUDGE, null, target, "G ka na ba?", "…", null, false);

        ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
        verify(jdbc).update(sql.capture(), any(Object[].class));
        assertThat(sql.getValue()).doesNotContain("COALESCE").contains("rm.user_id = ?");
    }
}
