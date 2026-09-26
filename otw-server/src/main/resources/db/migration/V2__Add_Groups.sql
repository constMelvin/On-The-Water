-- 1. Groups — the persistent circle of friends
CREATE TABLE IF NOT EXISTS groups (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_code  VARCHAR(8)  UNIQUE NOT NULL,
    name        VARCHAR(120) NOT NULL,
    created_by  UUID        NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Group Members — persist across every gala the group ever plans
CREATE TABLE IF NOT EXISTS group_members (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id    UUID        NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL,
    nickname    VARCHAR(60) NOT NULL,
    role        VARCHAR(20) NOT NULL DEFAULT 'MEMBER',  -- OWNER, ADMIN, MEMBER
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    left_at     TIMESTAMPTZ,
    UNIQUE (group_id, user_id)
);

-- 3. Add group_id FK to rooms (nullable — NULL = standalone room)
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE SET NULL;

-- ==============================================================================
-- Indexes
-- ==============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_groups_group_code       ON groups(group_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_group_members_composite ON group_members(group_id, user_id);
CREATE        INDEX IF NOT EXISTS idx_group_members_user_id  ON group_members(user_id);
CREATE        INDEX IF NOT EXISTS idx_rooms_group_id          ON rooms(group_id);
