/**
 * Expenses ("Ambagan") mock slice. Owned by the expenses lane: add actions and the
 * settlement math below.
 * TODO(backend): GET /rooms/{roomId}/expenses (paginated) replaces this slice, and
 * GET /rooms/{roomId}/expenses/settlement replaces any settlement derived from it.
 */
import { EXP0, SHARERS } from '../data';
import { defineSlice, mockId } from './store';
import { DEMO_ROOM_ID, demoTime, mockUserId } from './members';
import type { ExpenseCategory, ExpenseShareVM, ExpenseVM } from './types';

const CATEGORY: Record<string, ExpenseCategory> = {
  Transportation: 'TRANSPORTATION',
  Stay: 'STAY',
  Food: 'FOOD',
  Activities: 'ACTIVITIES',
  Other: 'OTHER',
};

/** Equal split in centavos; the leftover centavos go to the first people so the shares add up. */
export function splitEqually(amount: number, userIds: string[]): ExpenseShareVM[] {
  if (!userIds.length) return [];
  const cents = Math.round(amount * 100);
  const base = Math.floor(cents / userIds.length);
  const extra = cents - base * userIds.length;
  return userIds.map((userId, i) => ({ userId, shareAmount: (base + (i < extra ? 1 : 0)) / 100 }));
}

export const expenses = defineSlice<ExpenseVM[]>({
  key: 'expenses',
  version: 1,
  empty: () => [],
  demo: () =>
    EXP0.map((e, i) => ({
      id: `demo-exp-${i + 1}`,
      roomId: DEMO_ROOM_ID,
      description: e.n,
      amount: e.a,
      paidBy: mockUserId(e.w),
      category: CATEGORY[e.c] ?? 'OTHER',
      note: e.note || null,
      shares: splitEqually(e.a, SHARERS.map(mockUserId)),
      createdAt: demoTime(e.d, '6:00 PM'),
    })),
});

/*
 * TODO(backend): expenses, settlement and payments endpoints.
 * - POST /rooms/{roomId}/expenses (the server splits and writes the shares), paginated GET.
 * - GET /rooms/{roomId}/expenses/settlement replaces calcDebts below (SettlementDto.transfers).
 * - POST .../settlement/payments ("Mark paid") replaces the expenses-paid slice.
 * - Realtime expense.* events on room:{roomId} after commit.
 * - User ids here are mockUserId(nickname); the real ones come from RoomMemberDto.userId.
 */

/** "Mark paid" flags, keyed by debtKey. Cleared whenever an expense is added (the debts change). */
export const expensesPaid = defineSlice<Record<string, boolean>>({
  key: 'expenses-paid',
  version: 1,
  empty: () => ({}),
  demo: () => ({}),
});

export const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  FOOD: 'Food',
  TRANSPORTATION: 'Transportation',
  STAY: 'Stay',
  ACTIVITIES: 'Activities',
  OTHER: 'Other',
};

/* ---------------- settlement (reference calcDebts, ported exactly) ---------------- */

export interface Debt {
  from: string;
  to: string;
  /** Whole pesos, half up (the reference's Math.round). */
  amount: number;
  key: string;
}

export const debtKey = (from: string, to: string): string => `${from}>${to}`;

/** Who the costs are split between: the people on the first expense, else the fallback (the room's members). */
export function sharersOf(items: ExpenseVM[], fallback: string[]): string[] {
  const first = items.find((e) => e.shares.length);
  return first ? first.shares.map((s) => s.userId) : fallback;
}

/**
 * Same greedy settle as the reference calcDebts (references/otw/src/proto2.js):
 *   net = paid - total / n for every sharer; creditors (net > 0.5) and debtors (net < -0.5)
 *   sorted biggest first; each debtor pays the current creditor min(owed, creditor's balance),
 *   moving to the next creditor once the balance drops under 0.5; each amount rounded to a peso.
 * Only the arithmetic differs: everything is scaled by n x 100 so it is exact integers
 * (centavos x n), which gives the same results without float drift.
 */
export function calcDebts(items: ExpenseVM[], sharers: string[]): { debts: Debt[]; total: number; share: number } {
  const n = new Set(sharers).size;
  const totalCents = items.reduce((sum, e) => sum + Math.round(e.amount * 100), 0);
  const total = totalCents / 100;
  if (!n) return { debts: [], total, share: 0 };

  // net x n, in centavos. Sharers first (their order is the tie-break), then any other payer.
  const net = new Map<string, number>();
  sharers.forEach((id) => net.set(id, -totalCents));
  items.forEach((e) => net.set(e.paidBy, (net.get(e.paidBy) ?? 0) + n * Math.round(e.amount * 100)));

  const half = 50 * n; // 0.5 peso, scaled
  const cr = [...net].filter(([, v]) => v > half).map(([id, v]) => ({ id, v })).sort((a, b) => b.v - a.v);
  const db = [...net].filter(([, v]) => v < -half).map(([id, v]) => ({ id, v: -v })).sort((a, b) => b.v - a.v);

  const unit = n * 100; // scaled value of one peso
  const debts: Debt[] = [];
  let ci = 0;
  db.forEach((d) => {
    let rem = d.v;
    while (rem > half && ci < cr.length) {
      const c = cr[ci];
      const x = Math.min(rem, c.v);
      debts.push({ from: d.id, to: c.id, amount: Math.floor((2 * x + unit) / (2 * unit)), key: debtKey(d.id, c.id) });
      rem -= x;
      c.v -= x;
      if (c.v < half) ci++;
    }
  });
  return { debts, total, share: totalCents / n / 100 };
}

/* ---------------- actions ---------------- */

export interface NewExpense {
  description: string;
  /** Pesos. The caller rejects <= 0 before calling. */
  amount: number;
  paidBy: string;
  category: ExpenseCategory;
}

/**
 * Appends an expense split equally between `sharers`, and clears the "paid" marks (the debts
 * changed). A blank name becomes "Expense" (reference save-exp).
 */
export function addExpense(code: string, input: NewExpense, sharers: string[]): void {
  const amount = Math.round(input.amount * 100) / 100;
  expenses.set(code, (items) => [
    ...items,
    {
      id: mockId(),
      roomId: items[0]?.roomId ?? '',
      description: input.description.trim() || 'Expense',
      amount,
      paidBy: input.paidBy,
      category: input.category,
      note: null,
      shares: splitEqually(amount, sharers),
      createdAt: new Date().toISOString(),
    },
  ]);
  expensesPaid.set(code, {});
}

/** Marks one debt as paid. */
export function markPaid(code: string, key: string): void {
  expensesPaid.set(code, (p) => ({ ...p, [key]: true }));
}
