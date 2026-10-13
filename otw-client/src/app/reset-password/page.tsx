import type { Metadata } from 'next';
import { ResetPasswordScreen } from './ResetPasswordScreen';

export const metadata: Metadata = { title: 'Set a new password · OTW' };

/** Where the Supabase reset email lands (see lib/auth/recovery.ts). */
export default function ResetPasswordPage() {
  return <ResetPasswordScreen />;
}
