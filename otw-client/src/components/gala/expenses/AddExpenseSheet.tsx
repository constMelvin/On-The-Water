'use client';

import { useState, type FormEvent } from 'react';
import { Avatar, Button, Icon, Sheet } from '@/components/otw';
import type { Tone } from '@/lib/otw/data';
import { CATEGORY_LABEL, type NewExpense } from '@/lib/otw/expenses';
import type { ExpenseCategory } from '@/lib/api/types';
import s from './expenses.module.css';

export interface AddExpensePerson {
  id: string;
  /** Said "I'm G": the "Only the G's" shortcut picks these. */
  going: boolean;
}

export interface AddExpenseSheetProps {
  /** Every active member (userIds): who can have paid, and who can share the cost. */
  people: AddExpensePerson[];
  nameOf: (userId: string) => string;
  toneOf: (userId: string) => Tone | undefined;
  /** Pre-selected "Paid by": the current person, so they show as "(you)". */
  defaultPaidBy: string;
  onAdd: (input: NewExpense) => void | Promise<void>;
  onClose: () => void;
}

const money = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** "Add an expense" sheet (reference sheet addExp): what, amount, paid by, category, who shares it. */
export function AddExpenseSheet({ people, nameOf, toneOf, defaultPaidBy, onAdd, onClose }: AddExpenseSheetProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(defaultPaidBy);
  const [category, setCategory] = useState<ExpenseCategory>('FOOD');
  // Who shares this expense: everyone by default, and always at least one person.
  const [shared, setShared] = useState<Set<string>>(() => new Set(people.map((p) => p.id)));

  const [busy, setBusy] = useState(false);

  const count = shared.size;
  const typed = Number(amount) || 0;
  const goingIds = people.filter((p) => p.going).map((p) => p.id);

  const toggle = (id: string) =>
    setShared((cur) => {
      const next = new Set(cur);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (busy || count === 0) return;
    setBusy(true);
    try {
      // The parent shows the "Add an amount first." toast for a missing or zero amount.
      await onAdd({
        description,
        amount: Math.max(0, typed),
        paidBy,
        category,
        // Member order, so the server's split (and its odd cent) is the same every time.
        splitWith: people.filter((p) => shared.has(p.id)).map((p) => p.id),
      });
    } finally {
      setBusy(false);
    }
  };

  const payerName = paidBy === defaultPaidBy ? 'mo' : `ni ${nameOf(paidBy)}`;

  return (
    <Sheet
      title="Add an expense"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={busy || count === 0}>
            Add expense
          </Button>
        </>
      }
    >
      {/* A form so Enter in a field adds the expense. */}
      <form onSubmit={submit} style={{ display: 'contents' }}>
        <label className="fl">
          What was it?
          <input
            className="in"
            placeholder="Jeepney, dinner, entrance fee…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <div className="two-in">
          <label className="fl">
            Amount
            <input
              className="in"
              type="number"
              min={0}
              inputMode="decimal"
              placeholder="₱0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label className="fl">
            Paid by
            <select className="in" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {nameOf(p.id)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="fl">
          Category
          <select className="in" value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
            {/* CATEGORY_LABEL is in the reference's order: Food first, then Transportation, Stay... */}
            {(Object.keys(CATEGORY_LABEL) as ExpenseCategory[]).map((k) => (
              <option key={k} value={k}>
                {CATEGORY_LABEL[k]}
              </option>
            ))}
          </select>
        </label>

        {/* TODO(backend): none needed. POST .../expenses already takes splitWithUserIds and stores each expense's own shares. */}
        <fieldset className={s.pick}>
          <legend>Sino-sino ang mag-aambagan?</legend>
          <div className={s.quick}>
            <button type="button" className={s.qbtn} onClick={() => setShared(new Set(people.map((p) => p.id)))}>
              Everyone
            </button>
            <button
              type="button"
              className={s.qbtn}
              disabled={goingIds.length === 0}
              onClick={() => setShared(new Set(goingIds))}
            >
              Only the G&apos;s
            </button>
          </div>
          <div className={s.chips}>
            {people.map((p) => {
              const on = shared.has(p.id);
              return (
                <label key={p.id} className={`${s.chip}${on ? ` ${s.on}` : ''}`}>
                  <input type="checkbox" className={s.cb} checked={on} onChange={() => toggle(p.id)} />
                  <Avatar name={nameOf(p.id)} tone={toneOf(p.id)} size={24} userId={p.id} />
                  <span>
                    {nameOf(p.id)}
                    {p.id === defaultPaidBy ? ' (you)' : ''}
                  </span>
                  {on && <Icon name="check" size={16} />}
                </label>
              );
            })}
          </div>
        </fieldset>
        {count === 0 ? (
          <p className={`fine ${s.err}`} role="alert">
            Pick at least one person.
          </p>
        ) : (
          <p className="fine" aria-live="polite">
            Split equally between {count} {count === 1 ? 'person' : 'people'}
            {typed > 0 ? ` · about ₱${money.format(typed / count)} each` : ''}.
          </p>
        )}
        {count > 0 && !shared.has(paidBy) && (
          <p className="fine">Libre {payerName} &apos;to. Not in the split.</p>
        )}
      </form>
    </Sheet>
  );
}
