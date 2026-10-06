import type { Metadata } from 'next';
import { LoginScreen } from './LoginScreen';
import { safeNext } from '@/lib/otw/safe-next';

/** The browser tab names the form that's open (LoginScreen keeps it in sync when switching tabs). */
export async function generateMetadata({ searchParams }: LoginPageProps): Promise<Metadata> {
  const { tab } = await searchParams;
  return { title: tab === 'create' ? 'Create account · OTW' : 'Log in · OTW' };
}

interface LoginPageProps {
  searchParams: Promise<{ tab?: string; gala?: string; ctx?: string; next?: string }>;
}

/**
 * Log in / Create account: the first step for Plan a Gala and Join a Gala.
 * ?next= is where to go afterwards (same-site paths only), ?ctx= is what they were starting.
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { tab, gala, ctx, next } = await searchParams;
  const known = ctx === 'plan' || ctx === 'join' || ctx === 'enter' || ctx === 'me' ? ctx : '';
  // No ?next=: a gala to go back to, else My Galas.
  const fallback = gala ? `/gala/${encodeURIComponent(gala)}` : '/me/galas';

  return (
    <LoginScreen
      initialTab={tab === 'create' ? 'create' : 'login'}
      ctx={known}
      next={safeNext(next, fallback)}
      gala={gala}
    />
  );
}
