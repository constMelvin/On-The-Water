'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Icon } from '@/components/otw';
import { supabase } from '@/lib/api/supabase';
import { updatePassword } from '@/lib/auth/recovery';
import { burstEl, toast } from '@/lib/otw/feedback';
import styles from '../login/login.module.css';

const PASSWORD_MIN = 8;

/**
 * Set a new password. The reset link signs the person in with a recovery session (the Supabase
 * client reads it from the URL); without a session the link was expired, used or opened elsewhere.
 * Not part of LoginScreen: that one sends signed-in people away, and a recovery session is signed in.
 */
export function ResetPasswordScreen() {
  const router = useRouter();
  const [state, setState] = useState<'checking' | 'ready' | 'invalid'>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    // getSession waits for the client to finish reading the link's tokens from the URL.
    supabase()
      .auth.getSession()
      .then(({ data }) => alive && setState(data.session ? 'ready' : 'invalid'))
      .catch(() => alive && setState('invalid'));
    const { data } = supabase().auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) setState('ready');
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    if (password.length < PASSWORD_MIN) return setError(`Make it at least ${PASSWORD_MIN} characters.`);
    if (password !== confirm) return setError('Those passwords don’t match.');
    setError('');
    setBusy(true);
    const button = e.currentTarget.querySelector('button[type="submit"]');
    try {
      await updatePassword(password);
      burstEl(button);
      toast('Password updated. You’re in.');
      router.replace('/me/galas');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTW couldn’t finish that just now. Try again in a moment.');
      setBusy(false);
    }
  };

  if (state === 'checking') return null;

  return (
    <main className={`bg-blossom ${styles.page}`}>
      <Link className={`btn sm cream ${styles.back}`} href="/">
        <Icon name="back" size={18} /> Back to OTW
      </Link>
      <div className={`${styles.main} ${styles.solo}`}>
        {state === 'invalid' ? (
          <section className={styles.sent}>
            <span className={styles.sentIcon} aria-hidden="true">
              <Icon name="alert" size={44} />
            </span>
            <h1 className={styles.heading}>Hala, expired na yata.</h1>
            <p className={styles.sub}>This reset link is expired or already used. Ask for a new one.</p>
            <p className="fine">Open the newest email, in the same browser where you asked for it.</p>
            <div className={styles.actions}>
              <Link className="btn rosy" href="/forgot-password">
                Send a new link
              </Link>
              <Link className="lnk" href="/login">
                Back to log in
              </Link>
            </div>
          </section>
        ) : (
          <>
            <h1 className={styles.heading}>Set a new password.</h1>
            <p className={styles.sub}>Pick something you’ll remember this time.</p>

            <form className={styles.form} onSubmit={submit} noValidate>
              <label className="fl">
                New password
                <div className="inwrap">
                  <input
                    className="in"
                    type={show ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    autoComplete="new-password"
                    autoFocus
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
                <span className="fine" style={{ fontWeight: 700 }}>
                  At least 8 characters.
                </span>
              </label>
              <label className="fl">
                Confirm new password
                <input
                  className="in"
                  type={show ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    setError('');
                  }}
                  autoComplete="new-password"
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
                  Save new password
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
