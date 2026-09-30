package com.gala.otw_server.couple.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/** A hearted date idea in a couple gala ("Saved to your plan."). Shared by both people. */
@Entity
@Table(name = "couple_saved_ideas")
@Getter
@Setter
@NoArgsConstructor
public class CoupleSavedIdea {

    @EmbeddedId
    private CoupleSavedIdeaId id;

    @Column(name = "saved_by", nullable = false)
    private UUID savedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    public CoupleSavedIdea(CoupleSavedIdeaId id, UUID savedBy) {
        this.id = id;
        this.savedBy = savedBy;
    }

    @PrePersist
    void onPrePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }
}
