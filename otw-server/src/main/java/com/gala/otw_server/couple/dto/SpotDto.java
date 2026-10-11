package com.gala.otw_server.couple.dto;

/**
 * A place near the midpoint. {@code priceTier} is a rough guess by category (0 free, 1 budget, 2 mid-range):
 * OpenStreetMap has no real prices.
 */
public record SpotDto(
        String name,
        String category,
        double lat,
        double lng,
        double distanceKm,
        int priceTier
) {}
