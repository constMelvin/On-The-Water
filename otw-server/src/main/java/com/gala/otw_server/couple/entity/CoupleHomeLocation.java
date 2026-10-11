package com.gala.otw_server.couple.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Where one partner lives, for the Halfway Checker. One row per person per couple gala. */
@Entity
@Table(name = "couple_home_locations")
@Getter
@Setter
@NoArgsConstructor
public class CoupleHomeLocation {

    @EmbeddedId
    private CoupleHomeLocationId id;

    @Column(nullable = false)
    private double lat;

    @Column(nullable = false)
    private double lng;

    @Column(nullable = false, length = 150)
    private String label = "";

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public CoupleHomeLocation(UUID roomId, UUID userId) {
        this.id = new CoupleHomeLocationId(roomId, userId);
    }

    @PrePersist
    @PreUpdate
    void touch() {
        updatedAt = OffsetDateTime.now();
    }
}
