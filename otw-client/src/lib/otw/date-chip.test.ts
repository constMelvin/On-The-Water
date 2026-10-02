import { describe, expect, it } from 'vitest';
import { dateChip } from './date-chip';

describe('dateChip', () => {
  it('gives the day and short month for a yyyy-mm-dd date', () => {
    expect(dateChip('2026-11-14')).toEqual({ day: 14, mon: 'Nov' });
    expect(dateChip('2026-01-02')).toEqual({ day: 2, mon: 'Jan' });
  });
  it('does not shift across timezones (local date, not UTC)', () => {
    expect(dateChip('2026-12-31')).toEqual({ day: 31, mon: 'Dec' });
  });
  it('returns null for null, undefined, empty or malformed input', () => {
    expect(dateChip(null)).toBeNull();
    expect(dateChip(undefined)).toBeNull();
    expect(dateChip('')).toBeNull();
    expect(dateChip('not-a-date')).toBeNull();
  });
});
