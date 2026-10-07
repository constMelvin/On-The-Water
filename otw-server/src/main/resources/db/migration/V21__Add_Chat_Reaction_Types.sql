-- V21: chat reactions beyond the heart (Messenger-style picker). Still one reaction per member
-- per message (the PK is unchanged); picking another one replaces it. Existing rows are hearts.
ALTER TABLE chat_reactions ADD COLUMN IF NOT EXISTS reaction VARCHAR(10) NOT NULL DEFAULT 'HEART';

ALTER TABLE chat_reactions DROP CONSTRAINT IF EXISTS chat_reactions_reaction_check;
ALTER TABLE chat_reactions ADD CONSTRAINT chat_reactions_reaction_check
    CHECK (reaction IN ('HEART', 'HAHA', 'WOW', 'SAD', 'ANGRY', 'LIKE'));
