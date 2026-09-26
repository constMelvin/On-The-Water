package com.gala.otw_server.checklist.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Request body for {@code POST /api/v1/rooms/{roomId}/checklist}.
 */
public record CreateChecklistItemRequest(

        @NotBlank(message = "Label is required")
        @Size(max = 150, message = "Label must be at most 150 characters")
        String label,

        UUID assignedTo
) {}
