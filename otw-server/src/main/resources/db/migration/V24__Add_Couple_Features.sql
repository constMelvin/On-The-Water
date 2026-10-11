-- ==============================================================================
-- V24: Couple features: Halfway Checker, Our Little Bucket List, Who Knows Who Better?
-- ==============================================================================
-- Every row is scoped to ONE gala (room_id, ON DELETE CASCADE), so nothing from one
-- gala can show up in another. Only couple rooms use these tables (the services check
-- Room.isCouple()). Direct Supabase access stays closed (V20 revoked it); RLS is a
-- second layer, same as V14.

-- ---- Halfway Checker: where each partner lives (one row per person per gala) ----
CREATE TABLE IF NOT EXISTS couple_home_locations (
    room_id    UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL,
    lat        DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
    lng        DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN -180 AND 180),
    label      VARCHAR(150) NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (room_id, user_id)
);

-- ---- Our Little Bucket List: one list per gala ----
CREATE TABLE IF NOT EXISTS couple_bucket_items (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id      UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    title        VARCHAR(120) NOT NULL,
    description  VARCHAR(500) NOT NULL DEFAULT '',
    est_budget   NUMERIC(12, 2) CHECK (est_budget IS NULL OR est_budget >= 0),
    target_date  DATE,
    created_by   UUID NOT NULL,
    completed_at TIMESTAMPTZ,
    completed_by UUID,
    -- The memory attached when it was completed: a photo already in this gala's Gala Dump + a caption.
    photo_id     UUID REFERENCES photos(id) ON DELETE SET NULL,
    memory       VARCHAR(500),
    version      INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_couple_bucket_room ON couple_bucket_items (room_id, created_at, id);

-- ---- Who Knows Who Better?: sessions and answers ----
CREATE TABLE IF NOT EXISTS couple_quiz_sessions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id       UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    mode          VARCHAR(10) NOT NULL CHECK (mode IN ('QUIZ', 'DEEP_TALK')),
    -- The question keys of the server-side bank (CoupleQuizQuestion), in the order asked.
    question_keys TEXT[] NOT NULL,
    created_by    UUID NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_couple_quiz_sessions_room ON couple_quiz_sessions (room_id, created_at DESC);

CREATE TABLE IF NOT EXISTS couple_quiz_answers (
    session_id   UUID NOT NULL REFERENCES couple_quiz_sessions(id) ON DELETE CASCADE,
    question_key VARCHAR(40) NOT NULL,
    user_id      UUID NOT NULL,
    -- QUIZ: my own answer and my guess of my partner's, both option keys. DEEP_TALK: text_answer only.
    own_answer   VARCHAR(40),
    guess_answer VARCHAR(40),
    text_answer  VARCHAR(500),
    answered_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (session_id, question_key, user_id)
);

ALTER TABLE couple_home_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE couple_bucket_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE couple_quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE couple_quiz_answers ENABLE ROW LEVEL SECURITY;
-- No SELECT policies on purpose: members only ever read these through the API, which also hides
-- a partner's quiz answers until both have answered (a direct read would skip that).
