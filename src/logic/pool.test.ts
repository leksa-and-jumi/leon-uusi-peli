import { describe, expect, it } from 'vitest';
import { deeper, spreadStep } from './pool';

describe('spreadStep', () => {
  const pool = { left: 400, right: 500, level: 80 };

  it('moves both sides outward', () => {
    const next = spreadStep(pool, 80, 0, 1000, 200, 400, 500);
    expect(next.left).toBe(300);
    expect(next.right).toBe(600);
  });

  it('stops at the sides of the area', () => {
    const next = spreadStep(pool, 80, 350, 520, 200, 400, 1000);
    expect(next.left).toBe(350);
    expect(next.right).toBe(520);
  });

  it('rises toward its new depth bit by bit', () => {
    const next = spreadStep(pool, 120, 0, 1000, 200, 400, 100);
    expect(next.level).toBeCloseTo(90);
  });

  it('drains toward nothing when the target is 0', () => {
    let draining = pool;
    for (let i = 0; i < 100; i++) draining = spreadStep(draining, 0, 0, 1000, 200, 400, 100);
    expect(draining.level).toBeLessThan(0.01);
  });
});

describe('deeper', () => {
  it('adds to the depth', () => {
    expect(deeper(80, 40, 260)).toBe(120);
  });

  it('never goes over the most', () => {
    expect(deeper(240, 40, 260)).toBe(260);
  });
});
