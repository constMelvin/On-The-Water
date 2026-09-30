-- ==============================================================================
-- V13: Chat (Chismis) — messages, heart reactions, read markers
-- ==============================================================================

CREATE TABLE IF NOT EXISTS chat_messages (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id        UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    sender_user_id UUID,                    -- NULL for SYSTEM messages
    kind           VARCHAR(10) NOT NULL,    -- TEXT, SYSTEM, CARD
    body           VARCHAR(1000) NOT NULL,
    ref_type       VARCHAR(30),             -- e.g. ITINERARY_ITEM for CARD messages
    ref_id         UUID,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (kind IN ('TEXT', 'SYSTEM', 'CARD'))
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created ON chat_messages(room_id, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS chat_reactions (
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (message_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_read_markers (
    room_id      UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL,
    last_read_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (room_id, user_id)
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_read_markers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Room members can read chat messages"
    ON chat_messages FOR SELECT
    TO authenticated
    USING (
        room_id IN (
            SELECT rm.room_id
            FROM room_members rm
            WHERE rm.user_id = auth.uid() AND rm.left_at IS NULL
        )
    );

CREATE POLICY "Room members can read chat reactions"
    ON chat_reactions FOR SELECT
    TO authenticated
    USING (
        message_id IN (
            SELECT cm.id
            FROM chat_messages cm
            JOIN room_members rm ON rm.room_id = cm.room_id
            WHERE rm.user_id = auth.uid() AND rm.left_at IS NULL
        )
    );

CREATE POLICY "Members can read their own read markers"
    ON chat_read_markers FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
