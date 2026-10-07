import { describe, expect, it } from 'vitest';
import type { ExpenseVM, SettlementPaymentVM } from '@/lib/api/types';
import { explainDebt, pesoExact } from './expenses';

const expense = (id: string, paidBy: string, shares: Record<string, number>, description = id): ExpenseVM => ({
  id,
  roomId: 'r',
  description,
  amount: Object.values(shares).reduce((a, b) => a + b, 0),
  paidBy,
  category: 'FOOD',
  note: null,
  shares: Object.entries(shares).map(([userId, shareAmount]) => ({ userId, shareAmount })),
  createdAt: '2026-10-01T00:00:00Z',
});

const total = (lines: { cents: number }[]) => lines.reduce((a, l) => a + l.cents, 0);

describe('explainDebt', () => {
  it('lists the expenses a direct debt comes from and adds up to the amount', () => {
    const lines = explainDebt(
      { from: 'jm', to: 'me', amount: 37 },
      [expense('borgir', 'me', { me: 20, jm: 20 }), expense('jeep', 'me', { me: 17, jm: 17 })],
      []
    );
    expect(lines.map((l) => l.label)).toEqual(['borgir', 'jeep']);
    expect(total(lines)).toBe(3700);
  });

  it('subtracts what the other person already owes back, and recorded payments', () => {
    const payments: SettlementPaymentVM[] = [
      { id: 'p1', fromUserId: 'jm', toUserId: 'me', amount: 5, recordedBy: 'jm', createdAt: '' },
    ];
    const lines = explainDebt(
      { from: 'jm', to: 'me', amount: 10 },
      [expense('dinner', 'me', { jm: 30 }), expense('taxi', 'jm', { me: 15 })],
      payments
    );
    expect(lines.map((l) => l.kind)).toEqual(['expense', 'offset', 'payment']);
    expect(total(lines)).toBe(1000);
  });

  it('balances a debt that routes through other people with a "netted" line', () => {
    const lines = explainDebt({ from: 'a', to: 'c', amount: 10 }, [expense('x', 'b', { a: 10 })], []);
    expect(lines).toHaveLength(1);
    expect(lines[0].kind).toBe('netted');
    expect(total(lines)).toBe(1000);
  });
});

describe('pesoExact', () => {
  it('keeps cents only when there are some', () => {
    expect(pesoExact(3700)).toBe('₱37');
    expect(pesoExact(1250)).toBe('₱12.50');
    expect(pesoExact(-500)).toBe('₱5');
  });
});
