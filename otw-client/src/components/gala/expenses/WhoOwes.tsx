'use client';

import { Avatar, Button, Card, Icon, Tag, blob } from '@/components/otw';
import { peso, type Member } from '@/lib/otw/data';
import { nameOf } from '@/lib/otw/mock';
import type { Debt } from '@/lib/otw/mock/expenses';
import s from './expenses.module.css';

export interface WhoOwesProps {
  debts: Debt[];
  paid: Record<string, boolean>;
  myId: string;
  members: Member[];
  onPaid: (key: string) => void;
}

/** "Who owes whom": the settled block, "With you" and "Everyone else" (reference views.expenses). */
export function WhoOwes({ debts, paid, myId, members, onPaid }: WhoOwesProps) {
  const settled = debts.length > 0 && debts.every((d) => paid[d.key]);
  const mine = debts.filter((d) => d.to === myId || d.from === myId);
  const others = debts.filter((d) => !(d.to === myId || d.from === myId));

  const row = (d: Debt) => {
    const done = !!paid[d.key];
    const from = nameOf(d.from);
    const to = nameOf(d.to);
    return (
      <li key={d.key} className={`${s.drow}${done ? ` ${s.paid}` : ''}`}>
        <Avatar name={from} tone={members.find((m) => m.n === from)?.c} size={30} />
        <span className={s.dt}>
          {d.from === myId ? 'You owe' : `${from} owes`} <b>{d.to === myId ? 'you' : to}</b>
        </span>
        <b className={s.da}>{peso(d.amount)}</b>
        {done ? (
          <Tag variant="st-g" icon="check">
            Paid
          </Tag>
        ) : (
          <Button variant="teal" sm onClick={() => onPaid(d.key)}>
            Mark paid
          </Button>
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
