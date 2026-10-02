'use client';

import Link from 'next/link';
import { Card } from '@/components/otw';
import { peso } from '@/lib/otw/data';
import type { BudgetVM } from '@/lib/otw/mock/types';
import { galaHref } from '../nav';
import { CATS } from './categories';
import s from './budget.module.css';

/** Estimated total, per person, the category split bar + legend, and the way to Ambagan (reference updBud). */
export function BudgetResults({ value, code }: { value: BudgetVM; code: string }) {
  const tot = value.estimatedAmount;
  return (
    <div className={s.results}>
      <Card tone="zest" className={s.big}>
        <span>Estimated total</span>
        <b>{peso(tot)}</b>
      </Card>
      <Card tone="rosy" className={s.big}>
        <span>Estimated per person</span>
        {/* No aria-live here: it would announce every keystroke. The "Budget updated." toast is the live region. */}
        <b>{peso(value.perPerson)}</b>
      </Card>
      <Card>
        {/* Decorative: the legend below carries the same numbers as text. */}
        <div className={s.split} aria-hidden="true">
          {CATS.map(([k, , , color]) => (
            <i key={k} className={color} style={{ width: `${tot ? (value[k] / tot) * 100 : 0}%` }} />
          ))}
        </div>
        <ul className={s.legend}>
          {CATS.map(([k, label, , color]) => (
            <li key={k}>
              <i className={color} aria-hidden="true" />
              {label}
              <b>{peso(value[k])}</b>
            </li>
          ))}
        </ul>
      </Card>
      <Link className={`lnk ${s.ambagan}`} href={galaHref(code, 'ambagan')}>
        Ready to track real spending? Go to Ambagan
      </Link>
    </div>
  );
}
