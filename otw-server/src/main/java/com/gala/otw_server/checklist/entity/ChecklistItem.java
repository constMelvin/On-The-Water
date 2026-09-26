package com.gala.otw_server.checklist.entity;

import com.gala.otw_server.room.entity.Room;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Represents a shared checklist item (e.g., "Bring ice", "Rent van") for a room/gala.
 * Includes optimistic locking via {@code version} to prevent silent overwrite on concurrent updates.
 */
@Entity
@Table(name = "checklist_items")
@Getter
@Setter
@NoArgsConstructor
public class ChecklistItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Column(name = "label", nullable = false, length = 150)
    private String label;

    @Column(name = "assigned_to")
    private UUID assignedTo;

    @Column(name = "is_done", nullable = false)
    private boolean done = false;

    @Column(name = "done_by")
    private UUID doneBy;

    @Column(name = "done_at")
    private OffsetDateTime doneAt;

    @Version
    @Column(name = "version", nullable = false)
    private int version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onPrePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }
}
