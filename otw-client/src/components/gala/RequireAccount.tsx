'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from '@/lib/auth/session';
import { loginUrl } from '@/lib/auth/redirect';

/** Which flow the person was starting; the login screen words its explanation from this. */
export type AccountContext = 'plan' | 'join' | 'enter' | 'me';

/**
 * UX gate for Plan, Join and Enter a Gala: without a real account session it sends the person to
 * Log in / Create account, remembering the page to come back to. This is only convenience; the
 * backend's AccountRequiredFilter is the actual enforcement.
 */
export function RequireAccount({ ctx, children }: { ctx: AccountContext; children: ReactNode }) {
  const router = useRouter();
  const { signedIn } = useAccount();

  useEffect(() => {
    if (signedIn !== false) return;
    const here = window.location.pathname + window.location.search;
    // Returning people (Enter a Gala) land on Log in; everyone else on Create account.
    router.replace(loginUrl(here, { tab: ctx === 'enter' || ctx === 'me' ? 'login' : 'create', ctx }));
  }, [signedIn, ctx, router]);

  if (!signedIn) return null;
  return <>{children}</>;
}
