'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { burst } from '@/lib/otw/feedback';
import { Av, Icon } from './kit';
import b from './base.module.css';
import m from './modals.module.css';

const MOCK_CODE = 'OTW-7K2P-ABCD';

function Shell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('input, button')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      prev?.focus();
    };
  }, [onClose]);
  return (
    <div className={m.scrim} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={m.sheet} role="dialog" aria-modal="true" aria-label={title}>
        <button type="button" className={m.close} onClick={onClose} aria-label="Close">
          <Icon name="x" size={20} />
        </button>
        {children}
        <p className={m.proto}>Prototype: nothing was saved.</p>
      </div>
    </div>
  );
}

export function PlanModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [copied, setCopied] = useState(false);

  const next = (e: FormEvent) => {
    e.preventDefault();
    setStep((s) => s + 1);
  };
  const done = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top);
  };

  return (
    <Shell title="Plan a Gala" onClose={onClose}>
      <div className={m.dots} aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <i key={i} className={i <= step ? m.on : ''} />
        ))}
      </div>
      {step === 0 && (
        <form onSubmit={next} className={m.body}>
          <h3>Name your gala.</h3>
          <label className={m.field}>
            <span>What are we calling it?</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tagaytay Barkada" maxLength={40} required />
          </label>
          <button type="submit" className={`${b.btn} ${m.full}`}>
            Next <Icon name="arrow" size={20} />
          </button>
        </form>
      )}
      {step === 1 && (
        <form onSubmit={next} className={m.body}>
          <h3>When&apos;s the gala?</h3>
          <label className={m.field}>
            <span>Pick a date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <div className={m.row}>
            <button type="button" className={`${b.btn} ${b.btnGhost}`} onClick={() => setStep(0)}>
              Back
            </button>
            <button type="submit" className={`${b.btn} ${m.grow}`}>
              Create it
            </button>
          </div>
        </form>
      )}
      {step === 2 && (
        <div className={m.body}>
          <h3>{name || 'Your gala'} is ready.</h3>
          <p>Share this code. Friends join with it.</p>
          <button
            type="button"
            className={m.code}
            onClick={(e) => {
              setCopied(true);
              done(e);
            }}
          >
            <b>{MOCK_CODE}</b>
            <span>
              <Icon name={copied ? 'check' : 'copy'} size={16} /> {copied ? 'Copied (pretend)' : 'Tap to copy'}
            </span>
          </button>
          <button type="button" className={`${b.btn} ${b.btnZest} ${m.full}`} onClick={onClose}>
            Looks good
          </button>
        </div>
      )}
    </Shell>
  );
}

export function JoinModal({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState('');
  const [step, setStep] = useState(0);
  const [nick, setNick] = useState('');
  const valid = code.trim().length >= 6;

  return (
    <Shell title="Join a Gala" onClose={onClose}>
      {step === 0 && (
        <form
          className={m.body}
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) setStep(1);
          }}
        >
          <h3>Join a Gala.</h3>
          <label className={m.field}>
            <span>Gala code</span>
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={MOCK_CODE} maxLength={16} />
          </label>
          <button type="submit" className={`${b.btn} ${m.full}`} disabled={!valid}>
            Find it
          </button>
        </form>
      )}
      {step === 1 && (
        <form
          className={m.body}
          onSubmit={(e) => {
            e.preventDefault();
            setStep(2);
          }}
        >
          <div className={m.preview}>
            <b>Tagaytay Barkada</b>
            <small>Oct 24–25 · 4 people</small>
            <span className={m.avs}>
              <Av n="A" tone="rosy" size={30} />
              <Av n="B" tone="teal" size={30} />
              <Av n="C" tone="zest" size={30} />
            </span>
          </div>
          <label className={m.field}>
            <span>Gala password</span>
            <input type="password" placeholder="••••••" required />
          </label>
          <label className={m.field}>
            <span>Your nickname</span>
            <input value={nick} onChange={(e) => setNick(e.target.value)} placeholder="Ex. Dani" maxLength={20} required />
          </label>
          <button type="submit" className={`${b.btn} ${m.full}`}>
            Join
          </button>
        </form>
      )}
      {step === 2 && (
        <div className={m.body}>
          <h3>Welcome, {nick || 'friend'}.</h3>
          <p>You&apos;re in. Hanap ka na ng ambag mo.</p>
          <button type="button" className={`${b.btn} ${b.btnZest} ${m.full}`} onClick={onClose}>
            Open the gala
          </button>
        </div>
      )}
    </Shell>
  );
}
