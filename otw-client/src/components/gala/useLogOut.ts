'use client';

import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth/session';
import { toast } from '@/lib/otw/feedback';

/**
 * Log out: ends the Supabase session, clears every cached query, and goes back to the landing page.
 * Galas remembered on this device (otw:rooms) stay until My Galas reads /me/rooms (slice 2).
 */
export function useLogOut() {
  const router = useRouter();
  return async () => {
    try {
      await signOut();
    } finally {
      toast('Naka-log out ka na. Balik ka anytime.');
      router.push('/');
    }
  };
}
