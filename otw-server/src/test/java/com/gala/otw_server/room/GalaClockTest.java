package com.gala.otw_server.room;

import com.gala.otw_server.room.entity.GalaPhase;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.service.GalaClock;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.*;

import static org.assertj.core.api.Assertions.assertThat;

class GalaClockTest {

    // Sep 29, 2026 · 9:41 AM in Manila (the artifact's demo clock)
    private final GalaClock clock = new GalaClock(
            Clock.fixed(Instant.parse("2026-09-29T01:41:00Z"), ZoneId.of("Asia/Manila")));

    private Room room(LocalDate start, LocalDate end) {
        Room r = new Room();
        r.setStartDate(start);
        r.setEndDate(end);
        return r;
    }

    @Test
    @DisplayName("phase follows the gala dates in Manila time")
    void phase() {
        assertThat(clock.phaseOf(room(LocalDate.of(2026, 11, 14), LocalDate.of(2026, 11, 15))))
                .isEqualTo(GalaPhase.PLANNING);
        assertThat(clock.phaseOf(room(LocalDate.of(2026, 9, 29), null))).isEqualTo(GalaPhase.GALA_DAY);
        assertThat(clock.phaseOf(room(LocalDate.of(2026, 9, 28), LocalDate.of(2026, 9, 30))))
                .isEqualTo(GalaPhase.GALA_DAY);
        assertThat(clock.phaseOf(room(LocalDate.of(2026, 8, 2), null))).isEqualTo(GalaPhase.DONE);
        assertThat(clock.phaseOf(room(null, null))).isEqualTo(GalaPhase.PLANNING);
    }

    @Test
    @DisplayName("today is the Manila date even when UTC is still the previous day")
    void todayIsLocal() {
        GalaClock earlyMorning = new GalaClock(
                Clock.fixed(Instant.parse("2026-09-28T17:30:00Z"), ZoneId.of("Asia/Manila")));
        assertThat(earlyMorning.today()).isEqualTo(LocalDate.of(2026, 9, 29));
    }

    @Test
    @DisplayName("end of a gala without an end time is the last day at 23:59:59 local")
    void endOf() {
        Room r = room(LocalDate.of(2026, 11, 14), LocalDate.of(2026, 11, 15));
        assertThat(clock.endOf(r).toInstant()).isEqualTo(Instant.parse("2026-11-15T15:59:59Z"));
        r.setEndTime(LocalTime.of(21, 0));
        assertThat(clock.endOf(r).toInstant()).isEqualTo(Instant.parse("2026-11-15T13:00:00Z"));
    }
}
