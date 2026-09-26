package com.gala.otw_server.room.entity;

/**
 * RSVP status for a room member.
 * PENDING is the default when a user joins or is added to a room.
 */
public enum RsvpStatus {
    PENDING,
    GOING,
    MAYBE,
    NOT_GOING
}
