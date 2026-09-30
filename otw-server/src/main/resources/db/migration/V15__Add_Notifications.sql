-- ==============================================================================
-- V15: Notification preferences + in-app notification feed (account users only)
-- ==============================================================================
-- Defaults mirror the artifact's Notifications screen: attendance and budget
-- updates start off, everything else on.

CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id            UUID PRIMARY KEY,
    gala_soon          BOOLEAN NOT NULL DEFAULT true,
    someone_joined     BOOLEAN NOT NULL DEFAULT true,
    attendance_changed BOOLEAN NOT NULL DEFAULT false,
    checklist_reminder BOOLEAN NOT NULL DEFAULT true,
    budget_updated     BOOLEAN NOT NULL DEFAULT false,
    day_before         BOOLEAN NOT NULL DEFAULT true,
    gala_day           BOOLEAN NOT NULL DEFAULT true,
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL,
    room_id    UUID REFERENCES rooms(id) ON DELETE CASCADE,
    type       VARCHAR(30) NOT NULL,
    title      VARCHAR(120) NOT NULL,
    body       VARCHAR(300) NOT NULL,
    dedupe_key VARCHAR(120),               -- set by the reminder scheduler so reruns never duplicate
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at    TIMESTAMPTZ,
    UNIQUE (user_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC, id DESC);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own notification preferences"
    ON notification_preferences FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can read their own notifications"
    ON notifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
