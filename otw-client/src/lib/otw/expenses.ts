/** Ambagan display helpers. Shares and the settlement are computed by the server. */
import type { ExpenseCategory } from '@/lib/api/types';

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
}
