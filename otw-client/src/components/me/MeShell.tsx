'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Avatar, Button, Icon, ThemeToggle } from '@/components/otw';
import { useLogOut } from '@/components/gala/useLogOut';
import { useMyIdentity } from './useMyIdentity';
import styles from './me.module.css';
import profile from './profile.module.css';

type Page = 'galas' | 'history' | 'profile';

const PAGES: { page: Page; href: string; label: string }[] = [
  { page: 'galas', href: '/me/galas', label: 'My Galas' },
  { page: 'history', href: '/me/history', label: 'History' },
  { page: 'profile', href: '/me/profile', label: 'Profile' },
];

/** Page chrome shared by My Galas, History and Profile: brand, who's signed in, the other pages, log out. */
export function MeShell({ active, children }: { active: Page; children: ReactNode }) {
  const { id, name, tone, signedIn } = useMyIdentity();
  const logOut = useLogOut();

  return (
    <main className={`bg-cream ${styles.page}`}>
      <div className={styles.inner}>
        <header className={styles.top}>
          <Link href="/" className={styles.brand} aria-label="OTW home">
            <Icon name="pin" size={26} />
            <b>OTW</b>
          </Link>
          <div className={styles.topActions}>
            <ThemeToggle />
            {signedIn && (
              <Link
                href="/me/profile"
                className={profile.me}
                aria-label="Your profile"
                aria-current={active === 'profile' ? 'page' : undefined}
              >
                <Avatar name={name} tone={tone ?? 'rosy'} size={32} userId={id} />
                <span className={profile.meName}>Hi, {name}</span>
              </Link>
            )}
            {PAGES.filter((p) => p.page !== active).map((p) => (
              <Link key={p.page} className={`btn sm ghost ${styles.navLink}`} href={p.href}>
                {p.label}
              </Link>
            ))}
            <Link className="btn sm ghost" href="/">
              Back to OTW
            </Link>
            {signedIn && (
              <Button sm variant="cream" onClick={logOut}>
                <Icon name="back" size={16} /> Log out
              </Button>
            )}
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}
