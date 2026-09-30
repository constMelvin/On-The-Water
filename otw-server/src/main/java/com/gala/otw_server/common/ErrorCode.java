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
    ACCOUNT_REQUIRED,           // valid token, but an anonymous session on an account-only endpoint
    INVALID_GALA_PASSWORD,      // Gala Code found, but the Gala Password doesn't match

    // ── Resource not found ──────────────────────────────────────────────────
    ROOM_NOT_FOUND,
    MEMBER_NOT_FOUND,
    ITINERARY_ITEM_NOT_FOUND,
    CHECKLIST_ITEM_NOT_FOUND,
    EXPENSE_NOT_FOUND,
    PHOTO_NOT_FOUND,
    PAYMENT_NOT_FOUND,
    CHAT_MESSAGE_NOT_FOUND,
    NOTIFICATION_NOT_FOUND,
    NOT_A_COUPLE_ROOM,          // couple-only endpoint called on a group gala

    // ── Access / membership ─────────────────────────────────────────────────
    NOT_A_ROOM_MEMBER,
    INSUFFICIENT_ROOM_ROLE,
    PERMISSION_DISABLED,        // the host turned this member permission off in gala settings

    // ── Conflict / state ────────────────────────────────────────────────────
    ALREADY_A_MEMBER,
    DUPLICATE_NICKNAME,          // nickname already taken by an active member of this room
    OPTIMISTIC_LOCK_CONFLICT,   // version mismatch on itinerary/checklist edit
    INVALID_CODE,               // bad room_code on join
    ROOM_ARCHIVED,              // write attempted on an archived ("Mga Drawing") gala
    ROOM_FULL,                  // couple gala already has two members
    MEMBER_HAS_ACCOUNT,         // "Which one are you?" claim of a member linked to an account — log in instead
    HOST_CANNOT_LEAVE,          // the Gala Leader must archive or delete instead of leaving
    ALREADY_CLAIMED,            // checklist item already assigned to someone
    SETTLEMENT_MISMATCH,        // payment doesn't match an outstanding transfer

    // ── Validation / Limits ────────────────────────────────────────────────
    VALIDATION_ERROR,
    INVALID_REQUEST,
    INVALID_PHOTO_REFERENCE,   // driveFileId isn't a real/accessible image in the expected Drive folder
    TOO_MANY_REQUESTS,

    // ── Server ──────────────────────────────────────────────────────────────
    INTERNAL_ERROR,
}
