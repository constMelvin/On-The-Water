/** Same import path and shape as the web (`supabase()` is a function there). */
import { supabase as client } from '@/lib/supabase';

export const supabase = () => client;

/** The Supabase user id (= the backend's userId) on this phone, if signed in. */
export async function currentUserId(): Promise<string | null> {
  const { data } = await client.auth.getSession();
  return data.session?.user.id ?? null;
}
