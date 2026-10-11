'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { Avatar, Icon } from '@/components/otw';
import { useMyIdentity } from '@/components/me/useMyIdentity';
import { setTheme, useTheme } from '@/lib/otw/theme';
import type { IconName } from '@/lib/otw/icons';
import { requestLogOut } from './logout';
import s from './nav.module.css';

const ITEMS: { href: string; label: string; icon: IconName; mobileOnly?: boolean }[] = [
  { href: '/plan', label: 'Plan a Gala', icon: 'plus', mobileOnly: true },
  { href: '/join', label: 'Join a Gala', icon: 'enter', mobileOnly: true },
  { href: '/me/galas', label: 'My Galas', icon: 'calendar' },
  { href: '/me/history', label: 'History', icon: 'clock' },
  { href: '/me/profile', label: 'Profile', icon: 'user' },
];

/**
 * The avatar button and its menu: the account's one home on every screen. Log out lives ONLY here (it opens the
 * "Sure ka na ba?" confirm), so it is always reachable without a loose icon that could be hit by accident.
 */
export function AccountMenu() {
  const { id, name, tone } = useMyIdentity();
  const { resolved } = useTheme();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const items = () => Array.from(wrap.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    items()[0]?.focus();

    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        btn.current?.focus();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const list = items();
        const at = list.indexOf(document.activeElement as HTMLElement);
        const next = e.key === 'ArrowDown' ? (at + 1) % list.length : (at - 1 + list.length) % list.length;
        list[next]?.focus();
      } else if (e.key === 'Tab') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toDark = resolved === 'light';

  return (
    <div className={s.menuWrap} ref={wrap}>
      <button
        ref={btn}
        type="button"
        className={s.avatarBtn}
        aria-label={`Account menu, ${name}`}
        title={name}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar name={name} tone={tone ?? 'rosy'} size={34} userId={id} />
        <Icon name="chevd" size={16} />
      </button>

      {open && (
        <div id={menuId} className={s.menu} role="menu" aria-label="Account">
          <p className={s.menuHead}>Hi, {name}</p>
          {ITEMS.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              role="menuitem"
              className={`${s.menuItem}${it.mobileOnly ? ` ${s.mobileOnly}` : ''}`}
              onClick={() => setOpen(false)}
            >
              <Icon name={it.icon} size={20} />
              {it.label}
            </Link>
          ))}
          <button
            type="button"
            role="menuitem"
            className={s.menuItem}
            onClick={() => {
              setTheme(toDark ? 'dark' : 'light');
              setOpen(false);
            }}
          >
            <Icon name={toDark ? 'moon' : 'sun'} size={20} />
            {toDark ? 'Dark mode' : 'Light mode'}
          </button>
          <hr className={s.menuRule} />
          <button
            type="button"
            role="menuitem"
            className={`${s.menuItem} ${s.menuLogout}`}
            onClick={() => {
              setOpen(false);
              requestLogOut();
            }}
          >
            <Icon name="logout" size={20} />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
