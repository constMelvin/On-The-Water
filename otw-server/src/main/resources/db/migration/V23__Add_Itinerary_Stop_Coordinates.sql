-- V23: each itinerary stop's map pin, so every member sees the same stops on "The plan" map and
-- the road route can run stop 1 -> 2 -> ... -> the gala's destination. Set when a place is picked
-- or pinned in Add a Stop; NULL for older stops and free-text places (they're listed, not drawn).
-- Before this the pin lived only in the browser that added the stop.
ALTER TABLE itinerary_items ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE itinerary_items ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
