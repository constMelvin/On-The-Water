-- V19: the gala's destination as a map pin, so "Who's OTW?" can show where the gala is and how
-- far each sharing member is from it. Set when a place is picked in Plan a Gala / Settings;
-- NULL for older galas and free-text destinations (meeting_lat/lng stay the meeting place).
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS destination_lat DOUBLE PRECISION;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS destination_lng DOUBLE PRECISION;
