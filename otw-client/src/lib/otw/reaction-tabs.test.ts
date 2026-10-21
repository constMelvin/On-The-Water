import { describe, expect, it } from 'vitest';
import { reactionTabs } from './reaction-tabs';

describe('reactionTabs', () => {
  it('shows every reaction when they all fit', () => {
    expect(reactionTabs(['HEART', 'HAHA', 'WOW'], 5, null)).toEqual({
      visible: ['HEART', 'HAHA', 'WOW'],
      overflow: [],
      activeInOverflow: false,
    });
  });

  it('shows exactly max reactions without a More tab', () => {
    const five = ['HEART', 'HAHA', 'WOW', 'SAD', 'ANGRY'];
    expect(reactionTabs(five, 5, null).overflow).toEqual([]);
  });

  it('moves the extras into More, keeping a slot for it (never a lone item)', () => {
    const six = ['HEART', 'HAHA', 'WOW', 'SAD', 'ANGRY', 'LIKE'];
    expect(reactionTabs(six, 5, null)).toEqual({
      visible: ['HEART', 'HAHA', 'WOW', 'SAD'],
      overflow: ['ANGRY', 'LIKE'],
      activeInOverflow: false,
    });
  });

  it('uses the narrower limit on phones', () => {
    const four = ['HEART', 'HAHA', 'WOW', 'SAD'];
    expect(reactionTabs(four, 3, null)).toEqual({
      visible: ['HEART', 'HAHA'],
      overflow: ['WOW', 'SAD'],
      activeInOverflow: false,
    });
  });

  it('reports when the active tab is one of the extras', () => {
    const six = ['HEART', 'HAHA', 'WOW', 'SAD', 'ANGRY', 'LIKE'];
    expect(reactionTabs(six, 5, 'LIKE').activeInOverflow).toBe(true);
    expect(reactionTabs(six, 5, 'HEART').activeInOverflow).toBe(false);
  });

  it('handles no reactions at all', () => {
    expect(reactionTabs([], 5, null)).toEqual({ visible: [], overflow: [], activeInOverflow: false });
  });
});
