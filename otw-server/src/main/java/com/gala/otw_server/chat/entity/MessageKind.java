package com.gala.otw_server.chat.entity;

/**
 * TEXT: a member's message. SYSTEM: "Alex joined the gala." (no sender).
 * CARD: a planner change shown inline, e.g. "Jamie added a new itinerary stop".
 */
public enum MessageKind {
    TEXT,
    SYSTEM,
    CARD
}
