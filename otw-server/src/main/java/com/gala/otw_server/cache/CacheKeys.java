package com.gala.otw_server.cache;

import java.time.Duration;
import java.util.UUID;

/**
 * Centralized key naming and TTL conventions for Redis cache-aside entries.
 * Defined per OTW Backend Master Plan §6.
 */
public final class CacheKeys {

    private CacheKeys() {}

    // ── TTLs ─────────────────────────────────────────────────────────────────
    public static final Duration TTL_MEMBERSHIP = Duration.ofMinutes(5);
    public static final Duration TTL_OVERVIEW = Duration.ofSeconds(60);
    public static final Duration TTL_COLLECTIONS = Duration.ofSeconds(30);

    // ── Group Keys ───────────────────────────────────────────────────────────
    public static String groupMember(UUID groupId, UUID userId) {
        return "group:" + groupId + ":member:" + userId;
    }

    public static String groupRooms(UUID groupId) {
        return "group:" + groupId + ":rooms";
    }

    // ── Room Keys ────────────────────────────────────────────────────────────
    public static String roomMember(UUID roomId, UUID userId) {
        return "room:" + roomId + ":member:" + userId;
    }

    public static String roomOverview(UUID roomId) {
        return "room:" + roomId + ":overview";
    }

    public static String roomItinerary(UUID roomId) {
        return "room:" + roomId + ":itinerary";
    }

    public static String roomChecklist(UUID roomId) {
        return "room:" + roomId + ":checklist";
    }

    public static String roomSettlement(UUID roomId) {
        return "room:" + roomId + ":settlement";
    }

    public static String roomLocations(UUID roomId) {
        return "room:" + roomId + ":locations";
    }
}
