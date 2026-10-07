/**
 * Budget ("Gastos") math shared by the form and the results. The server computes the saved
 * totals (BudgetDto); this runs the same math in integer centavos so the numbers update
 * while someone is still typing, before the save lands.
 */
import type { BudgetVM } from '@/lib/api/types';

/** The five estimate fields, in the reference's order (Transportation, Stay, Food, Activities, Other). */
export type BudgetCategory = 'transportAmount' | 'stayAmount' | 'foodAmount' | 'activitiesAmount' | 'otherAmount';

export const BUDGET_CATEGORIES: readonly BudgetCategory[] = [
  'transportAmount',
  'stayAmount',
  'foodAmount',
  'activitiesAmount',
  'otherAmount',
];

/** People stepper bounds (the server allows 1..500; the reference stepper stops at 30). */
export const MIN_PEOPLE = 1;
export const MAX_PEOPLE = 30;

/** Pesos -> integer centavos, half up. Negative, empty or non-numeric input counts as 0. */
export const toCents = (pesos: number): number => (Number.isFinite(pesos) && pesos > 0 ? Math.round(pesos * 100) : 0);

/** Half-up integer division of a non-negative centavo amount by the head count (never by 0). */
const perPersonCents = (totalCents: number, people: number): number => {
  const p = Math.max(1, Math.floor(people) || 1);
  return Math.floor((2 * totalCents + p) / (2 * p));
};

/** Same math as BudgetDto.perPerson: total / max(1, people), 2 dp, half up. */
export const perPersonOf = (total: number, people: number): number => perPersonCents(toCents(total), people) / 100;

/**
 * Total and per person once this device's custom category amounts (pesos) are added to the five.
 * The same integer-centavo maths as withTotals(); custom rows just add more line items.
 */
export function totalWithCustom(b: BudgetVM, customAmounts: number[]): { total: number; perPerson: number } {
  const cents =
    BUDGET_CATEGORIES.reduce((sum, k) => sum + toCents(b[k]), 0) + customAmounts.reduce((sum, a) => sum + toCents(a), 0);
  return { total: cents / 100, perPerson: perPersonCents(cents, b.participantCount) / 100 };
}

/** Recomputes the server-derived totals after a category or the head count changes. */
export function withTotals(b: BudgetVM): BudgetVM {
  const cents = BUDGET_CATEGORIES.reduce((sum, k) => sum + toCents(b[k]), 0);
  return { ...b, estimatedAmount: cents / 100, perPerson: perPersonCents(cents, b.participantCount) / 100 };
}
