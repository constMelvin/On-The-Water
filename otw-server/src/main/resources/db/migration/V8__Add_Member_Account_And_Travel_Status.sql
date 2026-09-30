-- ==============================================================================
-- V8: Anonymous-first membership + "Who's OTW?" travel status
-- ==============================================================================

-- true once the member's Supabase user is a registered account (not an anonymous
-- session). Members with an account can't be claimed through "Enter a Gala";
-- they log in instead.
ALTER TABLE room_members ADD COLUMN IF NOT EXISTS has_account BOOLEAN NOT NULL DEFAULT false;

-- Before V8 anonymous sessions were rejected outright, so every existing member
-- is a registered account.
UPDATE room_members SET has_account = true;

-- Manual status that works with or without GPS.
ALTER TABLE room_members ADD COLUMN IF NOT EXISTS travel_status VARCHAR(20) NOT NULL DEFAULT 'STILL_HOME';
ALTER TABLE room_members ADD CONSTRAINT chk_room_members_travel_status
    CHECK (travel_status IN ('STILL_HOME', 'ON_THE_WAY', 'ALMOST_THERE', 'ARRIVED'));
