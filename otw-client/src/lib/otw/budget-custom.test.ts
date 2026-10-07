import { describe, expect, it } from 'vitest';
import type { BudgetVM } from '@/lib/api/types';
import { totalWithCustom, withTotals } from './budget';
import { nameError } from './budget-custom';

const budget = (over: Partial<BudgetVM> = {}): BudgetVM => ({
  roomId: 'r',
  transportAmount: 1000,
  stayAmount: 2500.5,
  foodAmount: 800,
  activitiesAmount: 0,
  otherAmount: 0,
  participantCount: 3,
  estimatedAmount: 0,
  perPerson: 0,
  currency: 'PHP',
  updatedBy: null,
  updatedAt: '',
  ...over,
});

describe('totalWithCustom', () => {
  it('matches withTotals when there are no custom categories', () => {
    const b = budget();
    const t = totalWithCustom(b, []);
    const w = withTotals(b);
    expect(t.total).toBe(w.estimatedAmount);
    expect(t.perPerson).toBe(w.perPerson);
  });

  it('adds custom amounts in integer centavos and splits half up by max(1, people)', () => {
    const t = totalWithCustom(budget(), [100.1, 0.2]);
    expect(t.total).toBe(4400.8);
    expect(t.perPerson).toBe(1466.93); // 4400.80 / 3 = 1466.9333, half up
    expect(totalWithCustom(budget({ participantCount: 0 }), [100]).perPerson).toBe(4400.5);
  });
});

describe('nameError', () => {
  it('rejects empty, too long, default and duplicate names (case-insensitive)', () => {
    expect(nameError('  ', [])).toBeTruthy();
    expect(nameError('x'.repeat(25), [])).toBeTruthy();
    expect(nameError('food', [])).toBeTruthy();
    expect(nameError('Photographer', ['photographer'])).toBeTruthy();
    expect(nameError('Photographer', ['Souvenirs'])).toBeNull();
  });
});
