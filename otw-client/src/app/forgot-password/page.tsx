import type { Metadata } from 'next';
import { ForgotPasswordScreen } from './ForgotPasswordScreen';

export const metadata: Metadata = { title: 'Forgot password · OTW' };

interface ForgotPasswordPageProps {
  searchParams: Promise<{ email?: string }>;
}

/** Asks Supabase to email a reset link. ?email= prefills the field (carried over from Log in). */
export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const { email } = await searchParams;
  return <ForgotPasswordScreen initialEmail={typeof email === 'string' ? email.slice(0, 254) : ''} />;
}
