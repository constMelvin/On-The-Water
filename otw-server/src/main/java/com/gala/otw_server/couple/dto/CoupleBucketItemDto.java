package com.gala.otw_server.couple.dto;

import com.gala.otw_server.couple.entity.CoupleBucketItem;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record CoupleBucketItemDto(
        UUID id,
        UUID roomId,
        String title,
        String description,
        BigDecimal estBudget,
        LocalDate targetDate,
        UUID createdBy,
        boolean completed,
        OffsetDateTime completedAt,
        UUID completedBy,
        UUID photoId,
        String memory,
        int version,
        OffsetDateTime createdAt
) {
    public static CoupleBucketItemDto from(CoupleBucketItem i) {
        return new CoupleBucketItemDto(
                i.getId(),
                i.getRoomId(),
                i.getTitle(),
                i.getDescription(),
                i.getEstBudget(),
                i.getTargetDate(),
                i.getCreatedBy(),
                i.isCompleted(),
                i.getCompletedAt(),
                i.getCompletedBy(),
                i.getPhotoId(),
                i.getMemory(),
                i.getVersion(),
                i.getCreatedAt()
        );
    }
}
