'use client';

import { useAccount } from '@/lib/auth/session';
import type { Tone } from '@/lib/otw/data';
import { useProfile } from '@/lib/otw/profile';

/**
 * Who "I" am for the account buttons (sidebar, top bar, More sheet, page header): my account id, the name to show
 * (the profile nickname, else the account name) and my saved avatar colour. The photo itself is applied by
 * <Avatar userId={id}>. All of it updates the moment the profile is saved.
 * The profile itself is the account's server copy (GET/PUT /me/profile), cached on this device by lib/otw/profile.ts.
 */
export function useMyIdentity(): { id: string | null | undefined; name: string; tone: Tone | undefined; signedIn: boolean | undefined } {
  const { id, profile } = useProfile();
  const { signedIn, displayName } = useAccount();
  return { id, name: profile?.nickname || displayName || '?', tone: profile?.color, signedIn };
}
