'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSignedIn } from '@/lib/otw/auth-mock';

/** Which flow the person was starting; the login screen words its explanation from this. */
export type AccountContext = 'plan' | 'join' | 'enter';

/**
 * Gate for Plan a Gala, Join a Gala and Enter a Gala: without an account (mock flag for now)
 * it sends the person to Create account, remembering the page to come back to.
 *
 * TODO(backend): require real auth here (Supabase non-anonymous session), and enforce it
 * on the API as well. This client check can be bypassed.
 */
export function RequireAccount({ ctx, children }: { ctx: AccountContext; children: ReactNode }) {
  const router = useRouter();
  const signedIn = useSignedIn();

  useEffect(() => {
    if (signedIn !== false) return;
    const here = window.location.pathname + window.location.search;
    // Returning people (Enter a Gala) land on Log in; everyone else on Create account.
    const tab = ctx === 'enter' ? 'login' : 'create';
    router.replace(`/login?tab=${tab}&ctx=${ctx}&next=${encodeURIComponent(here)}`);
  }, [signedIn, ctx, router]);

  if (!signedIn) return null;
  return <>{children}</>;
}
