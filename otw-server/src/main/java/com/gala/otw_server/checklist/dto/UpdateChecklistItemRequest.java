package com.gala.otw_server.checklist.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Request body for {@code PATCH /api/v1/rooms/{roomId}/checklist/{itemId}}.
 * {@code version} is required for optimistic locking concurrency control.
 */
public record UpdateChecklistItemRequest(

        @Size(max = 150, message = "Label must be at most 150 characters")
        String label,

        UUID assignedTo,

        Boolean clearAssignment,

        Boolean isDone,

        @NotNull(message = "Version is required for concurrency control")
        Integer version
) {}
