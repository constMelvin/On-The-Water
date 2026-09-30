-- ==============================================================================
-- V12: Optional photo caption for The Gala Dump
-- ==============================================================================

ALTER TABLE photos ADD COLUMN IF NOT EXISTS caption VARCHAR(140);

CREATE INDEX IF NOT EXISTS idx_photos_room_created ON photos(room_id, created_at DESC);
