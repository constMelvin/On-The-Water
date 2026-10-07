'use client';

/**
 * Ambagan (expense tracker) tab. Reference: src/proto2.js views.expenses + calcDebts, proto3
 * save-exp / paid, expenses-*.png. Data is GET /rooms/{roomId}/expenses plus the server-computed
 * GET .../expenses/settlement (outstanding transfers, recorded payments and my four tiles).
 * "Mark paid" records a payment; realtime expense.* / settlement.* keep everyone in sync.
 */
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Icon, PageHead, Tag } from '@/components/otw';
import { peso } from '@/lib/otw/data';
import { burst, toast } from '@/lib/otw/feedback';
import { useGala } from '@/lib/otw/gala-store';
import { featureKey } from '@/lib/otw/live';
import { failed, upsertIn, useExpenses, useSettlement, useTabState } from '@/lib/otw/gala-queries';
import type { Debt, NewExpense } from '@/lib/otw/expenses';
import { createExpense, recordPayment } from '@/lib/api/gala';
import { Empty, StateGate } from '../States';
import { ExpenseList } from './ExpenseList';
import { WhoOwes } from './WhoOwes';
import { AddExpenseSheet } from './AddExpenseSheet';
import s from './expenses.module.css';

/** Reference burstMid(): the sparkle burst from the middle of the screen. */
const burstMid = () => burst(window.innerWidth / 2, window.innerHeight / 2);

/** The room comes from the gala context (GalaProvider in the /gala/[code] layout). */
export function Expenses() {
  const { members, memberRows, nameOf, toneOf, roomId, myUserId, setViewState } = useGala();
  const qc = useQueryClient();
  const expensesQ = useExpenses();
  const settlementQ = useSettlement();
  const state = useTabState(expensesQ, settlementQ);
  const [adding, setAdding] = useState(false);
  const myId = myUserId ?? '';

  const items = expensesQ.data ?? [];
  const st = settlementQ.data;

  // Who can pay for, and share, an expense. The sheet lets the person pick who shares each one
  // (everyone by default); "Only the G's" uses the `going` flag.
  const people = useMemo(
    () => memberRows.map((m) => ({ id: m.userId, going: m.rsvpStatus === 'GOING' })),
    [memberRows]
  );

  // Outstanding transfers first, then the ones already marked paid.
  const debts = useMemo<Debt[]>(
    () => [
      ...(st?.transfers ?? []).map((t) => ({
        key: `t:${t.fromUserId}>${t.toUserId}`,
        from: t.fromUserId,
        to: t.toUserId,
        amount: t.amount,
      })),
      ...(st?.payments ?? []).map((p) => ({
        key: `p:${p.id}`,
        from: p.fromUserId,
        to: p.toUserId,
        amount: p.amount,
        paymentId: p.id,
      })),
    ],
    [st]
  );

  const total = st?.totalExpenses ?? 0;
  const share = st?.me?.share ?? 0;
  const youPaid = st?.me?.paid ?? 0;
  const owed = st?.me?.remaining ?? 0;

  const expensesKey = featureKey(roomId, 'expenses');
  const keys = [expensesKey, featureKey(roomId, 'settlement'), featureKey(roomId, 'summary')];
  const refresh = () => keys.slice(1).forEach((k) => void qc.invalidateQueries({ queryKey: k }));

  const openAdd = () => setAdding(true);

  const onAdd = async (input: NewExpense) => {
    if (!(input.amount > 0)) {
      toast('Add an amount first.', 'err');
      return;
    }
    // An empty list would make the server split between "everyone who is G" instead, so never send one.
    if (input.splitWith.length === 0) {
      toast('Pick at least one person.', 'err');
      return;
    }
    if (!roomId) return;
    try {
      const row = await createExpense(roomId, {
        description: input.description.trim() || 'Expense',
        amount: Math.round(input.amount * 100) / 100,
        paidBy: input.paidBy,
        category: input.category,
        // Each expense keeps its own set of people; the server stores one share per person.
        splitWithUserIds: input.splitWith,
      });
      upsertIn(qc, expensesKey, row);
      refresh();
      setAdding(false);
      toast('Expense added and split.');
      burstMid();
    } catch (e) {
      failed(qc, keys, e, "Couldn't add that expense.");
    }
  };

  const onPaid = async (d: Debt) => {
    if (!roomId) return;
    try {
      await recordPayment(roomId, d.from, d.to);
      toast('Marked as paid.');
      const outstanding = debts.filter((x) => !x.paymentId);
      if (outstanding.length === 1 && outstanding[0].key === d.key) burstMid();
      refresh();
    } catch (e) {
      failed(qc, keys, e, "Couldn't mark that as paid.");
    }
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
        onRetry={async () => {
          setViewState('default');
          const [a, b] = await Promise.all([expensesQ.refetch(), settlementQ.refetch()]);
          return a.isSuccess && b.isSuccess;
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
              <ExpenseList items={items} members={members} nameOf={nameOf} onAdd={openAdd} />
              <WhoOwes
                debts={debts}
                settled={!!st?.settled}
                myId={myId}
                members={members}
                nameOf={nameOf}
                expenses={items}
                payments={st?.payments ?? []}
                onPaid={onPaid}
              />
            </div>
          </>
        )}
      </StateGate>

      <button type="button" className={s.fab} onClick={openAdd} aria-label="Add expense">
        <Icon name="plus" size={30} />
      </button>

      {adding && (
        <AddExpenseSheet
          people={people}
          nameOf={nameOf}
          toneOf={toneOf}
          defaultPaidBy={myId}
          onAdd={onAdd}
          onClose={() => setAdding(false)}
        />
      )}
    </>
  );
}
