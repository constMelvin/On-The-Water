'use client';

/**
 * Browser Supabase client. The backend never issues tokens: every call to it carries the
 * Supabase session's access token. No account is needed inside a gala, so the first API
 * call on a device quietly starts an anonymous Supabase session (kept in localStorage,
 * so the same device stays the same member).
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

let signingIn: Promise<string> | null = null;

/** The current access token, starting an anonymous session first if there is none. */
export async function accessToken(): Promise<string> {
  const { data } = await supabase().auth.getSession();
  if (data.session) return data.session.access_token;

  // One sign-in even when several requests start at once.
  signingIn ??= supabase()
    .auth.signInAnonymously()
    .then(({ data: d, error }) => {
      if (error || !d.session) {
        throw new Error(
          `Couldn't start a guest session: ${error?.message ?? 'no session'}. ` +
            'Check that Anonymous sign-ins are enabled in Supabase (Authentication → Sign In / Providers).'
        );
      }
      return d.session.access_token;
    })
    .finally(() => {
      signingIn = null;
    });
  return signingIn;
}

/** The Supabase user id (= the backend's userId) for this device, if a session exists. */
export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase().auth.getSession();
  return data.session?.user.id ?? null;
}
