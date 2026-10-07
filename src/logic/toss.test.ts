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
  const at = (timeMs: number, x: number, y = 0) => ({ timeMs, x, y });

  it('measures a steady drag', () => {
    const samples = [at(0, 0, 50), at(50, 40, 35), at(100, 80, 20)];
    expect(throwSpeed(samples)).toEqual({ x: 800, y: -300 });
  });

  it('uses the fastest stretch, even when the hand slows down at the end', () => {
    const samples = [at(0, 0), at(20, 40), at(40, 80), at(60, 84), at(80, 86), at(100, 86)];
    expect(throwSpeed(samples).x).toBeCloseTo(2000);
  });

  it('is zero with too few samples', () => {
    expect(throwSpeed([])).toEqual({ x: 0, y: 0 });
    expect(throwSpeed([at(0, 0), at(20, 50)])).toEqual({ x: 0, y: 0 });
  });

  it('is zero when the hand has not moved', () => {
    expect(throwSpeed([at(0, 40), at(50, 40), at(100, 40), at(150, 40)])).toEqual({ x: 0, y: 0 });
  });

  it('skips samples taken at the same moment', () => {
    expect(throwSpeed([at(5, 0), at(5, 10), at(5, 20)])).toEqual({ x: 0, y: 0 });
  });
});
