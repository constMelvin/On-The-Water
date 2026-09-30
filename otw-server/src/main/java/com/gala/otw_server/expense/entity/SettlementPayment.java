package com.gala.otw_server.expense.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * A recorded "Mark paid": {@code fromUserId} paid {@code toUserId} back outside the app.
 * Insert/delete only; settlement is still computed on read with these included.
 */
@Entity
@Table(name = "settlement_payments")
@Getter
@Setter
@NoArgsConstructor
public class SettlementPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "room_id", nullable = false, updatable = false)
    private UUID roomId;

    @Column(name = "from_user_id", nullable = false)
    private UUID fromUserId;

    @Column(name = "to_user_id", nullable = false)
    private UUID toUserId;

    @Column(name = "amount", nullable = false, precision = 12, scale = 2, updatable = false)
    private BigDecimal amount;

    @Column(name = "recorded_by", nullable = false)
    private UUID recordedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    void onPrePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
        if (amount != null) amount = amount.setScale(2, RoundingMode.HALF_UP);
    }
}
