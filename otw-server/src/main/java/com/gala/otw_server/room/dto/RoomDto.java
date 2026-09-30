package com.gala.otw_server.room.dto;

import com.gala.otw_server.room.entity.GalaPhase;
import com.gala.otw_server.room.entity.Room;
import com.gala.otw_server.room.entity.RoomType;
import com.gala.otw_server.security.auth.RoomRole;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Outbound representation of a Room. {@code myRole} and {@code memberCount} are
 * filled on {@code GET /rooms/{roomId}}; they are null on create/update responses.
 * The Gala Password (hash) is never included.
 */
public record RoomDto(
        UUID id,
        String roomCode,
        String title,
        String destination,
        LocalDate startDate,
        LocalDate endDate,
        LocalTime startTime,
        LocalTime endTime,
        OffsetDateTime scheduleAt,
        Double meetingLat,
        Double meetingLng,
        String meetingLabel,
        UUID hostUserId,
        String status,
        RoomType type,
        GalaPhase phase,
        boolean hasPassword,
        RoomPermissionsDto permissions,
        RoomRole myRole,
        Integer memberCount,
        OffsetDateTime createdAt
) {
    public static RoomDto from(Room r, GalaPhase phase) {
        return from(r, phase, null, null);
    }

    public static RoomDto from(Room r, GalaPhase phase, RoomRole myRole, Integer memberCount) {
        return new RoomDto(
                r.getId(),
                r.getRoomCode(),
                r.getTitle(),
                r.getDestination(),
                r.getStartDate(),
                r.getEndDate(),
                r.getStartTime(),
                r.getEndTime(),
                r.getScheduleAt(),
                r.getMeetingLat(),
                r.getMeetingLng(),
                r.getMeetingLabel(),
                r.getHostUserId(),
                r.getStatus(),
                r.getRoomType(),
                phase,
                r.getPasswordHash() != null,
                RoomPermissionsDto.from(r),
                myRole,
                memberCount,
                r.getCreatedAt()
        );
    }
}
