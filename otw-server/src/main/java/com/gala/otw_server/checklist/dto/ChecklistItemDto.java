package com.gala.otw_server.checklist.dto;

import com.gala.otw_server.checklist.entity.ChecklistItem;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Public response DTO for a checklist item.
 */
public record ChecklistItemDto(
        UUID id,
        UUID roomId,
        String label,
        UUID assignedTo,
        boolean isDone,
        UUID doneBy,
        OffsetDateTime doneAt,
        int version,
        OffsetDateTime createdAt
) {
    public static ChecklistItemDto from(ChecklistItem item) {
        return new ChecklistItemDto(
                item.getId(),
                item.getRoom().getId(),
                item.getLabel(),
                item.getAssignedTo(),
                item.isDone(),
                item.getDoneBy(),
                item.getDoneAt(),
                item.getVersion(),
                item.getCreatedAt()
        );
    }
}
