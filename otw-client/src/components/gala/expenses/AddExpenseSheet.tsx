'use client';

import { useState, type FormEvent } from 'react';
import { Button, Sheet } from '@/components/otw';
import { CATEGORY_LABEL, type NewExpense } from '@/lib/otw/expenses';
import type { ExpenseCategory } from '@/lib/api/types';

export interface AddExpenseSheetProps {
  /** Who the cost splits between (userIds). */
  sharers: string[];
  /** Who can have paid: every member (userIds). */
  payers: string[];
  nameOf: (userId: string) => string;
  /** Pre-selected "Paid by". */
  defaultPaidBy: string;
  onAdd: (input: NewExpense) => void | Promise<void>;
  onClose: () => void;
}

/** "Add an expense" sheet (reference sheet addExp): what, amount, paid by, category, equal split. */
export function AddExpenseSheet({ sharers, payers, nameOf, defaultPaidBy, onAdd, onClose }: AddExpenseSheetProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(defaultPaidBy);
  const [category, setCategory] = useState<ExpenseCategory>('FOOD');

  const [busy, setBusy] = useState(false);

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      // The parent shows the "Add an amount first." toast for a missing or zero amount.
      await onAdd({ description, amount: Math.max(0, Number(amount) || 0), paidBy, category });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      title="Add an expense"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={busy}>
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
              {payers.map((id) => (
                <option key={id} value={id}>
                  {nameOf(id)}
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
        <p className="fine">Split equally between {sharers.length} people.</p>
      </form>
    </Sheet>
  );
}
