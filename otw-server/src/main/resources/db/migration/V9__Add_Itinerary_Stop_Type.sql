-- ==============================================================================
-- V9: Itinerary stop type (Add a Stop → Type: Activity / Food / Meet-up)
-- ==============================================================================

ALTER TABLE itinerary_items ADD COLUMN IF NOT EXISTS stop_type VARCHAR(20) NOT NULL DEFAULT 'ACTIVITY';
ALTER TABLE itinerary_items ADD CONSTRAINT chk_itinerary_items_stop_type
    CHECK (stop_type IN ('MEET_UP', 'ACTIVITY', 'FOOD'));
