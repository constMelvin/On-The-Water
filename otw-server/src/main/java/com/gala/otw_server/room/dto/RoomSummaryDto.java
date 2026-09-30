package com.gala.otw_server.room.dto;

import com.gala.otw_server.room.entity.GalaPhase;

import java.math.BigDecimal;

/**
 * Everything the Gala Dashboard feature cards and the "You made it happen" recap
 * need, in one call. Counts only — lists stay on their own paginated endpoints.
 */
public record RoomSummaryDto(
        GalaPhase phase,
        int memberCount,
        Rsvp rsvp,
        Travel travel,
        int itineraryStops,
        int checklistDone,
        int checklistTotal,
        BigDecimal budgetTotal,
        BigDecimal budgetPerPerson,
        BigDecimal totalSpent,
        boolean settled,
        int photoCount,
        long unreadChat
) {
    public record Rsvp(int going, int maybe, int notGoing, int pending) {}

    public record Travel(int stillHome, int onTheWay, int almostThere, int arrived) {}
}
