'use client';

import { useState } from 'react';
import { Avatar, Button, Card, Icon, Tag, blob } from '@/components/otw';
import { peso, type Member } from '@/lib/otw/data';
import { CATEGORY_LABEL, explainDebt, pesoExact, type Debt, type DebtSource } from '@/lib/otw/expenses';
import type { ExpenseVM, SettlementPaymentVM } from '@/lib/api/types';
import s from './expenses.module.css';

export interface WhoOwesProps {
  /** Outstanding transfers plus recorded payments (paymentId set). */
  debts: Debt[];
  /** Server: there are expenses and nothing is outstanding. */
  settled: boolean;
  myId: string;
  members: Member[];
  nameOf: (userId: string) => string;
  /** The expenses and recorded payments the breakdown under each debt is built from. */
  expenses: ExpenseVM[];
  payments: SettlementPaymentVM[];
  onPaid: (debt: Debt) => void | Promise<void>;
}

/** "Galing sa: borgir · Jeep +1": the biggest sources, so a debt names where it comes from at a glance. */
function caption(sources: DebtSource[]): string {
  const named = sources.filter((x) => x.kind === 'expense');
  if (!named.length) return 'Netted with the rest of the group';
  const top = [...named].sort((a, b) => b.cents - a.cents).slice(0, 2).map((x) => x.label);
  const more = named.length - top.length;
  return top.join(' · ') + (more > 0 ? ` +${more}` : '');
}

/** "Who owes whom": the settled block, "With you" and "Everyone else" (reference views.expenses). */
export function WhoOwes({ debts, settled, myId, members, nameOf, expenses, payments, onPaid }: WhoOwesProps) {
  const mine = debts.filter((d) => d.to === myId || d.from === myId);
  const others = debts.filter((d) => !(d.to === myId || d.from === myId));
  const [open, setOpen] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setOpen((cur) => {
      const next = new Set(cur);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  const row = (d: Debt) => {
    const done = !!d.paymentId;
    const from = nameOf(d.from);
    const to = nameOf(d.to);
    const sources = done ? [] : explainDebt(d, expenses, payments);
    const isOpen = open.has(d.key);
    const listId = `src-${d.key.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    return (
      <li key={d.key} className={s.dwrap}>
        <div className={`${s.drow}${done ? ` ${s.paid}` : ''}`}>
          <Avatar name={from} tone={members.find((m) => m.id === d.from)?.c} size={30} userId={d.from} />
          <span className={s.dt}>
            {d.from === myId ? 'You owe' : `${from} owes`} <b>{d.to === myId ? 'you' : to}</b>
          </span>
          <b className={s.da}>{peso(d.amount)}</b>
          {done ? (
            <Tag variant="st-g" icon="check">
              Paid
            </Tag>
          ) : (
            <Button variant="teal" sm onClick={() => void onPaid(d)}>
              Mark paid
            </Button>
          )}
        </div>
        {sources.length > 0 && (
          <div className={s.src}>
            <button
              type="button"
              className={s.why}
              aria-expanded={isOpen}
              aria-controls={listId}
              onClick={() => toggle(d.key)}
            >
              <span>Galing sa: {caption(sources)}</span>
              <Icon name={isOpen ? 'chevu' : 'chevd'} size={16} />
            </button>
            {isOpen && (
              <ul id={listId} className={s.srcl}>
                {sources.map((x) => (
                  <li key={x.key} className={s.sline}>
                    {x.category ? (
                      <Tag variant="blossom">{CATEGORY_LABEL[x.category]}</Tag>
                    ) : x.kind === 'payment' ? (
                      <Tag variant="st-g" icon="check">
                        Paid
                      </Tag>
                    ) : (
                      <Tag variant="cream">Netted</Tag>
                    )}
                    <span className={s.sl}>{x.label}</span>
                    <b className={`${s.sa}${x.cents < 0 ? ` ${s.neg}` : ''}`}>
                      {x.cents < 0 ? '−' : ''}
                      {pesoExact(x.cents)}
                    </b>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </li>
    );
  };

  return (
    <Card>
      <div className="rh">
        <h3>Who owes whom</h3>
      </div>
      {settled && (
        <div className={s.settled}>
          <span className={`ico xl ${s.cel}`} style={blob(4)}>
            <Icon name="burst" size={40} />
          </span>
          <h3>All settled. Walang may habol.</h3>
        </div>
      )}
      <h4 className={s.sh}>With you</h4>
      <ul className={s.dl}>{mine.length ? mine.map(row) : <li className="fine">Nothing between you and anyone.</li>}</ul>
      {others.length > 0 && (
        <>
          <h4 className={s.sh}>Everyone else</h4>
          <ul className={s.dl}>{others.map(row)}</ul>
        </>
      )}
    </Card>
  );
}
