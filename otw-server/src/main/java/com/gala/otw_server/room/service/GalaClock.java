package com.gala.otw_server.room.service;

import com.gala.otw_server.room.entity.GalaPhase;
import com.gala.otw_server.room.entity.Room;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.*;

/**
 * Single source of "today" for gala dates. Gala dates are local calendar dates
 * (Asia/Manila by default, {@code otw.timezone}), so phase, My Galas buckets,
 * reminders and the location-sharing cutoff all resolve through here.
 */
@Component
public class GalaClock {

    private final Clock clock;

    @Autowired
    public GalaClock(@Value("${otw.timezone:Asia/Manila}") String zone) {
        this(Clock.system(ZoneId.of(zone)));
    }

    public GalaClock(Clock clock) {
        this.clock = clock;
    }

    public ZoneId zone() {
        return clock.getZone();
    }

    public LocalDate today() {
        return LocalDate.now(clock);
    }

    public OffsetDateTime now() {
        return OffsetDateTime.now(clock);
    }

    public GalaPhase phaseOf(Room room) {
        return phaseOf(room.getStartDate(), room.getEndDate());
    }

    public GalaPhase phaseOf(LocalDate startDate, LocalDate endDate) {
        if (startDate == null) return GalaPhase.PLANNING;
        LocalDate lastDay = endDate != null ? endDate : startDate;
        LocalDate today = today();
        if (today.isBefore(startDate)) return GalaPhase.PLANNING;
        if (!today.isAfter(lastDay)) return GalaPhase.GALA_DAY;
        return GalaPhase.DONE;
    }

    /** Start instant (start date + start time, or midnight). Null when the gala has no date. */
    public OffsetDateTime startOf(Room room) {
        if (room.getStartDate() == null) return null;
        LocalTime time = room.getStartTime() != null ? room.getStartTime() : LocalTime.MIDNIGHT;
        return ZonedDateTime.of(room.getStartDate(), time, zone()).toOffsetDateTime();
    }

    /** End instant (last day + end time, or end of that day). Null when the gala has no date. */
    public OffsetDateTime endOf(Room room) {
        if (room.getStartDate() == null) return null;
        LocalTime time = room.getEndTime() != null ? room.getEndTime() : LocalTime.of(23, 59, 59);
        return ZonedDateTime.of(room.lastDay(), time, zone()).toOffsetDateTime();
    }
}
