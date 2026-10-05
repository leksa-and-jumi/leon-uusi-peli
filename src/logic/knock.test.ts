import { describe, expect, it } from 'vitest';
import { knockDone, knockTilt } from './knock';

const times = { fallMs: 200, lieMs: 1000, riseMs: 400 };

describe('knockTilt', () => {
  it('tips over, lies flat, then gets up', () => {
    expect(knockTilt(0, times)).toBe(0);
    expect(knockTilt(100, times)).toBe(0.5);
    expect(knockTilt(200, times)).toBe(1);
    expect(knockTilt(900, times)).toBe(1);
    expect(knockTilt(1400, times)).toBe(0.5);
    expect(knockTilt(1600, times)).toBe(0);
    expect(knockTilt(5000, times)).toBe(0);
  });
});

describe('knockDone', () => {
  it('is done only after getting all the way up', () => {
    expect(knockDone(1599, times)).toBe(false);
    expect(knockDone(1600, times)).toBe(true);
  });
});
