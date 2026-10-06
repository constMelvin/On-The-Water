-- V20: Close direct table access through Supabase's auto-generated API (PostgREST).
--
-- The browser holds the public anon key and the user's JWT, so any table the anon/authenticated
-- roles can SELECT is readable straight from Supabase, bypassing the backend. The frontend never
-- does that (all data goes through the Spring API), yet members could read raw rooms rows,
-- including password_hash and drive_folder_id. RLS stays on as a second layer.
--
-- The realtime channel policies (V16) check membership by reading public.room_members as the
-- caller, so revoking SELECT alone would break live updates. They now call a SECURITY DEFINER
-- function in a private schema that PostgREST does not expose.
--
-- Supabase only: on a plain Postgres (local Testcontainers) the roles and auth.uid() don't exist,
-- so this is a no-op there. Everything below runs as one block: if any step fails (e.g. missing
-- privilege on realtime.messages), nothing is applied and a warning is raised instead.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
       OR to_regclass('realtime.messages') IS NULL THEN
        RAISE NOTICE 'Not a Supabase database; skipping table privilege lockdown.';
        RETURN;
    END IF;

    -- 1. Membership check used by the realtime policies, runnable without table privileges.
    EXECUTE 'CREATE SCHEMA IF NOT EXISTS otw_private';
    EXECUTE 'REVOKE ALL ON SCHEMA otw_private FROM PUBLIC';
    EXECUTE 'GRANT USAGE ON SCHEMA otw_private TO authenticated';
    EXECUTE $f$
        CREATE OR REPLACE FUNCTION otw_private.is_room_channel_member(channel_topic text)
        RETURNS boolean
        LANGUAGE sql
        STABLE
        SECURITY DEFINER
        SET search_path = ''
        AS $body$
            SELECT EXISTS (
                SELECT 1
                FROM public.room_members rm
                WHERE rm.user_id = auth.uid()
                  AND rm.left_at IS NULL
                  AND 'room:' || rm.room_id::text = channel_topic
            )
        $body$
    $f$;
    EXECUTE 'REVOKE ALL ON FUNCTION otw_private.is_room_channel_member(text) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION otw_private.is_room_channel_member(text) TO authenticated';

    -- 2. Same rules as V16, now through the function.
    EXECUTE 'DROP POLICY IF EXISTS "Room members can receive room channel messages" ON realtime.messages';
    EXECUTE $p$
        CREATE POLICY "Room members can receive room channel messages"
            ON realtime.messages FOR SELECT
            TO authenticated
            USING (
                realtime.messages.extension IN ('broadcast', 'presence')
                AND otw_private.is_room_channel_member(realtime.topic())
            )
    $p$;

    EXECUTE 'DROP POLICY IF EXISTS "Room members can track presence" ON realtime.messages';
    EXECUTE $p$
        CREATE POLICY "Room members can track presence"
            ON realtime.messages FOR INSERT
            TO authenticated
            WITH CHECK (
                realtime.messages.extension = 'presence'
                AND otw_private.is_room_channel_member(realtime.topic())
            )
    $p$;

    -- 3. No direct access to app tables for browser roles (the backend connects as postgres).
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated';
    EXECUTE 'REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated';

    -- ...and none for tables future migrations create (Supabase grants them by default).
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated';
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE WARNING 'V20 skipped (insufficient privilege): run this file in the Supabase SQL editor as postgres.';
END
$$;
