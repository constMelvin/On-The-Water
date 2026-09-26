package com.gala.otw_server.budget.entity;

import com.gala.otw_server.room.entity.Room;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Estimated total budget for a room/gala.
 * Primary key is shared with the room (1:1 relationship).
 */
@Entity
@Table(name = "budget_estimates")
@Getter
@Setter
@NoArgsConstructor
public class BudgetEstimate {

    @Id
    @Column(name = "room_id", nullable = false)
    private UUID roomId;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Column(name = "estimated_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal estimatedAmount = BigDecimal.ZERO.setScale(2);

    @Column(name = "currency", nullable = false, length = 3)
    private String currency = "PHP";

    @Column(name = "updated_by")
    private UUID updatedBy;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    @PreUpdate
    void onPersistOrUpdate() {
        if (estimatedAmount != null) {
            estimatedAmount = estimatedAmount.setScale(2, java.math.RoundingMode.HALF_UP);
        }
        updatedAt = OffsetDateTime.now();
    }
}
