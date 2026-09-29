package com.gala.otw_server.room.dto;

import com.gala.otw_server.room.entity.Room;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Outbound representation of a Room.
 */
public record RoomDto(
        UUID id,
        String roomCode,
        String title,
        OffsetDateTime scheduleAt,
        Double meetingLat,
        Double meetingLng,
        String meetingLabel,
        UUID hostUserId,
        String status,
        OffsetDateTime createdAt
) {
    public static RoomDto from(Room r) {
        return new RoomDto(
                r.getId(),
                r.getRoomCode(),
                r.getTitle(),
                r.getScheduleAt(),
                r.getMeetingLat(),
                r.getMeetingLng(),
                r.getMeetingLabel(),
                r.getHostUserId(),
                r.getStatus(),
                r.getCreatedAt()
        );
    }
}
