-- Test-only stand-ins for the Supabase objects the Flyway migrations reference, so they run on the
-- plain Postgres Testcontainer. On Supabase these already exist; this file never runs there.
-- realtime.messages is deliberately NOT stubbed: V16/V20 detect its absence and skip their
-- Supabase-only policies.

CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;

CREATE SCHEMA auth;

-- Supabase's auth.uid(): the JWT `sub` of the current request, NULL outside a request.
CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
AS $$
    SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
