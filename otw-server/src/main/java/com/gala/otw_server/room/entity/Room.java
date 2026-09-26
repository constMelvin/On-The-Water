package com.gala.otw_server.room.entity;

import com.gala.otw_server.group.entity.Group;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Represents a single gala or trip event (a "Room").
 * A room may optionally belong to a group ({@code group_id} nullable).
 * Standalone rooms ({@code group_id = null}) work identically — the group tier is simply absent.
 */
@Entity
@Table(name = "rooms")
@Getter
@Setter
@NoArgsConstructor
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    /** Nullable: null = standalone room, not scoped to any group. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id")
    private Group group;

    @Column(name = "room_code", unique = true, nullable = false, length = 8)
    private String roomCode;

    @Column(name = "title", nullable = false, length = 120)
    private String title;

    @Column(name = "schedule_at")
    private OffsetDateTime scheduleAt;

    @Column(name = "meeting_lat")
    private Double meetingLat;

    @Column(name = "meeting_lng")
    private Double meetingLng;

    @Column(name = "meeting_label", length = 255)
    private String meetingLabel;

    @Column(name = "host_user_id", nullable = false)
    private UUID hostUserId;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "ACTIVE";

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

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
