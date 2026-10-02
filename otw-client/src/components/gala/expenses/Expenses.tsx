'use client';

/**
 * Ambagan (expense tracker) tab. Reference: src/proto2.js views.expenses + calcDebts, proto3
 * save-exp / paid, expenses-*.png. Data is the mock expenses slice (lib/otw/mock/expenses.ts);
 * the debts are derived from it with the reference's greedy calcDebts.
 * TODO(backend): expenses, settlement and payments endpoints (see expenses.ts); realtime expense.* on room:{roomId}.
 */
import { useState } from 'react';
import { Icon, PageHead, Tag } from '@/components/otw';
import { peso } from '@/lib/otw/data';
import { burst, toast } from '@/lib/otw/feedback';
import { useGala } from '@/lib/otw/gala-store';
import { mockUserId, useSlice } from '@/lib/otw/mock';
import { addExpense, calcDebts, expenses, expensesPaid, markPaid, sharersOf, type NewExpense } from '@/lib/otw/mock/expenses';
import { Empty, StateGate } from '../States';
import { ExpenseList } from './ExpenseList';
import { WhoOwes } from './WhoOwes';
import { AddExpenseSheet } from './AddExpenseSheet';
import s from './expenses.module.css';

/** Reference burstMid(): the sparkle burst from the middle of the screen. */
const burstMid = () => burst(window.innerWidth / 2, window.innerHeight / 2);

export function Expenses({ code }: { code: string }) {
  const { members, me, viewState, liveState, setViewState, retry } = useGala();
  // Same rule as the dashboard: the dev switcher wins, otherwise the live query state.
  const state = viewState !== 'default' ? viewState : liveState;

  const [items] = useSlice(expenses, code);
  const [paid] = useSlice(expensesPaid, code);
  const [adding, setAdding] = useState(false);
  const myId = mockUserId(me);

  // Who splits the costs: the people on the existing expenses, else the room's members.
  const sharers = sharersOf(items, members.map((m) => mockUserId(m.n)));
  const { debts, total, share } = calcDebts(items, sharers);

  const unpaid = debts.filter((d) => !paid[d.key]);
  const youPaid = items.filter((e) => e.paidBy === myId).reduce((sum, e) => sum + e.amount, 0);
  const owed =
    unpaid.filter((d) => d.to === myId).reduce((sum, d) => sum + d.amount, 0) -
    unpaid.filter((d) => d.from === myId).reduce((sum, d) => sum + d.amount, 0);

  const openAdd = () => setAdding(true);

  const onAdd = (input: NewExpense) => {
    if (!(input.amount > 0)) {
      toast('Add an amount first.', 'err');
      return;
    }
    addExpense(code, input, sharers);
    setAdding(false);
    toast('Expense added and split.');
    burstMid();
  };

  const onPaid = (key: string) => {
    markPaid(code, key);
    toast('Marked as paid.');
    if (debts.every((d) => d.key === key || paid[d.key])) burstMid();
  };

  // Phase 3 (states + polish) is a follow-up. A room with no expenses yet gets the empty state;
  // the dev switcher's loading / empty / error / offline go through StateGate.
  return (
    <>
      <PageHead
        title="Okay, sino nag-abono?"
        sub="Track what was actually spent and who still owes whom."
        tag={<Tag icon="wallet">Ambagan</Tag>}
      />
      <StateGate
        state={state}
        kind="expenses"
        onAction={() => {
          setViewState('default');
          openAdd();
        }}
        onRetry={() => {
          setViewState('default');
          return retry();
        }}
      >
        {items.length === 0 ? (
          <Empty kind="expenses" onAction={openAdd} />
        ) : (
          <>
            <div className={s.tiles}>
              <div className={`${s.tile} c-cream`}>
                <b>{peso(total)}</b>
                <span>Total spent</span>
              </div>
              <div className={`${s.tile} c-blossom`}>
                <b>{peso(share)}</b>
                <span>Your share</span>
              </div>
              <div className={`${s.tile} c-zest`}>
                <b>{peso(youPaid)}</b>
                <span>You&apos;ve paid</span>
              </div>
              <div className={`${s.tile} c-teal`}>
                <b>{peso(Math.abs(owed))}</b>
                <span>Remaining · {owed > 0 ? "you're owed" : owed < 0 ? 'you owe' : 'all clear'}</span>
              </div>
            </div>
            <div className={s.cols}>
              <ExpenseList items={items} members={members} onAdd={openAdd} />
              <WhoOwes debts={debts} paid={paid} myId={myId} members={members} onPaid={onPaid} />
            </div>
          </>
        )}
      </StateGate>

      <button type="button" className={s.fab} onClick={openAdd} aria-label="Add expense">
        <Icon name="plus" size={30} />
      </button>

      {adding && (
        <AddExpenseSheet
          sharers={sharers}
          defaultPaidBy={sharers.includes(myId) ? myId : (sharers[0] ?? myId)}
          onAdd={onAdd}
          onClose={() => setAdding(false)}
        />
      )}
    </>
  );
}
