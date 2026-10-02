'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button, Icon } from '@/components/otw';
import { useAccount } from '@/lib/auth/session';
import { useLogOut } from '@/components/gala/useLogOut';
import styles from './me.module.css';

/** Page chrome shared by My Galas and History: brand, who's signed in, the other page, log out. */
export function MeShell({ active, children }: { active: 'galas' | 'history'; children: ReactNode }) {
  const { signedIn, displayName } = useAccount();
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
            {signedIn && <span className={styles.who}>Hi, {displayName}</span>}
            {active === 'galas' ? (
              <Link className={`btn sm ghost ${styles.navLink}`} href="/me/history">
                History
              </Link>
            ) : (
              <Link className={`btn sm ghost ${styles.navLink}`} href="/me/galas">
                My Galas
              </Link>
            )}
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
