-- ==============================================================================
-- V4: Remove the Group tier — OTW is now a flat, standalone-room-only model.
-- Dropping rooms.group_id first releases the FK to groups(id); group_members
-- is dropped before groups since it also references groups(id).
-- ==============================================================================

ALTER TABLE rooms DROP COLUMN IF EXISTS group_id;

DROP TABLE IF EXISTS group_members;

DROP TABLE IF EXISTS groups;
