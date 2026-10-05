package com.gala.otw_server.room.dto;

import com.gala.otw_server.room.entity.RoomType;

import java.time.LocalDate;

/**
 * One gala on the Join a Gala page (every active gala is listed, owner decision 2026-10-05).
 * The code is shown because joining still needs the Gala Password. Member names come from
 * GET /rooms/preview when someone opens the details.
 */
public record DirectoryRoomDto(
        String roomCode,
        String title,
        String destination,
        LocalDate startDate,
        LocalDate endDate,
        RoomType type,
        String hostNickname,
        int memberCount,
        boolean full,
        boolean alreadyMember
) {}
