-- V27: chat replies (a message can quote an earlier one), @mentions, and @everyone.
-- reply_to_message_id is SET NULL on delete for safety; messages are only deleted with their room today.
ALTER TABLE chat_messages
    ADD COLUMN IF NOT EXISTS reply_to_message_id UUID
        REFERENCES chat_messages(id) ON DELETE SET NULL;
ALTER TABLE chat_messages
    ADD COLUMN IF NOT EXISTS mentions_everyone BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS chat_message_mentions (
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL,
    PRIMARY KEY (message_id, user_id)
);

-- "Who reacted" list: newest first per message, keyset on (created_at, user_id).
CREATE INDEX IF NOT EXISTS idx_chat_reactions_message_created
    ON chat_reactions(message_id, created_at DESC, user_id);

ALTER TABLE chat_message_mentions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Room members can read chat mentions" ON chat_message_mentions;
CREATE POLICY "Room members can read chat mentions"
    ON chat_message_mentions FOR SELECT
    TO authenticated
    USING (
        message_id IN (
            SELECT cm.id
            FROM chat_messages cm
            JOIN room_members rm ON rm.room_id = cm.room_id
            WHERE rm.user_id = auth.uid() AND rm.left_at IS NULL
        )
    );
