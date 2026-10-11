'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AccountCluster } from '@/components/nav/AccountCluster';
import nav from '@/components/nav/nav.module.css';
import styles from './me.module.css';

type Page = 'galas' | 'history' | 'profile';

const PAGES: { page: Page; href: string; label: string }[] = [
  { page: 'galas', href: '/me/galas', label: 'My Galas' },
  { page: 'history', href: '/me/history', label: 'History' },
  { page: 'profile', href: '/me/profile', label: 'Profile' },
];

/** Page chrome shared by My Galas, History and Profile: the OTW logo (home), the account cluster, and the three pages as tabs. */
export function MeShell({ active, children }: { active: Page; children: ReactNode }) {
  return (
    <main className={`bg-cream ${styles.page}`}>
      <div className={styles.inner}>
        <header className={styles.top}>
          <Link href="/" className={styles.brand} aria-label="OTW home">
            <Image src="/otw-logo.svg" alt="OTW" width={1500} height={1027} className="logoimg" priority />
          </Link>
          <AccountCluster />
        </header>
        <nav className={nav.tabs} aria-label="Account pages">
          {PAGES.map((p) => (
            <Link
              key={p.page}
              className={nav.tab}
              href={p.href}
              aria-current={active === p.page ? 'page' : undefined}
            >
              {p.label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </main>
  );
}
