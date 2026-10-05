package com.gala.otw_server.room.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Represents a single gala or trip event (a "Room").
 * Rooms are always standalone — there is no persistent group/barkada tier.
 */
@Entity
@Table(name = "rooms")
@Getter
@Setter
@NoArgsConstructor
public class Room {

    public static final String STATUS_ACTIVE = "ACTIVE";
    public static final String STATUS_ARCHIVED = "ARCHIVED";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "room_code", unique = true, nullable = false, length = 8)
    private String roomCode;

    @Column(name = "title", nullable = false, length = 120)
    private String title;

    @Column(name = "destination", length = 150)
    private String destination;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    /** Kept for older clients; written as start date + start time. */
    @Column(name = "schedule_at")
    private OffsetDateTime scheduleAt;

    /** The destination's map pin; null when none was picked (free text or an older gala). */
    @Column(name = "destination_lat")
    private Double destinationLat;

    @Column(name = "destination_lng")
    private Double destinationLng;

    @Column(name = "meeting_lat")
    private Double meetingLat;

    @Column(name = "meeting_lng")
    private Double meetingLng;

    @Column(name = "meeting_label", length = 255)
    private String meetingLabel;

    /** BCrypt hash of the Gala Password. Never serialized. */
    @Column(name = "password_hash", length = 100)
    private String passwordHash;

    @Column(name = "host_user_id", nullable = false)
    private UUID hostUserId;

    @Column(name = "status", nullable = false, length = 20)
    private String status = STATUS_ACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(name = "room_type", nullable = false, length = 10)
    private RoomType roomType = RoomType.GROUP;

    // ── "What members can do" (gala settings) ────────────────────────────────

    @Column(name = "members_can_edit_plan", nullable = false)
    private boolean membersCanEditPlan = true;

    @Column(name = "members_can_add_photos", nullable = false)
    private boolean membersCanAddPhotos = true;

    @Column(name = "members_can_delete_own_photos", nullable = false)
    private boolean membersCanDeleteOwnPhotos = true;

    @Column(name = "location_sharing_enabled", nullable = false)
    private boolean locationSharingEnabled = true;

    /** Shown on the Join a Gala page (still needs the Gala Password to join). */
    @Column(name = "is_listed", nullable = false)
    private boolean listed = false;

    /** This gala's Google Drive folder for the Gala Dump (null until it's created). */
    @Column(name = "drive_folder_id", length = 200)
    private String driveFolderId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public boolean isArchived() {
        return STATUS_ARCHIVED.equals(status);
    }

    public boolean isCouple() {
        return roomType == RoomType.COUPLE;
    }

    /** Last day of the gala (single-day galas end on their start date). */
    public LocalDate lastDay() {
        return endDate != null ? endDate : startDate;
    }

    @PrePersist
    void onPrePersist() {
        OffsetDateTime now = OffsetDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    void onPreUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
