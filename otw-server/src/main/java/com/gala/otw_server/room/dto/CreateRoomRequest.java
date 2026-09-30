package com.gala.otw_server.room.dto;

import com.gala.otw_server.room.entity.RoomType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Request body for {@code POST /rooms} — the four "Plan a Gala" steps plus the
 * creator's nickname. Every room is standalone; the creator becomes Gala Leader (HOST).
 */
public record CreateRoomRequest(

        @NotBlank(message = "Title is required")
        @Size(max = 120, message = "Title must be at most 120 characters")
        String title,

        @NotBlank(message = "Nickname is required")
        @Size(max = 60, message = "Nickname must be at most 60 characters")
        String nickname,

        @NotNull(message = "Date is required")
        LocalDate startDate,

        /** Optional; defaults to a single-day gala. */
        LocalDate endDate,

        LocalTime startTime,
        LocalTime endTime,

        @NotBlank(message = "Destination is required")
        @Size(max = 150, message = "Destination must be at most 150 characters")
        String destination,

        @NotBlank(message = "Gala password is required")
        @Size(min = 6, max = 72, message = "Gala password must be 6 to 72 characters")
        String password,

        /** Optional; defaults to GROUP. COUPLE starts Couple Mode. */
        RoomType type,

        Double meetingLat,
        Double meetingLng,

        @Size(max = 255, message = "Meeting label must be at most 255 characters")
        String meetingLabel
) {}
