package com.gala.otw_server.budget.entity;

import com.gala.otw_server.room.entity.Room;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Estimated budget for a room/gala: five categories plus how many people split it.
 * Primary key is shared with the room (1:1 relationship). {@code estimatedAmount} is the
 * stored total, always the sum of the five categories.
 */
@Entity
@Table(name = "budget_estimates")
@Getter
@Setter
@NoArgsConstructor
public class BudgetEstimate {

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2);

    @Id
    @Column(name = "room_id", nullable = false)
    private UUID roomId;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Column(name = "transport_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal transportAmount = ZERO;

    @Column(name = "stay_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal stayAmount = ZERO;

    @Column(name = "food_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal foodAmount = ZERO;

    @Column(name = "activities_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal activitiesAmount = ZERO;

    @Column(name = "other_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal otherAmount = ZERO;

    @Column(name = "participant_count", nullable = false)
    private int participantCount = 1;

    @Column(name = "estimated_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal estimatedAmount = ZERO;

    @Column(name = "currency", nullable = false, length = 3)
    private String currency = "PHP";

    @Column(name = "updated_by")
    private UUID updatedBy;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public BigDecimal total() {
        return transportAmount.add(stayAmount).add(foodAmount).add(activitiesAmount).add(otherAmount)
                .setScale(2, RoundingMode.HALF_UP);
    }

    @PrePersist
    @PreUpdate
    void onPersistOrUpdate() {
        transportAmount = scale(transportAmount);
        stayAmount = scale(stayAmount);
        foodAmount = scale(foodAmount);
        activitiesAmount = scale(activitiesAmount);
        otherAmount = scale(otherAmount);
        estimatedAmount = total();
        updatedAt = OffsetDateTime.now();
    }

    private static BigDecimal scale(BigDecimal v) {
        return v == null ? ZERO : v.setScale(2, RoundingMode.HALF_UP);
    }
}
