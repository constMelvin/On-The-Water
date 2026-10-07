-- ==============================================================================
-- V22: Per-account profile (nickname, status line, avatar colour, small photo)
-- ==============================================================================
-- Owner decision 2026-10-07: a profile that follows the account across devices.
-- Keyed by the Supabase auth user id (JWT sub); there is still no local users table
-- and no FK to auth.users, same as notification_preferences. The photo is the
-- browser-downscaled data URL (<= ~60 KB), a documented exception to "never store
-- binaries" (see master plan changelog). Absent row = empty profile.

CREATE TABLE IF NOT EXISTS user_profiles (
    user_id    UUID PRIMARY KEY,
    nickname   VARCHAR(20) NOT NULL DEFAULT '',
    status     VARCHAR(40) NOT NULL DEFAULT '',
    color      VARCHAR(10) CHECK (color IN ('rosy', 'teal', 'zest', 'blossom')),
    photo      TEXT CHECK (photo IS NULL OR (length(photo) <= 65000 AND photo ~ '^data:image/(webp|jpeg|png);base64,')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own profile"
    ON user_profiles FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
