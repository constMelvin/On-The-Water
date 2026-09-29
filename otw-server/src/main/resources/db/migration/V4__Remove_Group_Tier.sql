-- ==============================================================================
-- V4: Remove the Group tier — OTW is now a flat, standalone-room-only model.
-- Dropping rooms.group_id first releases the FK to groups(id). group_members
-- and groups must be dropped together in one statement: V3's RLS policy on
-- "groups" references group_members in its USING clause, so Postgres records
-- a dependency of that policy on group_members — dropping group_members
-- alone first fails with "other objects depend on it". Dropping both tables
-- in a single DROP TABLE resolves dependencies across the whole set first.
-- ==============================================================================

ALTER TABLE rooms DROP COLUMN IF EXISTS group_id;

DROP TABLE IF EXISTS group_members, groups;
