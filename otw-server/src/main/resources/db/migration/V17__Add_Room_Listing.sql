-- "List this gala" (gala settings): a listed gala shows up on the Join a Gala page for any
-- logged-in account; joining still needs the Gala Password. Off by default, so existing and new
-- galas stay reachable by code only until the Gala Leader turns it on.
ALTER TABLE rooms ADD COLUMN is_listed BOOLEAN NOT NULL DEFAULT false;

-- The directory only reads active, listed galas, soonest first.
CREATE INDEX idx_rooms_listed_start ON rooms (start_date) WHERE is_listed AND status = 'ACTIVE';
