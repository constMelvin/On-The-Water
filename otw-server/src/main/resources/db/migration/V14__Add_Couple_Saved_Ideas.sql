-- ==============================================================================
-- V14: Couple Mode saved date ideas
-- ==============================================================================
-- The idea catalog itself is a server-side enum (CoupleIdea); only saves are stored.

CREATE TABLE IF NOT EXISTS couple_saved_ideas (
    room_id    UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    idea_key   VARCHAR(40) NOT NULL,
    saved_by   UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (room_id, idea_key)
);

ALTER TABLE couple_saved_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room members can read saved couple ideas"
    ON couple_saved_ideas FOR SELECT
    TO authenticated
    USING (
        room_id IN (
            SELECT rm.room_id
            FROM room_members rm
            WHERE rm.user_id = auth.uid() AND rm.left_at IS NULL
        )
    );
