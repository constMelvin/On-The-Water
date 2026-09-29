-- ==============================================================================
-- V5: Enforce nickname uniqueness per room at the database layer.
-- Case-insensitive ("Miguel" and "miguel" collide) and scoped to active
-- members only (left_at IS NULL) — a member who left frees their nickname
-- for reuse, matching room_members' existing left_at-scoped uniqueness pattern.
-- ==============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_room_members_room_nickname_active
    ON room_members (room_id, LOWER(nickname))
    WHERE left_at IS NULL;
