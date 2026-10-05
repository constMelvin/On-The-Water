package com.gala.otw_server.room.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Request body for {@code PATCH /rooms/{roomId}} (host only) — "Gala details" and
 * "What members can do". Null fields are left unchanged; {@code clearTimes} removes
 * the optional start/end times.
 */
public record UpdateRoomRequest(

        @Size(min = 1, max = 120, message = "Title must be 1 to 120 characters")
        String title,

        @Size(min = 1, max = 150, message = "Destination must be 1 to 150 characters")
        String destination,

        LocalDate startDate,
        LocalDate endDate,
        LocalTime startTime,
        LocalTime endTime,
        Boolean clearTimes,

        Double meetingLat,
        Double meetingLng,

        @Size(max = 255, message = "Meeting label must be at most 255 characters")
        String meetingLabel,

        Boolean membersCanEditPlan,
        Boolean membersCanAddPhotos,
        Boolean membersCanDeleteOwnPhotos,
        Boolean locationSharingEnabled,

        /** "List this gala" on the Join a Gala page. */
        Boolean listed,

        /** The destination's map pin (from the place picker); send both or neither.
         *  Changing {@code destination} without them clears the old pin. */
        @DecimalMin(value = "-90", message = "Latitude must be between -90 and 90")
        @DecimalMax(value = "90", message = "Latitude must be between -90 and 90")
        Double destinationLat,

        @DecimalMin(value = "-180", message = "Longitude must be between -180 and 180")
        @DecimalMax(value = "180", message = "Longitude must be between -180 and 180")
        Double destinationLng
) {}
