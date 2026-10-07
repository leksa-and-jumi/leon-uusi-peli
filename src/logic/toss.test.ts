import { describe, expect, it } from 'vitest';
import { recentSamples, throwSpeed } from './toss';

describe('recentSamples', () => {
  it('keeps only the samples inside the time window', () => {
    const samples = [
      { timeMs: 0, x: 0, y: 0 },
      { timeMs: 80, x: 10, y: 0 },
      { timeMs: 160, x: 20, y: 0 },
    ];
    expect(recentSamples(samples, 170, 100)).toEqual([
      { timeMs: 80, x: 10, y: 0 },
      { timeMs: 160, x: 20, y: 0 },
    ]);
  });
});

describe('throwSpeed', () => {
  it('goes from the oldest sample to the newest', () => {
    const samples = [
      { timeMs: 100, x: 0, y: 50 },
      { timeMs: 150, x: 30, y: 40 },
      { timeMs: 200, x: 80, y: 20 },
    ];
    expect(throwSpeed(samples)).toEqual({ x: 800, y: -300 });
  });

  it('is zero without two samples at different times', () => {
    expect(throwSpeed([])).toEqual({ x: 0, y: 0 });
    expect(throwSpeed([{ timeMs: 5, x: 3, y: 3 }])).toEqual({ x: 0, y: 0 });
    expect(
      throwSpeed([
        { timeMs: 5, x: 3, y: 3 },
        { timeMs: 5, x: 9, y: 9 },
      ]),
    ).toEqual({ x: 0, y: 0 });
  });

  it('is zero when the hand has stopped', () => {
    const still = [
      { timeMs: 100, x: 40, y: 40 },
      { timeMs: 200, x: 40, y: 40 },
    ];
    expect(throwSpeed(still)).toEqual({ x: 0, y: 0 });
  });
});
