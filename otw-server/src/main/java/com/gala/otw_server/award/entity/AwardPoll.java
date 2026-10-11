package com.gala.otw_server.award.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * A gala's awards poll (one per gala). It is closed once {@code closedAt} is set (the Gala Leader closed it)
 * or {@code closesAt} has passed; the second is checked on read, so no scheduler is needed.
 */
@Entity
@Table(name = "award_polls")
@Getter
@Setter
@NoArgsConstructor
public class AwardPoll {

    @Id
    @Column(name = "room_id", nullable = false, updatable = false)
    private UUID roomId;

    @Column(name = "opened_by", nullable = false, updatable = false)
    private UUID openedBy;

    @Column(name = "opened_at", nullable = false, updatable = false)
    private OffsetDateTime openedAt;

    @Column(name = "closes_at", nullable = false, updatable = false)
    private OffsetDateTime closesAt;

    @Column(name = "closed_at")
    private OffsetDateTime closedAt;

    public AwardPoll(UUID roomId, UUID openedBy, OffsetDateTime openedAt, OffsetDateTime closesAt) {
        this.roomId = roomId;
        this.openedBy = openedBy;
        this.openedAt = openedAt;
        this.closesAt = closesAt;
    }

    public boolean isClosedAt(OffsetDateTime now) {
        return closedAt != null || !now.isBefore(closesAt);
    }
}
