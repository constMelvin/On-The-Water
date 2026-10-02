'use client';

import Link from 'next/link';
import { Icon } from '@/components/otw';
import { peso } from '@/lib/otw/data';
import { useGala } from '@/lib/otw/gala-store';
import { galaHref } from '../nav';
import s from './chat.module.css';

/** Zest "Locked in" bar at the top of the chat (reference .pinned). */
export function PinnedPlan({ stops, perPerson }: { stops: number; perPerson: number }) {
  const { gala } = useGala();
  const where = [gala.dest, `${stops} ${stops === 1 ? 'stop' : 'stops'}`, `${peso(perPerson)} each`].filter(Boolean);
  return (
    <div className={s.pinned}>
      <span className="ico sm">
        <Icon name="flag" size={18} />
      </span>
      <div>
        <b>Locked in: {gala.range || 'date TBD'}</b>
        <span>{where.join(' · ')}</span>
      </div>
      <Link className="lnk" href={galaHref(gala.code, 'route')}>
        View plan
      </Link>
    </div>
  );
}
