package com.gala.otw_server.room.dto;

import com.gala.otw_server.room.entity.RoomType;

import java.time.LocalDate;
import java.util.List;

/**
 * "Is this the one?" — what a would-be member sees before joining. No IDs, no
 * code, no password; nicknames are capped so the preview stays small.
 */
public record RoomPreviewDto(
        String title,
        String destination,
        LocalDate startDate,
        LocalDate endDate,
        RoomType type,
        int memberCount,
        List<String> nicknames,
        boolean full
) {}
