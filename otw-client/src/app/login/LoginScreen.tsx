'use client';

import { useState, type CSSProperties, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Icon } from '@/components/otw';
import { mockSignIn } from '@/lib/otw/auth-mock';
import { burstEl, toast } from '@/lib/otw/feedback';
import styles from './login.module.css';

type Tab = 'login' | 'create';
type Ctx = 'plan' | 'join' | 'enter' | '';

/** Why we're asking, by what the person was about to do (OTW voice: clear first, a little playful). */
const CTX_BAR: Record<Exclude<Ctx, ''>, string> = {
  plan: 'Account first, then back to planning your gala.',
  join: 'Account first, then back to joining your gala.',
  enter: 'Log in, then we’ll take you back to your gala.',
};

const CREATE_SUB: Record<Ctx, string> = {
  plan: 'Just once. Then turn “G tayo?” into an actual plan.',
  join: 'Just once. Then jump in with your friends.',
  enter: 'Just once. Then let’s go.',
  '': 'Just once. Then let’s go.',
};

/** What an account keeps for you. Written into the planner card, one line at a time. */
const PLANNER_ITEMS = [
  'Saved galas',
  'Personal gala calendar',
  'Gala history',
  'Reminders, even when you’re not in OTW',
  'Your galas on any device',
];

const USERNAME_MAX = 20;
/** 3 to 20 letters, numbers or underscores (checked on Create account only). */
const USERNAME = /^[A-Za-z0-9_]{3,20}$/;

interface LoginScreenProps {
  initialTab: Tab;
  ctx: Ctx;
  /** Where to go after signing in (already checked to be a same-site path). */
  next: string;
  /** Legacy: a gala code to save, from the old "Create an Account" links. */
  gala?: string;
}

/**
 * Log in / Create account. Mock for now: any valid-looking details sign this device in.
 * TODO(backend): require real auth here. Call Supabase signUp / signInWithPassword and map
 * its errors to friendly copy (wrong password, username already taken).
 */
export function LoginScreen({ initialTab, ctx, next, gala }: LoginScreenProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const create = tab === 'create';

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (create && !name.trim()) return setError('We need something to call you.');
    if (create ? !USERNAME.test(username.trim()) : !username.trim()) {
      return setError(create ? 'Pick a username: 3 to 20 letters, numbers or underscores.' : 'Enter your username.');
    }
    if (password.length < 6) return setError('Make it at least 6 characters.');
    setError('');
    // TODO(backend): replace email with username in the auth payload. This is where the real
    // Supabase signUp (name, username, password) / signInWithPassword (username, password) call goes.
    mockSignIn(create ? name.trim() : username.trim());
    toast(create ? 'Account created. Let’s go.' : 'Welcome back.');
    burstEl(e.currentTarget.querySelector('button[type="submit"]'));
    router.replace(next);
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    setError('');
  };

  const bar = ctx ? CTX_BAR[ctx] : gala ? `Saving ${gala} to your account.` : '';

  return (
    <main className={`bg-blossom ${styles.page}`}>
      <div className={styles.wrap}>
        <div className={styles.main}>
          <Link className="btn sm cream" href="/">
            <Icon name="back" size={18} /> Back to OTW
          </Link>

          <div className="seg" role="tablist" aria-label="Account">
            <button type="button" role="tab" aria-selected={!create} aria-pressed={!create} onClick={() => switchTab('login')}>
              Log in
            </button>
            <button type="button" role="tab" aria-selected={create} aria-pressed={create} onClick={() => switchTab('create')}>
              Create account
            </button>
          </div>

          {bar && (
            <div className={styles.ctx} role="note">
              <Icon name="sparkle" size={18} />
              <span>{bar}</span>
            </div>
          )}

          <h1 className={styles.heading}>
            {create ? 'Create an account to save your gala.' : 'Welcome back.'}
          </h1>
          <p className={styles.sub}>
            {create ? CREATE_SUB[ctx] : 'Your galas are right where you left them.'}
          </p>

          <form className={styles.form} onSubmit={submit} noValidate>
            {create && (
              <label className="fl">
                Name
                <input
                  className="in"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError('');
                  }}
                  placeholder="What should the GC call you?"
                  autoComplete="name"
                  maxLength={40}
                />
              </label>
            )}
            <label className="fl">
              Username
              <input
                className="in"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                placeholder="Pumili ng username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={USERNAME_MAX}
              />
            </label>
            <label className="fl">
              Password
              <div className="inwrap">
                <input
                  className="in"
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  autoComplete={create ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  className="ibtn eye"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? 'Hide password' : 'Show password'}
                  aria-pressed={show}
                >
                  <Icon name={show ? 'eyeoff' : 'eye'} size={22} />
                </button>
              </div>
            </label>

            {error && (
              <p className="ferr" role="alert">
                <Icon name="alert" size={18} />
                {error}
              </p>
            )}

            <div className={styles.actions}>
              <Button type="submit" variant="rosy">
                {create ? 'Create an Account' : 'Log in'}
              </Button>
              <button type="button" className="lnk" onClick={() => switchTab(create ? 'login' : 'create')}>
                {create ? 'Already have an account? Log in' : 'New here? Create an account'}
              </button>
            </div>
            {create && <p className="fine">Just a username and a password. We won’t ask for your life story.</p>}
          </form>
        </div>

        <aside className={styles.planner} aria-label="What your account keeps for you">
          <div className={styles.rings} aria-hidden="true">
            {Array.from({ length: 7 }, (_, i) => (
              <i key={i} />
            ))}
          </div>
          <header className={styles.plannerHead}>
            <span className={styles.plannerIcon} aria-hidden="true">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4.5" y="4" width="15" height="17" rx="3" />
                <path d="M9 2.5v3M15 2.5v3" />
                <path d="M8.5 11h7M8.5 14.5h4" />
                <path d="M14 17.8l1.6 1.6 3-3.2" />
              </svg>
            </span>
            <div>
              <b>Your gala planner</b>
              <span>One account. Everything in one place.</span>
            </div>
          </header>
          <ul className={styles.plannerList}>
            {PLANNER_ITEMS.map((text, i) => (
              <li key={text} style={{ '--i': i } as CSSProperties}>
                <span className={styles.tick} aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} />
                  </svg>
                </span>
                <span className={styles.written}>{text}</span>
              </li>
            ))}
          </ul>
          <p className={styles.plannerNote} style={{ '--i': PLANNER_ITEMS.length } as CSSProperties}>
            <span className={styles.written}>One account, no matter how many galas you plan or join.</span>
          </p>
        </aside>
      </div>
    </main>
  );
}
