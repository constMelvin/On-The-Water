package com.gala.otw_server.itinerary.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

/**
 * Request body for {@code POST /api/v1/rooms/{roomId}/itinerary/reorder} — drag-and-drop
 * or the up/down arrows. {@code items} is the COMPLETE route in its new order, each with
 * the version the client last saw; any stale version or missing/extra stop → 409, refetch.
 */
public record ReorderItineraryRequest(

        @NotEmpty(message = "Send the full list of stops in their new order")
        @Size(max = 200, message = "At most 200 stops")
        @Valid
        List<Item> items
) {
    public record Item(
            @NotNull UUID id,
            @NotNull Integer version
    ) {}
}
