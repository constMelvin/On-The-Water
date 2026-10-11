package com.gala.otw_server.couple.entity;

/** Kinds of date spots the Halfway Checker can suggest, each with its OpenStreetMap tag and a rough price tier. */
public enum SpotCategory {
    CAFE("amenity", "cafe", 1),
    RESTAURANT("amenity", "restaurant", 2),
    PARK("leisure", "park", 0),
    MALL("shop", "mall", 2);

    private final String tagKey;
    private final String tagValue;
    private final int priceTier;

    SpotCategory(String tagKey, String tagValue, int priceTier) {
        this.tagKey = tagKey;
        this.tagValue = tagValue;
        this.priceTier = priceTier;
    }

    public String tagKey() {
        return tagKey;
    }

    public String tagValue() {
        return tagValue;
    }

    /** 0 free, 1 budget, 2 mid-range: a guess by category, not real prices. */
    public int priceTier() {
        return priceTier;
    }
}
