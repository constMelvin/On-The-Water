'use client';

import { Avatar, Button, Card, Icon, Tag } from '@/components/otw';
import { peso, type Member } from '@/lib/otw/data';
import { nameOf } from '@/lib/otw/mock';
import { CATEGORY_LABEL } from '@/lib/otw/mock/expenses';
import type { ExpenseVM } from '@/lib/otw/mock/types';
import s from './expenses.module.css';

// Dates read like the reference ("Sep 20"), in Manila time so the server and browser agree.
const TZ = 'Asia/Manila';
const fmtDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: TZ });

/** "Today" for something added today (reference save-exp), otherwise "Sep 20". */
const dayLabel = (iso: string): string => {
  const d = new Date(iso);
  return fmtDay.format(d) === fmtDay.format(new Date()) && Math.abs(Date.now() - d.getTime()) < 36 * 3600_000
    ? 'Today'
    : fmtDay.format(d);
};

export interface ExpenseListProps {
  items: ExpenseVM[];
  members: Member[];
  onAdd: () => void;
}

/** "Expenses" card (reference .elist): payer avatar, name, category tag, split note, amount. */
export function ExpenseList({ items, members, onAdd }: ExpenseListProps) {
  return (
    <Card>
      <div className="rh">
        <h3>Expenses</h3>
        <Button sm className="hide-m" onClick={onAdd}>
          <Icon name="plus" size={18} /> Add expense
        </Button>
      </div>
      <ul className={s.elist}>
        {items.map((e) => {
          const who = nameOf(e.paidBy);
          return (
            <li key={e.id} className={s.erow}>
              <Avatar name={who} tone={members.find((m) => m.n === who)?.c} size={34} />
              <div className={s.eb}>
                <b>{e.description}</b>
                <span>
                  <Tag variant="blossom">{CATEGORY_LABEL[e.category]}</Tag>
                  Paid by {who} · {dayLabel(e.createdAt)} · split {e.shares.length} ways
                </span>
              </div>
              <b className={s.ea}>{peso(e.amount)}</b>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
