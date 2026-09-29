package com.gala.otw_server.common;

/**
 * Stable, machine-readable error codes returned in every error response body.
 * Format: DOMAIN_DETAIL  (screaming snake case).
 * Clients should switch on these values, not on HTTP status codes alone.
 */
public enum ErrorCode {

    // ── Auth ────────────────────────────────────────────────────────────────
    UNAUTHENTICATED,
    FORBIDDEN,
    TOKEN_EXPIRED,
    TOKEN_INVALID,
    ACCOUNT_REQUIRED,           // valid token, but an anonymous session — sign in with an account

    // ── Resource not found ──────────────────────────────────────────────────
    ROOM_NOT_FOUND,
    MEMBER_NOT_FOUND,
    ITINERARY_ITEM_NOT_FOUND,
    CHECKLIST_ITEM_NOT_FOUND,
    EXPENSE_NOT_FOUND,
    PHOTO_NOT_FOUND,

    // ── Access / membership ─────────────────────────────────────────────────
    NOT_A_ROOM_MEMBER,
    INSUFFICIENT_ROOM_ROLE,

    // ── Conflict / state ────────────────────────────────────────────────────
    ALREADY_A_MEMBER,
    DUPLICATE_NICKNAME,          // nickname already taken by an active member of this room
    OPTIMISTIC_LOCK_CONFLICT,   // version mismatch on itinerary/checklist edit
    INVALID_CODE,               // bad room_code on join

    // ── Validation / Limits ────────────────────────────────────────────────
    VALIDATION_ERROR,
    INVALID_REQUEST,
    INVALID_PHOTO_REFERENCE,   // driveFileId isn't a real/accessible image in the expected Drive folder
    TOO_MANY_REQUESTS,

    // ── Server ──────────────────────────────────────────────────────────────
    INTERNAL_ERROR,
}
