import { describe, expect, it } from 'vitest';
import { flyStep, isGone, throwDirection } from './fly';

describe('flyStep', () => {
  it('flies sideways and gets pulled down', () => {
    expect(flyStep({ x: 0, y: 0, vx: 100, vy: -200 }, 1000, 100)).toEqual({
      x: 10,
      y: -10,
      vx: 100,
      vy: -100,
    });
  });
});

describe('throwDirection', () => {
  it('throws toward the closer edge', () => {
    expect(throwDirection(100, 0, 800)).toBe(-1);
    expect(throwDirection(700, 0, 800)).toBe(1);
  });

  it('throws right from the middle', () => {
    expect(throwDirection(400, 0, 800)).toBe(1);
  });
});

describe('isGone', () => {
  const at = (x: number, y: number) => ({ x, y, vx: 0, vy: 0 });

  it('is still here inside the screen and just past the edge', () => {
    expect(isGone(at(400, 300), 0, 800, 600, 100)).toBe(false);
    expect(isGone(at(850, 300), 0, 800, 600, 100)).toBe(false);
    expect(isGone(at(400, -900), 0, 800, 600, 100)).toBe(false);
  });

  it('is gone far past the sides or the bottom', () => {
    expect(isGone(at(-101, 300), 0, 800, 600, 100)).toBe(true);
    expect(isGone(at(901, 300), 0, 800, 600, 100)).toBe(true);
    expect(isGone(at(400, 701), 0, 800, 600, 100)).toBe(true);
  });
});
