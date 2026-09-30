package com.gala.otw_server.expense.dto;

import com.gala.otw_server.expense.entity.SettlementPayment;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record SettlementPaymentDto(
        UUID id,
        UUID fromUserId,
        UUID toUserId,
        BigDecimal amount,
        UUID recordedBy,
        OffsetDateTime createdAt
) {
    public static SettlementPaymentDto from(SettlementPayment p) {
        return new SettlementPaymentDto(p.getId(), p.getFromUserId(), p.getToUserId(), p.getAmount(),
                p.getRecordedBy(), p.getCreatedAt());
    }
}
