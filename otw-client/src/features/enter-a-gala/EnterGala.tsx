'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, Button, Icon, Tag } from '@/components/otw';
import { FocusLayout } from '@/features/plan-a-gala';
import { burst, toast } from '@/lib/otw/feedback';
import { galaRoute, isValidCode, normCode, rememberRoom } from '@/lib/otw/gala-registry';
import type { Tone } from '@/lib/otw/data';
import { isApiError } from '@/lib/api/client';
import { claimMember, enterRoom, type EnterRoomResponse } from '@/lib/api/rooms';
import './enter-a-gala.css';

const CODE_ERR = "Hmm, hindi namin makita 'yan. Check the code and try again.";
const PW_ERR = 'Hindi tugma ang password. Try again, or ask your Gala Leader.';
const TONES: Tone[] = ['rosy', 'teal', 'zest', 'blossom'];

/** OTW-XXXX-XXXX as you type. */
function formatCode(v: string) {
  let s = v.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!s.startsWith('OTW')) s = 'OTW' + s;
  s = s.slice(0, 11);
  return [s.slice(0, 3), s.slice(3, 7), s.slice(7)].filter(Boolean).join('-');
}

/**
 * Enter a Gala: get back into a gala on this device (new phone, cleared browser) with
 * Gala Code + Gala Password (POST /rooms/enter). Requires an account (app/enter/layout.tsx).
 * "Which one are you?" (POST /rooms/enter/claim) is the LEGACY path for members who joined
 * anonymously, before accounts were required.
 */
export function EnterGala({ initialCode = '' }: { initialCode?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode ? formatCode(initialCode) : '');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState<'' | 'code' | 'pw' | 'other'>('');
  const [errMsg, setErrMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [gala, setGala] = useState<EnterRoomResponse | null>(null);

  const fail = (e: unknown) => {
    if (isApiError(e, 'INVALID_CODE') || isApiError(e, 'ROOM_NOT_FOUND')) setErr('code');
    else if (isApiError(e, 'INVALID_GALA_PASSWORD')) setErr('pw');
    else {
      setErr('other');
      setErrMsg(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    }
  };

  const open = (roomId: string, name?: string) => {
    rememberRoom(code, roomId);
    toast(name ? `Welcome back, ${name}.` : 'Welcome back.');
    burst(window.innerWidth / 2, window.innerHeight * 0.4);
    router.push(galaRoute(code));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!isValidCode(code)) {
      setErr('code');
      return;
    }
    setErr('');
    setBusy(true);
    try {
      const res = await enterRoom(normCode(code), pw);
      if (res.alreadyMember) open(res.roomId);
      else setGala(res);
    } catch (e2) {
      fail(e2);
    } finally {
      setBusy(false);
    }
  };

  const pick = async (memberId: string, name: string) => {
    if (!gala || busy) return;
    setBusy(true);
    try {
      await claimMember(normCode(code), pw, memberId);
      open(gala.roomId, name);
    } catch (e) {
      toast(
        isApiError(e, 'MEMBER_HAS_ACCOUNT')
          ? `May account na si ${name}. Mag-log in sa account na 'yan.`
          : e instanceof Error
            ? e.message
            : "Couldn't pick that member.",
        'err'
      );
    } finally {
      setBusy(false);
    }
  };

  if (gala) {
    return (
      <FocusLayout tone="blossom">
        <div className="wiz">
          <Tag variant="cream" icon="clock">
            Dating member na walang account
          </Tag>
          <h1 className="h1 wq">Which one are you?</h1>
          <p className="sub">
            Sumali ka dati nang walang account? Piliin ang pangalan mo para ma-link sa account mo.
          </p>
          <div className="who">
            {gala.members.map((m, i) => (
              <button
                key={m.memberId}
                type="button"
                className="whob"
                disabled={busy || m.hasAccount}
                title={m.hasAccount ? "May account na 'to. Mag-log in sa account na 'yan." : undefined}
                onClick={() => pick(m.memberId, m.nickname)}
              >
                <Avatar name={m.nickname} tone={TONES[i % TONES.length]} size={44} />
                <span>
                  {m.nickname}
                  {m.role === 'HOST' && <Tag variant="zest">Leader</Tag>}
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
          <p className="sub">Bagong device? Ilagay ang Gala Code at Gala Password para makabalik ka sa gala.</p>
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
                placeholder="OTW-XXXX-XXXX"
                maxLength={13}
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
            {err === 'other' && (
              <p className="ferr" role="alert">
                <Icon name="alert" size={18} />
                {errMsg}
              </p>
            )}
          </div>
          <p className="fine">
            Naka-save na sa account mo ang mga gala mo. Gamitin lang &apos;to kung hindi pa lumalabas dito ang gala.
          </p>
        </div>
        <div className="fbar">
          <Button variant="ghost" onClick={() => router.push('/')}>
            Back
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Checking…' : 'Enter Gala'}
          </Button>
        </div>
      </form>
    </FocusLayout>
  );
}
