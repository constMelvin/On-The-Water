'use client';

/**
 * Couple Mode. A couple gala is a room type (COUPLE, two members max), not a separate app: it keeps the
 * normal plan, budget, chat and Gala Dump, and adds couple-only features on this page.
 * Features: Our Little Bucket List, Halfway Checker and Who Knows Who Better?. A group gala sees a short
 * intro whose button plans a new couple gala.
 */
import Link from 'next/link';
import { useState } from 'react';
import { Avatar, Card, Icon, Tag, blob, type CardTone } from '@/components/otw';
import { useGala } from '@/lib/otw/gala-store';
import type { IconName } from '@/lib/otw/icons';
import { Skeleton } from '../States';
import { BucketList } from './BucketList';
import { Halfway } from './Halfway';
import { Quiz } from './Quiz';
import s from './couple.module.css';

type TabKey = 'bucket' | 'halfway' | 'quiz';
const TABS: [TabKey, string, IconName][] = [
  ['bucket', 'Bucket List', 'flag'],
  ['halfway', 'Halfway', 'pin'],
  ['quiz', 'Who Knows Who?', 'heart'],
];

export function Couple() {
  const { room, gala, memberRows, toneOf } = useGala();
  const [tab, setTab] = useState<TabKey>('bucket');

  if (!room) return <Skeleton label="Loading Couple Mode" />;
  if (room.type !== 'COUPLE') return <Intro />;

  const pair = memberRows.slice(0, 2);

  return (
    <>
      <header className={`${s.hero} bg-blossom`}>
        <div className={s.pair} aria-hidden={pair.length === 0}>
          {pair.map((m, i) => (
            <span key={m.userId} className={s.person}>
              {i === 1 && (
                <span className={s.heartb}>
                  <Icon name="heart" size={18} />
                </span>
              )}
              <Avatar name={m.nickname} tone={toneOf(m.userId)} size={52} userId={m.userId} />
            </span>
          ))}
        </div>
        <div className={s.heroText}>
          <h2 className="h2">{gala.title}</h2>
          <Tag variant="cream" icon="users">
            {pair.length === 2 ? 'Couple gala · 2 people' : 'Waiting for your partner'}
          </Tag>
        </div>
      </header>
      <div className={s.tabs} role="tablist" aria-label="Couple Mode">
        {TABS.map(([k, label, icon]) => (
          <button key={k} type="button" role="tab" id={`couple-tab-${k}`} aria-selected={tab === k} aria-controls="couple-panel" onClick={() => setTab(k)}>
            <Icon name={icon} size={18} /> {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="couple-panel" aria-labelledby={`couple-tab-${tab}`}>
        {tab === 'bucket' && <BucketList />}
        {tab === 'halfway' && <Halfway />}
        {tab === 'quiz' && <Quiz />}
      </div>
    </>
  );
}

/* ---------------- intro (group gala) ---------------- */

const PREVIEW: [IconName, string][] = [
  ['flag', 'Bucket list'],
  ['pin', 'Halfway checker'],
  ['heart', 'Who knows who?'],
];

function Intro() {
  return (
    <div className={s.intro}>
      <span className={`ico xl ${s.cel}`} style={blob(1)}>
        <Icon name="heart" size={44} />
      </span>
      <h2 className="h2">Just the two of you?</h2>
      <p className="sub">Start a couple gala with its own code and plan.</p>
      <div className={s.prev}>
        {PREVIEW.map(([icon, label], i) => (
          <Card key={label} tone={'blossom' as CardTone}>
            <div className="ico sm" style={blob(i)}>
              <Icon name={icon} size={20} />
            </div>
            <b>{label}</b>
          </Card>
        ))}
      </div>
      <Link className="btn rosy" href="/plan?type=couple">
        Start Couple Mode
      </Link>
    </div>
  );
}
