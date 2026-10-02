/**
 * Budget ("Gastos") mock slice. Owned by the budget lane: add actions below.
 * TODO(backend): GET /rooms/{roomId}/budget replaces this slice (PUT to save).
 *
 * Money math runs in integer centavos so the totals never pick up float drift;
 * amounts go back out as pesos with 2 decimals (BigDecimal scale 2 on the server).
 */
import { BUD0 } from '../data';
import { defineSlice } from './store';
import { DEMO_ROOM_ID, demoTime, mockUserId } from './members';
import type { BudgetVM } from './types';

/** The five estimate fields, in the reference's order (Transportation, Stay, Food, Activities, Other). */
export type BudgetCategory = 'transportAmount' | 'stayAmount' | 'foodAmount' | 'activitiesAmount' | 'otherAmount';

export const BUDGET_CATEGORIES: readonly BudgetCategory[] = [
  'transportAmount',
  'stayAmount',
  'foodAmount',
  'activitiesAmount',
  'otherAmount',
];

/** People stepper bounds, same as the reference's bud-n handler. */
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

/** Recomputes the server-derived totals after a category or the head count changes. */
export function withTotals(b: BudgetVM): BudgetVM {
  const cents = BUDGET_CATEGORIES.reduce((sum, k) => sum + toCents(b[k]), 0);
  return { ...b, estimatedAmount: cents / 100, perPerson: perPersonCents(cents, b.participantCount) / 100 };
}

export const budget = defineSlice<BudgetVM>({
  key: 'budget',
  version: 1,
  // Like BudgetDto.empty(): all zero.
  // TODO(backend): participantCount comes from the room's member count; the mock starts at 1.
  empty: () =>
    withTotals({
      roomId: '',
      transportAmount: 0,
      stayAmount: 0,
      foodAmount: 0,
      activitiesAmount: 0,
      otherAmount: 0,
      participantCount: 1,
      estimatedAmount: 0,
      perPerson: 0,
      currency: 'PHP',
      updatedBy: null,
      updatedAt: new Date(0).toISOString(),
    }),
  demo: () =>
    withTotals({
      roomId: DEMO_ROOM_ID,
      transportAmount: BUD0.tr,
      stayAmount: BUD0.st,
      foodAmount: BUD0.fo,
      activitiesAmount: BUD0.ac,
      otherAmount: BUD0.ot,
      participantCount: BUD0.n,
      estimatedAmount: 0,
      perPerson: 0,
      currency: 'PHP',
      updatedBy: mockUserId('Merylle'),
      updatedAt: demoTime('Sep 25', '10:00 PM'),
    }),
});

/* ---------------- actions ---------------- */

// TODO(backend): PUT /rooms/{id}/budget with the five amounts + participantCount, then
// replace the slice with the returned BudgetDto. updatedBy stays as-is in the mock.
function save(code: string, patch: (b: BudgetVM) => Partial<BudgetVM>): void {
  budget.set(code, (b) => withTotals({ ...b, ...patch(b), updatedAt: new Date().toISOString() }));
}

/**
 * Sets one category estimate. Clamped like the reference input: max(0, +value || 0), stored to the centavo.
 * Returns false when nothing changed.
 */
export function setBudgetAmount(code: string, category: BudgetCategory, pesos: number): boolean {
  const amount = toCents(pesos) / 100;
  if (budget.get(code)[category] === amount) return false;
  const patch: Partial<BudgetVM> = {};
  patch[category] = amount;
  save(code, () => patch);
  return true;
}

/** Moves the head count by delta, kept within MIN_PEOPLE..MAX_PEOPLE. Returns false at a bound. */
export function stepBudgetPeople(code: string, delta: number): boolean {
  const current = budget.get(code).participantCount;
  const next = Math.max(MIN_PEOPLE, Math.min(MAX_PEOPLE, current + delta));
  if (next === current) return false;
  save(code, () => ({ participantCount: next }));
  return true;
}
