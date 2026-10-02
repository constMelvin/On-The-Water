'use client';

import { useRouter } from 'next/navigation';
import { mockSignOut } from '@/lib/otw/auth-mock';
import { toast } from '@/lib/otw/feedback';

/**
 * Log out: clears the (mock) session and goes back to the landing page.
 * Galas on this device (otw:rooms) stay, so they still show in My Galas after logging back in.
 * TODO(backend): real Supabase sign-out (supabase.auth.signOut) and clear cached "me" queries.
 */
export function useLogOut() {
  const router = useRouter();
  return () => {
    mockSignOut();
    toast('Naka-log out ka na. Balik ka anytime.');
    router.push('/');
  };
}
