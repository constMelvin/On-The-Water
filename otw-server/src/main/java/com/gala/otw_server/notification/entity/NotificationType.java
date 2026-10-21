package com.gala.otw_server.notification.entity;

/**
 * The seven reminder toggles on the Notifications screen, plus NUDGE (a direct
 * "G ka na ba?" from the Gala Leader), MENTION (@you or @everyone in the chat) and REPLY
 * (someone replied to your chat message). Those last three are not optional.
 *
 * <p>{@code prefColumn}/{@code defaultOn} map each type to its
 * {@code notification_preferences} column and the default used when a user has no
 * preferences row yet. Column names are compile-time constants, never user input.
 */
public enum NotificationType {
    GALA_SOON("gala_soon", true),
    SOMEONE_JOINED("someone_joined", true),
    ATTENDANCE_CHANGED("attendance_changed", false),
    CHECKLIST_REMINDER("checklist_reminder", true),
    BUDGET_UPDATED("budget_updated", false),
    DAY_BEFORE("day_before", true),
    GALA_DAY("gala_day", true),
    NUDGE(null, true),
    MENTION(null, true),
    REPLY(null, true);

    private final String prefColumn;
    private final boolean defaultOn;

    NotificationType(String prefColumn, boolean defaultOn) {
        this.prefColumn = prefColumn;
        this.defaultOn = defaultOn;
    }

    public String prefColumn() {
        return prefColumn;
    }

    public boolean defaultOn() {
        return defaultOn;
    }
}
