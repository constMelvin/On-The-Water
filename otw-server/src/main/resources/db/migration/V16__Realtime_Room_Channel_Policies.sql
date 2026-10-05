-- Private room channels (master plan §8): only active members of a room may receive the
-- broadcasts the backend publishes on room:{roomId}, or join its presence ("online now").
-- Clients can never send broadcasts themselves: the backend publishes with the service role,
-- which bypasses RLS, so no INSERT policy is granted for the broadcast extension.
--
-- realtime.messages only exists on Supabase. On a plain Postgres (local Testcontainers) this
-- migration is a no-op, so the schema still validates there.
DO $$
BEGIN
    IF to_regclass('realtime.messages') IS NULL THEN
        RAISE NOTICE 'realtime.messages not found; skipping room channel policies (not a Supabase database).';
        RETURN;
    END IF;

    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "Room members can receive room channel messages" ON realtime.messages';
    EXECUTE $p$
        CREATE POLICY "Room members can receive room channel messages"
            ON realtime.messages FOR SELECT
            TO authenticated
            USING (
                realtime.messages.extension IN ('broadcast', 'presence')
                AND EXISTS (
                    SELECT 1
                    FROM public.room_members rm
                    WHERE rm.user_id = auth.uid()
                      AND rm.left_at IS NULL
                      AND 'room:' || rm.room_id::text = realtime.topic()
                )
            )
    $p$;

    EXECUTE 'DROP POLICY IF EXISTS "Room members can track presence" ON realtime.messages';
    EXECUTE $p$
        CREATE POLICY "Room members can track presence"
            ON realtime.messages FOR INSERT
            TO authenticated
            WITH CHECK (
                realtime.messages.extension = 'presence'
                AND EXISTS (
                    SELECT 1
                    FROM public.room_members rm
                    WHERE rm.user_id = auth.uid()
                      AND rm.left_at IS NULL
                      AND 'room:' || rm.room_id::text = realtime.topic()
                )
            )
    $p$;
EXCEPTION
    WHEN insufficient_privilege THEN
        -- Realtime then falls back to the clients' polling; apply this file from the
        -- Supabase SQL editor as the postgres role to enable live updates.
        RAISE WARNING 'Could not create realtime.messages policies (insufficient privilege); clients will poll instead.';
END
$$;
