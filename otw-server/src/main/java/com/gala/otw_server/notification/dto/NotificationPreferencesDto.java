package com.gala.otw_server.notification.dto;

import com.gala.otw_server.notification.entity.NotificationPreference;
import jakarta.validation.constraints.NotNull;

/**
 * The seven toggles on the Notifications screen. Used for both GET and PUT
 * ({@code PUT} replaces all seven, so every field is required).
 */
public record NotificationPreferencesDto(
        @NotNull Boolean galaSoon,
        @NotNull Boolean someoneJoined,
        @NotNull Boolean attendanceChanged,
        @NotNull Boolean checklistReminder,
        @NotNull Boolean budgetUpdated,
        @NotNull Boolean dayBefore,
        @NotNull Boolean galaDay
) {
    public static NotificationPreferencesDto from(NotificationPreference p) {
        return new NotificationPreferencesDto(
                p.isGalaSoon(),
                p.isSomeoneJoined(),
                p.isAttendanceChanged(),
                p.isChecklistReminder(),
                p.isBudgetUpdated(),
                p.isDayBefore(),
                p.isGalaDay());
    }
}
