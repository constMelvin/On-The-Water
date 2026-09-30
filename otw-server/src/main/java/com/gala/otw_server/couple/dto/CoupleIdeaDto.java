package com.gala.otw_server.couple.dto;

import com.gala.otw_server.couple.entity.CoupleIdea;

import java.math.BigDecimal;
import java.util.UUID;

/** One card on the "Date Ideas" tab, with whether this couple saved it. */
public record CoupleIdeaDto(
        CoupleIdea key,
        String title,
        BigDecimal estimatedCost,
        int durationHours,
        boolean saved,
        UUID savedBy
) {
    public static CoupleIdeaDto of(CoupleIdea idea, UUID savedBy) {
        return new CoupleIdeaDto(idea, idea.title(), idea.estimatedCost(), idea.durationHours(),
                savedBy != null, savedBy);
    }
}
