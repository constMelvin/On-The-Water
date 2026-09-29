'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar, Button, Icon, Tag } from '@/components/otw';
import { FocusLayout } from '@/features/plan-a-gala';
import { G, demoGalaRecord } from '@/lib/otw/data';
import { burst, toast } from '@/lib/otw/feedback';
import {
  galaRoute,
  getGala,
  normCode,
  saveGala,
  setCurrentMember,
  type GalaRecord,
} from '@/lib/otw/gala-registry';
import './enter-a-gala.css';

const CODE_ERR = "Hmm, hindi namin makita 'yan. Check the code and try again.";
const PW_ERR = 'Hindi tugma ang password. Try again, or ask your Gala Leader.';
const DEV = process.env.NODE_ENV !== 'production';

/** OTW-XXXX as you type (reference input handler). */
function formatCode(v: string) {
  let s = v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
  if (s.length > 3) s = `${s.slice(0, 3)}-${s.slice(3)}`;
  return s;
}

/**
 * Enter a Gala: accountless people come back with Gala Code + Gala Password,
 * then say who they are. Works for leaders and members (reference views.enter).
 */
export function EnterGala({ initialCode = '' }: { initialCode?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(formatCode(initialCode));
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState<'' | 'code' | 'pw'>('');
  const [gala, setGala] = useState<GalaRecord | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    let rec = getGala(code);
    // Development only: the demo gala works without creating one first.
    if (!rec && DEV && normCode(code) === G.code) rec = saveGala(demoGalaRecord());
    if (!rec) {
      setErr('code');
      return;
    }
    // TODO(team): verify the password with the real API. Galas joined from another
    // device have no password stored here, so they can't be checked locally.
    if (rec.password !== undefined && pw !== rec.password) {
      setErr('pw');
      return;
    }
    setErr('');
    setGala(rec);
  };

  const pick = (name: string, role: 'leader' | 'member') => {
    if (!gala) return;
    setCurrentMember(gala.code, { name, role });
    toast(`Welcome back, ${name}.`);
    burst(window.innerWidth / 2, window.innerHeight * 0.4);
    router.push(galaRoute(gala.code));
  };

  if (gala) {
    return (
      <FocusLayout tone="blossom">
        <div className="wiz">
          <h1 className="h1 wq">Welcome back. Which one are you?</h1>
          <p className="sub">Pick your name so the gala knows it&apos;s you.</p>
          <div className="who">
            {gala.members.map((m) => (
              <button key={m.name} type="button" className="whob" onClick={() => pick(m.name, m.role)}>
                <Avatar name={m.name} tone={m.color} size={44} />
                <span>
                  {m.name}
                  {m.role === 'leader' && <Tag variant="zest">Leader</Tag>}
                </span>
              </button>
            ))}
          </div>
        </div>
      </FocusLayout>
    );
  }

  return (
    <FocusLayout tone="teal">
      <form onSubmit={submit} noValidate style={{ display: 'contents' }}>
        <div className="wiz narrow">
          <h1 className="h1 wq">Welcome back.</h1>
          <p className="sub">Enter the gala code and password to jump back in. Works for leaders and members.</p>
          <div className="wform">
            <label className="fl">
              Gala Code
              <input
                className={`in big code${err === 'code' ? ' bad' : ''}`}
                value={code}
                onChange={(e) => {
                  setCode(formatCode(e.target.value));
                  setErr('');
                }}
                placeholder="OTW-XXXX"
                maxLength={8}
                autoComplete="off"
                aria-invalid={err === 'code'}
                autoFocus={!initialCode}
              />
            </label>
            {err === 'code' && (
              <p className="ferr" role="alert">
                <Icon name="alert" size={18} />
                {CODE_ERR}
              </p>
            )}
            <label className="fl">
              Gala Password
              <div className="inwrap">
                <input
                  className={`in big${err === 'pw' ? ' bad' : ''}`}
                  type={showPw ? 'text' : 'password'}
                  value={pw}
                  onChange={(e) => {
                    setPw(e.target.value);
                    setErr('');
                  }}
                  autoComplete="current-password"
                  aria-invalid={err === 'pw'}
                  autoFocus={!!initialCode}
                />
                <button
                  type="button"
                  className="ibtn eye"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label="Show or hide password"
                >
                  <Icon name={showPw ? 'eyeoff' : 'eye'} size={22} />
                </button>
              </div>
            </label>
            {err === 'pw' && (
              <p className="ferr" role="alert">
                <Icon name="alert" size={18} />
                {PW_ERR}
              </p>
            )}
            {DEV && (
              <button
                type="button"
                className="chip"
                onClick={() => {
                  setCode(G.code);
                  setPw(G.pw);
                  setErr('');
                }}
              >
                <Icon name="sparkle" size={12} /> Demo: {G.code} / {G.pw}
              </button>
            )}
          </div>
          <p className="fine">
            Have an account?{' '}
            <Link className="lnk" href="/login">
              Log in
            </Link>{' '}
            and your saved galas will be waiting.
          </p>
        </div>
        <div className="fbar">
          <Button variant="ghost" onClick={() => router.push('/')}>
            Back
          </Button>
          <Button type="submit">Enter Gala</Button>
        </div>
      </form>
    </FocusLayout>
  );
}
