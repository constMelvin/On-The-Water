-- ==============================================================================
-- V6: Gala details (destination + date range) and the Gala Password
-- ==============================================================================
-- Artifact "Plan a Gala": title → date (+ optional start/end time) → destination →
-- Gala Password. schedule_at is kept (additive-only rule) and still written as the
-- start date + start time for older clients.

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS destination   VARCHAR(150);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS start_date    DATE;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS end_date      DATE;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS start_time    TIME;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS end_time      TIME;
-- BCrypt hash only; the plain password is never stored or logged. NULL for rooms
-- created before V6 — "Enter a Gala" is unavailable until the host sets one.
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS password_hash VARCHAR(100);

UPDATE rooms
SET start_date = (schedule_at AT TIME ZONE 'Asia/Manila')::date,
    start_time = (schedule_at AT TIME ZONE 'Asia/Manila')::time
WHERE schedule_at IS NOT NULL AND start_date IS NULL;

ALTER TABLE rooms ADD CONSTRAINT chk_rooms_date_range
    CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date);

-- My Galas / calendar / reminder scheduler all filter on status + start_date.
CREATE INDEX IF NOT EXISTS idx_rooms_status_start_date ON rooms(status, start_date);
