'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Button, Icon } from '@/components/otw';
import { requestPasswordReset } from '@/lib/auth/recovery';
import { burstEl, toast } from '@/lib/otw/feedback';
import styles from '../login/login.module.css';

/** Seconds before "Resend email" works again (Supabase rate-limits auth emails). */
const RESEND_WAIT = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Forgot password: Supabase emails a link to /reset-password. The sent screen never says whether
 * the email has an account, so this page can't be used to find out who is registered.
 */
export function ForgotPasswordScreen({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const send = async (to: string) => {
    setBusy(true);
    setError('');
    try {
      await requestPasswordReset(to);
      setSentTo(to);
      setWait(RESEND_WAIT);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTW couldn’t finish that just now. Try again in a moment.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    if (!EMAIL_RE.test(email.trim())) return setError('Enter a valid email address.');
    const button = e.currentTarget.querySelector('button[type="submit"]');
    if (await send(email.trim())) burstEl(button);
  };

  const resend = async () => {
    if (busy || wait > 0) return;
    if (await send(sentTo)) toast('Sent again. Check your inbox.');
  };

  return (
    <main className={`bg-blossom ${styles.page}`}>
      <Link className={`btn sm cream ${styles.back}`} href="/login">
        <Icon name="back" size={18} /> Back to log in
      </Link>
      <div className={`${styles.main} ${styles.solo}`}>
        {sentTo ? (
          <section className={styles.sent} aria-live="polite">
            <span className={styles.sentIcon} aria-hidden="true">
              <Icon name="mail" size={44} />
            </span>
            <h1 className={styles.heading}>Check your email!</h1>
            <p className={styles.sub}>
              If <b className={styles.sentTo}>{sentTo}</b> has an OTW account, we sent it a link to set a new password.
            </p>
            <p className="fine">Not there? Check Spam or Promotions. It can take a minute.</p>

            {error && (
              <p className="ferr" role="alert">
                <Icon name="alert" size={18} />
                {error}
              </p>
            )}

            <div className={styles.actions}>
              <Button variant="rosy" onClick={resend} disabled={busy || wait > 0}>
                <Icon name="refresh" size={20} /> {wait > 0 ? `Resend in ${wait}s` : 'Resend email'}
              </Button>
              <Link className="lnk" href="/login">
                Back to log in
              </Link>
            </div>
          </section>
        ) : (
          <>
            <h1 className={styles.heading}>Forgot your password?</h1>
            <p className={styles.sub}>Happens to the best of us. We’ll email you a link to set a new one.</p>

            <form className={styles.form} onSubmit={submit} noValidate>
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
                  autoFocus
                />
              </label>

              {error && (
                <p className="ferr" role="alert">
                  <Icon name="alert" size={18} />
                  {error}
                </p>
              )}

              <div className={styles.actions}>
                <Button type="submit" variant="rosy" disabled={busy}>
                  Send reset link
                </Button>
                <Link className="lnk" href="/login">
                  Remembered it? Log in
                </Link>
              </div>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
