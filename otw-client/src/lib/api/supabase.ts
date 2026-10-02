'use client';

/**
 * Browser Supabase client. The backend never issues tokens: every call to it carries the
 * Supabase session's access token. A real account session (email + password) is required;
 * there are no guest sessions.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in otw-client/.env.');
    client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });
  }
  return client;
}

/** Thrown when there is no signed-in account session. The api() wrapper sends the user to /login. */
export class NotSignedInError extends Error {
  constructor() {
    super('Please log in to continue.');
    this.name = 'NotSignedInError';
  }
}

/** The current access token. Throws NotSignedInError when nobody is logged in (no guest sessions). */
export async function accessToken(): Promise<string> {
  const { data } = await supabase().auth.getSession();
  if (!data.session) throw new NotSignedInError();
  return data.session.access_token;
}

/** The Supabase user id (= the backend's userId) for this device, if a session exists. */
export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase().auth.getSession();
  return data.session?.user.id ?? null;
}
