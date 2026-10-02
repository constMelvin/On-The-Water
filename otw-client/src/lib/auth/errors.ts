/** Turns a Supabase auth error into copy safe to show. Unknown errors never leak provider text. */
export interface AuthErrorLike {
  code?: string;
  message?: string;
  status?: number;
}

export function authErrorMessage(err: AuthErrorLike | null | undefined): string {
  const code = err?.code;
  if (code === 'invalid_credentials') return 'That email and password don’t match. Try again.';
  if (code === 'user_already_exists' || code === 'email_exists') {
    return 'That email already has an account. Try logging in instead.';
  }
  if (code === 'weak_password') return 'Pick a stronger password (at least 8 characters, not too common).';
  if (code === 'validation_failed' || code === 'email_address_invalid') return 'Enter a valid email address.';
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit' || err?.status === 429) {
    return 'Too many tries. Wait a minute and try again.';
  }
  return 'Something went wrong. Please try again.';
}
