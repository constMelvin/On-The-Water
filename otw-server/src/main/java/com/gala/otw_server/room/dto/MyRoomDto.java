package com.gala.otw_server.room.dto;

import com.gala.otw_server.room.entity.GalaPhase;
import com.gala.otw_server.room.entity.RoomType;
import com.gala.otw_server.security.auth.RoomRole;

import java.time.LocalDate;
import java.util.UUID;

/** A gala card on "My Galas" / "Gala History". */
public record MyRoomDto(
        UUID roomId,
        String title,
        String destination,
        LocalDate startDate,
        LocalDate endDate,
        RoomType type,
        String status,
        GalaPhase phase,
        RoomRole myRole,
        int memberCount
) {}
