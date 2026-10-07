package com.gala.otw_server.itinerary.entity;

import com.gala.otw_server.room.entity.Room;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Represents a scheduled or ordered event/activity within a gala/room.
 * Includes optimistic locking via {@code version} to prevent silent overwrite on concurrent edits.
 */
@Entity
@Table(name = "itinerary_items")
@Getter
@Setter
@NoArgsConstructor
public class ItineraryItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Column(name = "title", nullable = false, length = 150)
    private String title;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "starts_at")
    private OffsetDateTime startsAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "stop_type", nullable = false, length = 20)
    private StopType stopType = StopType.ACTIVITY;

    /** The stop's map pin (V23); both null when the place has no pin. */
    @Column(name = "lat")
    private Double lat;

    @Column(name = "lng")
    private Double lng;

    @Column(name = "position", nullable = false)
    private int position;

    @Column(name = "created_by", nullable = false, updatable = false)
    private UUID createdBy;

    @Column(name = "completed", nullable = false)
    private boolean completed = false;

    @Version
    @Column(name = "version", nullable = false)
    private int version;

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
