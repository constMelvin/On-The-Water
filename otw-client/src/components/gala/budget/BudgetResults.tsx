'use client';

import Link from 'next/link';
import { Card } from '@/components/otw';
import { peso } from '@/lib/otw/data';
import { galaHref } from '../nav';
import type { BudgetLine } from './categories';
import s from './budget.module.css';

export interface BudgetResultsProps {
  /** The five defaults plus this device's custom categories, in bar order. */
  lines: BudgetLine[];
  /** Estimated total (pesos), including the custom lines. */
  total: number;
  /** total / max(1, people), half up. */
  perPerson: number;
  code: string;
}

/** Estimated total, per person, the category split bar + legend, and the way to Ambagan (reference updBud). */
export function BudgetResults({ lines, total, perPerson, code }: BudgetResultsProps) {
  return (
    <div className={s.results}>
      <Card tone="zest" className={`${s.big} ${s.cZest}`}>
        <span>Estimated total</span>
        <b>{peso(total)}</b>
      </Card>
      <Card tone="rosy" className={`${s.big} ${s.cRosy}`}>
        <span>Estimated per person</span>
        {/* No aria-live here: it would announce every keystroke. The "Budget updated." toast is the live region. */}
        <b>{peso(perPerson)}</b>
      </Card>
      <Card className={s.cTeal}>
        {/* Decorative: the legend below carries the same numbers as text. */}
        <div className={s.split} aria-hidden="true">
          {lines.map((l) => (
            <i key={l.key} className={l.color} style={{ width: `${total ? (l.amount / total) * 100 : 0}%` }} />
          ))}
        </div>
        <ul className={s.legend}>
          {lines.map((l) => (
            <li key={l.key}>
              <i className={l.color} aria-hidden="true" />
              <span className={s.lname}>{l.label}</span>
              <b>{peso(l.amount)}</b>
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
