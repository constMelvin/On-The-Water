-- ==============================================================================
-- V5: Enforce nickname uniqueness per room at the database layer.
-- Case-insensitive ("Miguel" and "miguel" collide) and scoped to active
-- members only (left_at IS NULL) — a member who left frees their nickname
-- for a *different* user to take.
--
-- Note: this index does NOT help the same user rejoin under a new nickname —
-- room_members' UNIQUE (room_id, user_id) from V1 is NOT left_at-scoped, so a
-- user who left still collides with their own old (left) row. That is a
-- pre-existing gap, not something this index fixes; it needs a product
-- decision on rejoin semantics (reactivate the old row vs. relax that
-- constraint) before it's addressed.
-- ==============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_room_members_room_nickname_active
    ON room_members (room_id, LOWER(nickname))
    WHERE left_at IS NULL;
