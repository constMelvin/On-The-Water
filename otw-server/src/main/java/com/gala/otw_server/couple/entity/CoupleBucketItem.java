package com.gala.otw_server.couple.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * One item of a couple gala's bucket list. Scoped to its gala by {@code roomId}; every query must filter on it.
 * Optimistic locking via {@code version}: two people editing the same item get a 409, not a silent overwrite.
 */
@Entity
@Table(name = "couple_bucket_items")
@Getter
@Setter
@NoArgsConstructor
public class CoupleBucketItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "room_id", nullable = false, updatable = false)
    private UUID roomId;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(nullable = false, length = 500)
    private String description = "";

    /** Money is BigDecimal, scale 2, HALF_UP. */
    @Column(name = "est_budget", precision = 12, scale = 2)
    private BigDecimal estBudget;

    @Column(name = "target_date")
    private LocalDate targetDate;

    @Column(name = "created_by", nullable = false, updatable = false)
    private UUID createdBy;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @Column(name = "completed_by")
    private UUID completedBy;

    /** A photo already in this gala's Gala Dump, attached as the memory of a completed item. */
    @Column(name = "photo_id")
    private UUID photoId;

    @Column(length = 500)
    private String memory;

    @Version
    @Column(name = "version", nullable = false)
    private int version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    public CoupleBucketItem(UUID roomId, UUID createdBy, String title) {
        this.roomId = roomId;
        this.createdBy = createdBy;
        this.title = title;
    }

    public boolean isCompleted() {
        return completedAt != null;
    }

    @PrePersist
    void onPrePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }
}
