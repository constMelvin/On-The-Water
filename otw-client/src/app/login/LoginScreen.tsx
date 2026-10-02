'use client';

import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Icon } from '@/components/otw';
import { signIn, signUp, useAccount } from '@/lib/auth/session';
import { burstEl, toast } from '@/lib/otw/feedback';
import styles from './login.module.css';

type Tab = 'login' | 'create';
type Ctx = 'plan' | 'join' | 'enter' | 'me' | '';

/** Why we're asking, by what the person was about to do (OTW voice: clear first, a little playful). */
const CTX_BAR: Record<Exclude<Ctx, ''>, string> = {
  plan: 'Account first, then back to planning your gala.',
  join: 'Account first, then back to joining your gala.',
  enter: 'Log in, then we’ll take you back to your gala.',
  me: 'Log in, then we’ll take you to your galas.',
};

const CREATE_SUB: Record<Ctx, string> = {
  plan: 'Just once. Then turn “G tayo?” into an actual plan.',
  join: 'Just once. Then jump in with your friends.',
  enter: 'Just once. Then let’s go.',
  me: 'Just once. Then let’s go.',
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

const PASSWORD_MIN = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface LoginScreenProps {
  initialTab: Tab;
  ctx: Ctx;
  /** Where to go after signing in (already checked to be a same-site path). */
  next: string;
  /** Legacy: a gala code to save, from the old "Create an Account" links. */
  gala?: string;
}

/**
 * Log in / Create account with Supabase email + password (account required for everything).
 */
export function LoginScreen({ initialTab, ctx, next, gala }: LoginScreenProps) {
  const router = useRouter();
  const { signedIn } = useAccount();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const create = tab === 'create';

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    if (create && !name.trim()) return setError('We need something to call you.');
    if (!EMAIL_RE.test(email.trim())) return setError('Enter a valid email address.');
    if (!password) return setError('Enter your password.');
    if (create && password.length < PASSWORD_MIN) return setError(`Make it at least ${PASSWORD_MIN} characters.`);
    setError('');
    setBusy(true);
    const button = e.currentTarget.querySelector('button[type="submit"]');
    try {
      if (create) await signUp(name, email, password);
      else await signIn(email, password);
      toast(create ? 'Account created. Let’s go.' : 'Welcome back.');
      burstEl(button);
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    setError('');
  };

  const bar = ctx ? CTX_BAR[ctx] : gala ? `Saving ${gala} to your account.` : '';

  // Already signed in: skip the form and go ahead (to ?next=, else My Galas; see page.tsx).
  useEffect(() => {
    if (signedIn) router.replace(next);
  }, [signedIn, next, router]);

  // Nothing while checking, or while redirecting a signed-in person, so the form never flashes.
  if (signedIn !== false) return null;

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
              Email
              <input
                className="in"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="you@email.com"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                inputMode="email"
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
              {create && (
                <span className="fine" style={{ fontWeight: 700 }}>
                  At least 8 characters.
                </span>
              )}
            </label>

            {error && (
              <p className="ferr" role="alert">
                <Icon name="alert" size={18} />
                {error}
              </p>
            )}

            <div className={styles.actions}>
              <Button type="submit" variant="rosy" disabled={busy}>
                {create ? 'Create an Account' : 'Log in'}
              </Button>
              <button type="button" className="lnk" onClick={() => switchTab(create ? 'login' : 'create')}>
                {create ? 'Already have an account? Log in' : 'New here? Create an account'}
              </button>
            </div>
            {create && <p className="fine">Just an email and a password. We won’t ask for your life story.</p>}
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
