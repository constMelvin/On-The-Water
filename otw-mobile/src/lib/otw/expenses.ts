/** Ambagan display helpers. Shares and the settlement are computed by the server. */
import type { ExpenseCategory, ExpenseVM, SettlementPaymentVM } from '@/lib/api/types';

/** In the reference's order: Food first, then Transportation, Stay... */
export const CATEGORY_LABEL: Record<ExpenseCategory, string> = {
  FOOD: 'Food',
  TRANSPORTATION: 'Transportation',
  STAY: 'Stay',
  ACTIVITIES: 'Activities',
  OTHER: 'Other',
};

/** One row of "Who owes whom": an outstanding transfer, or a recorded payment (paymentId set). */
export interface Debt {
  key: string;
  from: string;
  to: string;
  amount: number;
  /** Set when this row is a recorded "Mark paid" payment. */
  paymentId?: string;
}

export interface NewExpense {
  description: string;
  /** Pesos. The caller rejects <= 0 before calling. */
  amount: number;
  paidBy: string;
  category: ExpenseCategory;
  /** The userIds this expense splits equally between: at least one (the server falls back to "everyone who is G" for none). */
  splitWith: string[];
}

/* ---------------- where a debt comes from ---------------- */

/** One line of a debt's breakdown. `cents` is signed: positive adds to what is owed, negative takes away. */
export interface DebtSource {
  key: string;
  kind: 'expense' | 'offset' | 'payment' | 'netted';
  label: string;
  category?: ExpenseCategory;
  cents: number;
}

const toCents = (n: number) => Math.round(n * 100);

/** "₱37" or "₱12.50": whole pesos stay clean, fractions keep their cents (unlike peso(), which rounds). */
export const pesoExact = (cents: number): string => {
  const abs = Math.abs(cents);
  return '₱' + (abs / 100).toLocaleString('en-US', { minimumFractionDigits: abs % 100 ? 2 : 0, maximumFractionDigits: 2 });
};

/**
 * Explains one outstanding transfer (`from` owes `to`) with the expenses behind it. For display only:
 * it never feeds back into the settlement, and works in whole cents to avoid float drift.
 *
 * The server nets everyone's balance across ALL expenses and payments and then simplifies, so a transfer
 * is not always a direct pair: it can route through other people. The direct lines are therefore
 * balanced by one "netted" line, so the lines always add up to the row's amount.
 *
 * TODO(backend): return the per-transfer source breakdown from GET .../expenses/settlement. That would
 * replace this client-side explanation and remove the "netted with others" approximation.
 */
export function explainDebt(
  debt: Pick<Debt, 'from' | 'to' | 'amount'>,
  expenses: ExpenseVM[],
  payments: SettlementPaymentVM[]
): DebtSource[] {
  const { from, to } = debt;
  const lines: DebtSource[] = [];
  let direct = 0;

  for (const e of expenses) {
    if (e.paidBy === to) {
      // `to` paid; `from`'s share of it is owed to `to`.
      const c = toCents(e.shares.find((x) => x.userId === from)?.shareAmount ?? 0);
      if (c > 0) {
        lines.push({ key: `e:${e.id}`, kind: 'expense', label: e.description, category: e.category, cents: c });
        direct += c;
      }
    } else if (e.paidBy === from) {
      // `from` paid; `to`'s share of it is owed back, which lowers what `from` owes.
      const c = toCents(e.shares.find((x) => x.userId === to)?.shareAmount ?? 0);
      if (c > 0) {
        lines.push({ key: `o:${e.id}`, kind: 'offset', label: e.description, category: e.category, cents: -c });
        direct -= c;
      }
    }
  }

  for (const p of payments) {
    const c = toCents(p.amount);
    if (p.fromUserId === from && p.toUserId === to) {
      lines.push({ key: `p:${p.id}`, kind: 'payment', label: 'Already paid', cents: -c });
      direct -= c;
    } else if (p.fromUserId === to && p.toUserId === from) {
      lines.push({ key: `p:${p.id}`, kind: 'payment', label: 'Paid the other way', cents: c });
      direct += c;
    }
  }

  const rest = toCents(debt.amount) - direct;
  if (rest !== 0) lines.push({ key: 'netted', kind: 'netted', label: 'Netted with others', cents: rest });
  return lines;
}
