import * as Linking from 'expo-linking';
import { supabase } from './supabase';

/**
 * Email + password accounts via Supabase (same as otw-client/src/lib/auth). No OAuth sign-in.
 * Error copy is the web's (otw-client/src/lib/auth/errors.ts) so both apps say the same thing.
 */

/** Where the confirm-email link sends the user back: otw://auth-callback (add it to Supabase Redirect URLs). */
export const authRedirect = () => Linking.createURL('auth-callback');

/** Shown when someone signs up with an email that already has an account. */
export const EXISTING_ACCOUNT_MESSAGE = 'Oops! May account na yang email na yarnch. Log in ka na lang.';
export const OFFLINE_MESSAGE = 'Can’t reach OTW right now. Check your internet and try again.';

interface AuthErrorLike {
  code?: string;
  message?: string;
  status?: number;
}

/** Supabase auth error -> copy safe to show. Unknown errors never leak provider text. */
export function authErrorMessage(err: AuthErrorLike | null | undefined): string {
  const code = err?.code;
  if (code === 'invalid_credentials') return 'That email and password don’t match. Try again.';
  if (code === 'user_already_exists' || code === 'email_exists') return EXISTING_ACCOUNT_MESSAGE;
  if (code === 'weak_password') return 'Pick a stronger password (at least 8 characters, not too common).';
  if (code === 'validation_failed' || code === 'email_address_invalid') return 'Enter a valid email address.';
  if (code === 'email_not_confirmed') return 'Confirm your email first. Check your inbox (and Spam) for the link from OTW.';
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit' || err?.status === 429) {
    return 'Too many tries. Wait a minute and try again.';
  }
  if (/sending (confirmation|recovery|magic link)? ?email/i.test(err?.message ?? '')) {
    return 'We couldn’t send your confirmation email just now. Try again in a few minutes.';
  }
  if (err && !err.status && /fetch|network/i.test(err.message ?? '')) return OFFLINE_MESSAGE;
  return 'OTW couldn’t finish that just now. Try again in a moment.';
}

/** Returns 'confirm-email' when the account still needs its email confirmed (no session yet). */
export async function signUp(name: string, email: string, password: string): Promise<'signed-in' | 'confirm-email'> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { name: name.trim() }, emailRedirectTo: authRedirect() },
  });
  if (error) throw new Error(authErrorMessage(error));
  // With Confirm email on, an already-confirmed email gets a placeholder user with no identities.
  const ids = data.user?.identities;
  if (data.user && Array.isArray(ids) && ids.length === 0) throw new Error(EXISTING_ACCOUNT_MESSAGE);
  return data.session ? 'signed-in' : 'confirm-email';
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(authErrorMessage(error));
}

export async function resendConfirmation(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim(),
    options: { emailRedirectTo: authRedirect() },
  });
  if (error) throw new Error(authErrorMessage(error));
}

/**
 * Emails a password reset link back to otw://auth-callback. Supabase answers the same whether or not
 * the email has an account, so callers must never say which (no account probing). PKCE: the link
 * only works on this phone, which holds the code verifier.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: authRedirect() });
  if (error) throw new Error(authErrorMessage(error));
}

/** Sets a new password for the signed-in account (the recovery session from the reset link). */
export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(authErrorMessage(error));
}

/**
 * Exchanges the `code` in a returned link for a session. 'recovery' for a password reset link,
 * 'signed-in' for an email confirm, false when the URL has no code.
 */
export async function exchangeFromUrl(url: string): Promise<'signed-in' | 'recovery' | false> {
  const code = new URL(url).searchParams.get('code');
  if (!code) return false;
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw new Error(authErrorMessage(error));
  // auth-js returns redirectType at runtime (from the stored PKCE verifier) but leaves it out of the type.
  return (data as { redirectType?: string | null }).redirectType === 'recovery' ? 'recovery' : 'signed-in';
}
