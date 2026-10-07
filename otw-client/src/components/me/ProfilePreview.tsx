'use client';

import type { CSSProperties, PointerEvent } from 'react';
import { Avatar, Tag } from '@/components/otw';
import type { Tone } from '@/lib/otw/data';
import s from './profile-preview.module.css';

const TONE_VAR: Record<Tone, string> = {
  rosy: 'var(--rosy)',
  teal: 'var(--teal)',
  zest: 'var(--zest)',
  blossom: 'var(--blossom)',
};

/** The colour's "vibe" (new copy; easy to change). */
const VIBE: Record<Tone, string> = {
  rosy: 'Main character',
  teal: 'Chill lang',
  zest: 'Masaya vibes',
  blossom: 'Malambing',
};

/** Slow brand shapes drifting behind the card (decorative; CSS handles motion + reduced motion). */
const DRIFT: { shape: 'spark' | 'ring' | 'blob'; left: string; top: string; size: number; color: string; dur: number }[] = [
  { shape: 'spark', left: '4%', top: '6%', size: 46, color: 'var(--zest)', dur: 15 },
  { shape: 'ring', left: '86%', top: '12%', size: 54, color: 'var(--teal)', dur: 19 },
  { shape: 'blob', left: '-2%', top: '58%', size: 78, color: 'var(--blossom)', dur: 22 },
  { shape: 'spark', left: '90%', top: '66%', size: 34, color: 'var(--rosy)', dur: 17 },
  { shape: 'ring', left: '44%', top: '94%', size: 38, color: 'var(--zest)', dur: 21 },
];

export interface ProfilePreviewProps {
  /** What the group chat will call you (profile nickname, else account name). */
  name: string;
  status: string;
  tone: Tone;
  photo?: string;
  /** Bumps on every save so the card gives a little pop. */
  popKey: number;
}

/**
 * "Ganito ka makita ng GC": a live preview of the profile being edited. It reads the form's current values (not the
 * saved ones), and shows the look in the places it will appear: member list, chat, map pin and the top bar.
 * TODO(backend): others only see this once the profile API carries nickname / photo / colour / status.
 */
export function ProfilePreview({ name, status, tone, photo, popKey }: ProfilePreviewProps) {
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  const msg = status.trim();

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--ry', `${((e.clientX - r.left) / r.width - 0.5) * 8}deg`);
    e.currentTarget.style.setProperty('--rx', `${((e.clientY - r.top) / r.height - 0.5) * -6}deg`);
  };
  const onLeave = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.style.removeProperty('--rx');
    e.currentTarget.style.removeProperty('--ry');
  };

  return (
    <aside className={s.stage} style={{ '--tone': TONE_VAR[tone] } as CSSProperties} aria-label="Live preview of your profile">
      <div className={s.drift} aria-hidden="true">
        {DRIFT.map((d, i) => (
          <span
            key={i}
            className={s.shape}
            style={{ left: d.left, top: d.top, width: d.size, height: d.size, color: d.color, '--dur': `${d.dur}s` } as CSSProperties}
          >
            <svg viewBox="0 0 24 24" width="100%" height="100%" focusable="false">
              {d.shape === 'spark' && <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" fill="currentColor" />}
              {d.shape === 'ring' && <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="3.4" />}
              {d.shape === 'blob' && (
                <path d="M13 2C19 1 23 6 22 12c-1 6-6 10-12 9C5 20 1 15 2 10 3 5 8 2 13 2Z" fill="currentColor" />
              )}
            </svg>
          </span>
        ))}
      </div>

      <div className={s.float}>
        <div className={s.tilt} onPointerMove={onMove} onPointerLeave={onLeave}>
          <section className={`${s.card}${popKey > 0 ? ` ${s.popped}` : ''}`} key={popKey}>
            <p className={s.kicker}>Ganito ka makita ng GC</p>

            <div className={s.hero}>
              <div className={s.avatarWrap}>
                <i className={s.glow} aria-hidden="true" />
                {/* Replays on every colour change: a ring that expands and fades. */}
                <i key={tone} className={s.pulse} aria-hidden="true" />
                <Avatar name={name} tone={tone} photo={photo} size={116} />
              </div>
              <h3 className={s.name}>{name}</h3>
              <Tag variant={tone} icon="sparkle">
                {VIBE[tone]}
              </Tag>
              <p className={s.bubble}>{msg || <span className={s.ph}>Always late pero sumusipot</span>}</p>
            </div>

            <div className={s.grid}>
              <div className={s.mini}>
                <span className={s.mlab}>Member list</span>
                <div className={s.mrow}>
                  <Avatar name={name} tone={tone} photo={photo} size={36} />
                  <span className={s.mname}>{name} (you)</span>
                </div>
                <Tag variant="st-g" icon="check">
                  I&apos;m G
                </Tag>
              </div>

              <div className={s.mini}>
                <span className={s.mlab}>GC chat</span>
                <div className={s.chat}>
                  <Avatar name={name} tone={tone} photo={photo} size={30} />
                  <div className={s.bub}>
                    <b>{name}</b>
                    <p>{msg || 'G ako!'}</p>
                  </div>
                </div>
              </div>

              <div className={s.mini}>
                <span className={s.mlab}>On the map</span>
                <div className={s.pinbox}>
                  <span className={`${s.drop} c-${tone}`}>
                    <b>{initial}</b>
                  </span>
                  <i className={s.ground} aria-hidden="true" />
                </div>
              </div>

              <div className={s.mini}>
                <span className={s.mlab}>Top bar</span>
                <span className={s.chip}>
                  <Avatar name={name} tone={tone} photo={photo} size={28} />
                  <b>{name}</b>
                </span>
              </div>
            </div>

            <p className={s.note}>
              Your gala name still comes from that gala&apos;s Settings. Others see this look once profiles sync.
            </p>
          </section>
        </div>
      </div>
    </aside>
  );
}
