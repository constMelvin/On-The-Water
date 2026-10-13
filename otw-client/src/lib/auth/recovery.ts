import { supabase } from '@/lib/api/supabase';
import { authErrorMessage } from './errors';

/** Where the reset link lands; Supabase puts the recovery session in the URL there. */
export const resetRedirect = () => `${window.location.origin}/reset-password`;

/**
 * Emails a password reset link. Supabase answers the same whether or not the email has an
 * account, so callers must never say which (no account probing).
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: resetRedirect() });
  if (error) throw new Error(authErrorMessage(error));
}

/** Sets a new password for the signed-in account (the recovery session from the reset link). */
export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase().auth.updateUser({ password });
  if (error) throw new Error(authErrorMessage(error));
}
