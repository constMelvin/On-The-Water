package com.gala.otw_server.checklist.dto;

import jakarta.validation.constraints.NotNull;

/** Request body for {@code POST /rooms/{roomId}/checklist/{itemId}/claim} — "Claim" an unassigned item. */
public record ClaimChecklistItemRequest(

        @NotNull(message = "Version is required for concurrency control")
        Integer version
) {}
