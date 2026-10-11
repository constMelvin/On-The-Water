package com.gala.otw_server.couple.dto;

import java.util.UUID;

/**
 * Where each of the two lives and the point halfway between them. {@code midpoint} and {@code distanceKm}
 * are null until both have saved a home. The midpoint is a starting point, not the fairest place to meet.
 */
public record HalfwayDto(
        HomeDto mine,
        HomeDto partner,
        PointDto midpoint,
        Double distanceKm
) {
    public record HomeDto(UUID userId, double lat, double lng, String label) {}

    public record PointDto(double lat, double lng) {}
}
