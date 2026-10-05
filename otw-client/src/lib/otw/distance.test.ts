import { describe, expect, it } from 'vitest';
import { distanceKm, formatDistance } from './distance';

describe('distanceKm', () => {
  it('is about 205 km from Manila to Baguio in a straight line', () => {
    expect(distanceKm({ lat: 14.5995, lng: 120.9842 }, { lat: 16.4023, lng: 120.596 })).toBeCloseTo(204.7, 0);
  });

  it('is zero for the same point', () => {
    expect(distanceKm({ lat: 14.5, lng: 121 }, { lat: 14.5, lng: 121 })).toBe(0);
  });
});

describe('formatDistance', () => {
  it('uses metres under 1 km, rounded to 10 m (at least 10 m)', () => {
    expect(formatDistance(0.8473)).toBe('850 m');
    expect(formatDistance(0.001)).toBe('10 m');
  });

  it('uses one decimal under 10 km and whole km above', () => {
    expect(formatDistance(4.249)).toBe('4.2 km');
    expect(formatDistance(204.7)).toBe('205 km');
  });
});
