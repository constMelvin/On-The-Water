package com.gala.otw_server.couple.entity;

import java.math.BigDecimal;

/**
 * The "Date Ideas" catalog, server-side so saved keys are always valid. Costs are
 * rough per-couple estimates in PHP (0 = free).
 */
public enum CoupleIdea {
    SUNSET_AT_THE_PARK("Sunset at the park", "0.00", 2),
    COFFEE_CRAWL("Coffee crawl", "600.00", 3),
    PICNIC_WITH_A_PLAYLIST("Picnic with a playlist", "400.00", 2),
    NIGHT_MARKET_FOOD_TRIP("Night market food trip", "800.00", 3),
    MUSEUM_THEN_MERIENDA("Museum, then merienda", "700.00", 4),
    MOVIE_NIGHT_AT_HOME("Movie night at home", "250.00", 3);

    private final String title;
    private final BigDecimal estimatedCost;
    private final int durationHours;

    CoupleIdea(String title, String estimatedCost, int durationHours) {
        this.title = title;
        this.estimatedCost = new BigDecimal(estimatedCost);
        this.durationHours = durationHours;
    }

    public String title() {
        return title;
    }

    public BigDecimal estimatedCost() {
        return estimatedCost;
    }

    public int durationHours() {
        return durationHours;
    }
}
