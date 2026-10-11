package com.gala.otw_server.award.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * One member's vote in one category. The voter id exists only to enforce "one vote per member per category":
 * the API never returns who voted for whom.
 */
@Entity
@Table(name = "award_votes")
@Getter
@Setter
@NoArgsConstructor
public class AwardVote {

    @EmbeddedId
    private AwardVoteId id;

    @Column(name = "nominee_user_id", nullable = false)
    private UUID nomineeUserId;

    @Column(name = "voted_at", nullable = false)
    private OffsetDateTime votedAt;

    public AwardVote(AwardVoteId id, UUID nomineeUserId) {
        this.id = id;
        this.nomineeUserId = nomineeUserId;
    }

    @PrePersist
    @PreUpdate
    void touch() {
        votedAt = OffsetDateTime.now();
    }
}
