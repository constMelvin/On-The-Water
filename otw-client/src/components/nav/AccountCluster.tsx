'use client';

import Link from 'next/link';
import { Icon, ThemeToggle } from '@/components/otw';
import { useAccount } from '@/lib/auth/session';
import { AccountMenu } from './AccountMenu';
import s from './nav.module.css';

/**
 * The signed-in cluster at the right of every header: Plan a Gala + Join a Gala (icon with small text on desktop),
 * My Galas, the theme switch, and the avatar menu (which holds Log out). On phones only the avatar menu shows;
 * Plan / Join move into it (and into the gala's More sheet) so the header never gets crowded.
 * `onColor` is for headers sitting on a brand-colour background (landing hero, Plan, Join).
 * Renders nothing when signed out (those screens have their own Log in / Create account).
 */
export function AccountCluster({ onColor }: { onColor?: boolean }) {
  const { signedIn } = useAccount();
  if (!signedIn) return null;

  return (
    <div className={`${s.cluster}${onColor ? ` ${s.onColor}` : ''}`}>
      <Link href="/plan" className={`${s.pill} ${s.desktopOnly}`} title="Plan a Gala" aria-label="Plan a Gala">
        <Icon name="plus" size={20} />
        <span>Plan</span>
      </Link>
      <Link href="/join" className={`${s.pill} ${s.desktopOnly}`} title="Join a Gala" aria-label="Join a Gala">
        <Icon name="enter" size={20} />
        <span>Join</span>
      </Link>
      <Link href="/me/galas" className={`${s.iconBtn} ${s.desktopOnly}`} title="My Galas" aria-label="My Galas">
        <Icon name="calendar" size={22} />
      </Link>
      <ThemeToggle className={`${s.iconBtn} ${s.desktopOnly}`} />
      <AccountMenu />
    </div>
  );
}
