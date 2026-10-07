/** Turns a Supabase auth error into copy safe to show. Unknown errors never leak provider text. */
export interface AuthErrorLike {
  code?: string;
  message?: string;
  status?: number;
}

/** Shown when someone signs up with an email that already has an account. */
export const EXISTING_ACCOUNT_MESSAGE = 'Oops! May account na yang email na yarnch. Log in ka na lang.';

/** Shown when a request can't reach the server at all. */
export const OFFLINE_MESSAGE = 'Can’t reach OTW right now. Check your internet and try again.';

export function authErrorMessage(err: AuthErrorLike | null | undefined): string {
  const code = err?.code;
  if (code === 'invalid_credentials') return 'That email and password don’t match. Try again.';
  if (code === 'user_already_exists' || code === 'email_exists') return EXISTING_ACCOUNT_MESSAGE;
  if (code === 'weak_password') return 'Pick a stronger password (at least 8 characters, not too common).';
  if (code === 'validation_failed' || code === 'email_address_invalid') return 'Enter a valid email address.';
  if (code === 'email_not_confirmed') {
    return 'Confirm your email first. Check your inbox (and Spam) for the link from OTW.';
  }
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit' || err?.status === 429) {
    return 'Too many tries. Wait a minute and try again.';
  }
  // Supabase reports a failed confirmation email as a generic 500; the text is only matched, never shown.
  if (/sending (confirmation|recovery|magic link)? ?email/i.test(err?.message ?? '')) {
    return 'We couldn’t send your confirmation email just now. Try again in a few minutes.';
  }
  // No HTTP status at all: the request never reached Supabase.
  if (err && !err.status && /fetch|network/i.test(err.message ?? '')) return OFFLINE_MESSAGE;
  return 'OTW couldn’t finish that just now. Try again in a moment.';
}

/**
 * With Confirm email on, Supabase answers a sign-up for an already-confirmed email with no error
 * and a placeholder user that has no identities (so emails can't be probed). Treat that as taken.
 */
export function isExistingAccountSignUp(user: { identities?: unknown[] | null } | null | undefined): boolean {
  return !!user && Array.isArray(user.identities) && user.identities.length === 0;
}
