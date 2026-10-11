-- ==============================================================================
-- V25: Barkada Awards (after-gala poll -> awarding -> e-certificate)
-- ==============================================================================
-- The award categories are a fixed set in code (AwardCategory); only the poll and the votes are stored.
-- Tallies and winners are computed on read, and certificate images are generated in the browser, so
-- nothing derived is stored. Every row is scoped to ONE gala (room_id, ON DELETE CASCADE).
-- Depends on V24 only by ordering (this file just has to run after it); it references no V24 table.

-- One poll per gala. closed_at is set when the Gala Leader closes it early; once closes_at has passed
-- the poll counts as closed too (checked on read, no scheduler).
CREATE TABLE IF NOT EXISTS award_polls (
    room_id   UUID PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
    opened_by UUID NOT NULL,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    closes_at TIMESTAMPTZ NOT NULL,
    closed_at TIMESTAMPTZ
);

-- One vote per member per category (the primary key); changing a vote updates the row.
-- voter_user_id exists only to enforce that: the API never returns who voted for whom.
CREATE TABLE IF NOT EXISTS award_votes (
    room_id         UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    category_key    VARCHAR(30) NOT NULL,
    voter_user_id   UUID NOT NULL,
    nominee_user_id UUID NOT NULL,
    voted_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (room_id, category_key, voter_user_id),
    CHECK (voter_user_id <> nominee_user_id)
);

CREATE INDEX IF NOT EXISTS idx_award_votes_tally ON award_votes (room_id, category_key, nominee_user_id);

ALTER TABLE award_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE award_votes ENABLE ROW LEVEL SECURITY;
-- No SELECT policies on purpose: members only read these through the API, which keeps votes anonymous
-- (a direct read of award_votes would reveal who voted for whom). V20 already closes direct table access.
