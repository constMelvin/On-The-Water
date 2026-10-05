'use client';

import { Avatar, Button, Card, Icon, Tag, blob } from '@/components/otw';
import { peso, type Member } from '@/lib/otw/data';
import type { Debt } from '@/lib/otw/expenses';
import s from './expenses.module.css';

export interface WhoOwesProps {
  /** Outstanding transfers plus recorded payments (paymentId set). */
  debts: Debt[];
  /** Server: there are expenses and nothing is outstanding. */
  settled: boolean;
  myId: string;
  members: Member[];
  nameOf: (userId: string) => string;
  onPaid: (debt: Debt) => void | Promise<void>;
}

/** "Who owes whom": the settled block, "With you" and "Everyone else" (reference views.expenses). */
export function WhoOwes({ debts, settled, myId, members, nameOf, onPaid }: WhoOwesProps) {
  const mine = debts.filter((d) => d.to === myId || d.from === myId);
  const others = debts.filter((d) => !(d.to === myId || d.from === myId));

  const row = (d: Debt) => {
    const done = !!d.paymentId;
    const from = nameOf(d.from);
    const to = nameOf(d.to);
    return (
      <li key={d.key} className={`${s.drow}${done ? ` ${s.paid}` : ''}`}>
        <Avatar name={from} tone={members.find((m) => m.id === d.from)?.c} size={30} />
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
