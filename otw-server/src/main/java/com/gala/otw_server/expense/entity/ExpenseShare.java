package com.gala.otw_server.expense.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * An individual participant's share of an expense.
 */
@Entity
@Table(
    name = "expense_shares",
    uniqueConstraints = @UniqueConstraint(columnNames = {"expense_id", "user_id"})
)
@Getter
@Setter
@NoArgsConstructor
public class ExpenseShare {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "expense_id", nullable = false)
    private Expense expense;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "share_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal shareAmount;

    @PrePersist
    @PreUpdate
    void onPersistOrUpdate() {
        if (shareAmount != null) {
            shareAmount = shareAmount.setScale(2, java.math.RoundingMode.HALF_UP);
        }
    }
}
