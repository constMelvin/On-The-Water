'use client';

import type { CSSProperties } from 'react';
import { Icon } from '@/components/otw';
import { counts, type AttendanceKey } from '@/lib/otw/data';
import type { IconName } from '@/lib/otw/icons';
import { useGala } from '@/lib/otw/gala-store';
import s from './attendance.module.css';

const TILES: [AttendanceKey, label: string, tone: string, icon: IconName][] = [
  ['g', 'going', 'c-teal', 'users'],
  ['m', 'maybe', 'c-zest', 'clock'],
  ['x', "can't make it", 'c-blossom', 'x'],
];

/** Going / maybe / can't make it totals, from the same members list as the dashboard. */
export function SummaryTiles() {
  const { members } = useGala();
  const c = counts(members);
  return (
    <div className={s.tiles}>
      {TILES.map(([k, label, tone, icon]) => {
        const pct = members.length ? (c[k] / members.length) * 100 : 0;
        return (
          <div key={k} className={`${s.tile} ${tone}`}>
            <span className={s.mark} aria-hidden="true">
              <Icon name={icon} size={64} />
            </span>
            <b>{c[k]}</b>
            <span className={s.lbl}>{label}</span>
            <i className={s.bar} style={{ '--p': `${pct}%` } as CSSProperties} aria-hidden="true" />
          </div>
        );
      })}
    </div>
  );
}
