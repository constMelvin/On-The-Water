package com.gala.otw_server.itinerary.dto;

import com.gala.otw_server.itinerary.entity.ItineraryItem;
import com.gala.otw_server.itinerary.entity.StopType;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Public response DTO for an itinerary item (a stop on "The Gala Route";
 * {@code title} is the place).
 */
public record ItineraryItemDto(
        UUID id,
        UUID roomId,
        String title,
        String notes,
        OffsetDateTime startsAt,
        StopType stopType,
        /** The stop's map pin; both null when it has none. */
        Double lat,
        Double lng,
        int position,
        UUID createdBy,
        boolean completed,
        int version,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    public static ItineraryItemDto from(ItineraryItem item) {
        return new ItineraryItemDto(
                item.getId(),
                item.getRoom().getId(),
                item.getTitle(),
                item.getNotes(),
                item.getStartsAt(),
                item.getStopType(),
                item.getLat(),
                item.getLng(),
                item.getPosition(),
                item.getCreatedBy(),
                item.isCompleted(),
                item.getVersion(),
                item.getCreatedAt(),
                item.getUpdatedAt()
        );
    }
}
