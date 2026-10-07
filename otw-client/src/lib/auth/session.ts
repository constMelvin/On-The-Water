'use client';

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/api/supabase';
import { getQueryClient } from '@/providers';
import { EXISTING_ACCOUNT_MESSAGE, authErrorMessage, isExistingAccountSignUp } from './errors';

export interface AccountState {
  /** undefined while the session is being read (server render + hydration), then true / false. */
  signedIn: boolean | undefined;
  /** Display name from sign-up (user_metadata.name), '' if none (e.g. OAuth without a name). */
  name: string;
  email: string;
  /** name, else the part of the email before the @. */
  displayName: string;
}

const SIGNED_OUT: AccountState = { signedIn: false, name: '', email: '', displayName: '' };

function toAccount(session: Session | null): AccountState {
  const u = session?.user;
  // A guest (anonymous) session never counts as signed in.
  if (!u || u.is_anonymous || !u.email) return SIGNED_OUT;
  const name = typeof u.user_metadata?.name === 'string' ? u.user_metadata.name.trim() : '';
  return { signedIn: true, name, email: u.email, displayName: name || u.email.split('@')[0] };
}

/** The signed-in account, kept live through Supabase's auth events. */
export function useAccount(): AccountState {
  const [state, setState] = useState<AccountState>({ signedIn: undefined, name: '', email: '', displayName: '' });
  useEffect(() => {
    let alive = true;
    supabase()
      .auth.getSession()
      .then(({ data }) => alive && setState(toAccount(data.session)))
      .catch(() => alive && setState(SIGNED_OUT));
    let lastUserId: string | undefined;
    const { data } = supabase().auth.onAuthStateChange((event, session) => {
      const id = session?.user?.id;
      // Another tab signed out, or the account changed: never show the previous account's cached data.
      if (event === 'SIGNED_OUT' || (lastUserId !== undefined && id !== lastUserId)) getQueryClient().clear();
      lastUserId = id;
      setState(toAccount(session));
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return state;
}

/** Where the confirm link lands; /login picks up the session from the URL. */
const confirmRedirect = () => `${window.location.origin}/login`;

/**
 * Creates the account. 'confirm-email' means Confirm email is on: the account exists but
 * stays locked until the link in the email is opened.
 */
export async function signUp(name: string, email: string, password: string): Promise<'signed-in' | 'confirm-email'> {
  const { data, error } = await supabase().auth.signUp({
    email: email.trim(),
    password,
    // The confirm link returns here instead of the dashboard's Site URL.
    options: { data: { name: name.trim() }, emailRedirectTo: confirmRedirect() },
  });
  if (error) throw new Error(authErrorMessage(error));
  if (isExistingAccountSignUp(data.user)) throw new Error(EXISTING_ACCOUNT_MESSAGE);
  return data.session ? 'signed-in' : 'confirm-email';
}

/** Sends the sign-up confirmation email again. */
export async function resendConfirmation(email: string): Promise<void> {
  const { error } = await supabase().auth.resend({
    type: 'signup',
    email: email.trim(),
    options: { emailRedirectTo: confirmRedirect() },
  });
  if (error) throw new Error(authErrorMessage(error));
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(authErrorMessage(error));
}

/** Signs out and drops every cached query so the next account never sees this one's data. */
export async function signOut(): Promise<void> {
  await supabase().auth.signOut();
  getQueryClient().clear();
}

/** Seam for the OAuth login that is coming; not wired into any UI yet. */
export async function signInWithOAuth(provider: 'google'): Promise<void> {
  const { error } = await supabase().auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/me/galas` },
  });
  if (error) throw new Error(authErrorMessage(error));
}
