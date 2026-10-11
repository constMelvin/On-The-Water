'use client';

import { requestLogOut } from '@/components/nav/logout';

/**
 * Log out, with a confirm first: this opens the "Sure ka na ba?" dialog (components/nav/LogoutDialog), which ends
 * the Supabase session, clears every cached query and goes back to the landing page once the person says yes.
 * Galas remembered on this device (otw:rooms) stay until My Galas reads /me/rooms (slice 2).
 */
export function useLogOut() {
  return requestLogOut;
}
