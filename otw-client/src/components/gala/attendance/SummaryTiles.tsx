'use client';

import { blob } from '@/components/otw';
import { counts, type AttendanceKey } from '@/lib/otw/data';
import { useGala } from '@/lib/otw/gala-store';
import s from './attendance.module.css';

const TILES: [AttendanceKey, label: string, tone: string][] = [
  ['g', 'going', 'c-teal'],
  ['m', 'maybe', 'c-zest'],
  ['x', "can't make it", 'c-blossom'],
];

/** Going / maybe / can't make it totals, from the same members list as the dashboard. */
export function SummaryTiles() {
  const { members } = useGala();
  const c = counts(members);
  return (
    <div className={s.tiles}>
      {TILES.map(([k, label, tone], i) => (
        <div key={k} className={`${s.tile} ${tone}`} style={blob(i + 1)}>
          <b>{c[k]}</b>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
