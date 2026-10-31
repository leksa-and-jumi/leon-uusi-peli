import { describe, expect, it } from 'vitest';
import {
  acos,
  asin,
  atan,
  atan2,
  cos,
  exp,
  hypot,
  log,
  pow,
  onlyHere,
  sameEverywhere,
  seededRandom,
  sin,
  tan,
} from './detMath';

/** Close enough to the browser's own: within a few in a hundred trillion. */
function near(ours: number, theirs: number): void {
  if (!Number.isFinite(theirs)) {
    expect(ours).toBe(theirs);
    return;
  }
  expect(Math.abs(ours - theirs)).toBeLessThanOrEqual(1e-13 * Math.max(1, Math.abs(theirs)));
}

const angles = [-1000, -7.5, -Math.PI, -2, -1, -0.3, 0, 1e-9, 0.2, 0.785, 1, 1.6, 3, 6.3, 42, 1e5];

describe('math that is the same everywhere', () => {
  it('turns like the browser does', () => {
    for (const x of angles) {
      near(sin(x), Math.sin(x));
      near(cos(x), Math.cos(x));
      if (Math.abs(Math.cos(x)) > 1e-3) near(tan(x), Math.tan(x));
    }
  });

  it('finds angles like the browser does', () => {
    for (const x of [-50, -2, -1, -0.6, -0.1, 0, 0.3, 0.5, 0.9, 1, 1.5, 3, 1e3, 1e25]) {
      near(atan(x), Math.atan(x));
    }
    for (const [y, x] of [
      [1, 1],
      [1, -1],
      [-1, -1],
      [-3, 0.5],
      [0, -2],
      [2, 0],
      [-2, 0],
      [0, 0],
    ] as const) {
      near(atan2(y, x), Math.atan2(y, x));
    }
    for (const x of [-1, -0.7, 0, 0.25, 0.99, 1]) {
      near(asin(x), Math.asin(x));
      near(acos(x), Math.acos(x));
    }
  });

  it('grows and shrinks like the browser does', () => {
    for (const x of [-800, -20, -1, -1e-5, 0, 0.5, 1, 3.7, 50, 700, 800]) near(exp(x), Math.exp(x));
    for (const x of [1e-310, 1e-5, 0.3, 1, 1.4142, 2, 10, 12345.678, 1e300]) {
      near(log(x), Math.log(x));
    }
    expect(log(0)).toBe(-Infinity);
    expect(log(-1)).toBeNaN();
    for (const [x, y] of [
      [2, 10],
      [3, -2],
      [-2, 3],
      [2, 0.5],
      [9, 0.25],
      [1.5, 2.7],
      [0, 3],
      [10, -1.2],
    ] as const) {
      near(pow(x, y), Math.pow(x, y));
    }
    near(hypot(3, 4), 5);
    near(hypot(1, 2, 3), Math.hypot(1, 2, 3));
  });

  it('makes the same random numbers from the same seed', () => {
    const one = seededRandom(42);
    const other = seededRandom(42);
    const numbers = Array.from({ length: 5 }, () => one());
    expect(Array.from({ length: 5 }, () => other())).toEqual(numbers);
    expect(numbers.every((n) => n >= 0 && n < 1)).toBe(true);
    expect(seededRandom(43)()).not.toBe(numbers[0]);
  });

  it('swaps the math in only while the game plays, and puts it back', () => {
    const before = Math.sin;
    const random = seededRandom(7);
    const inside = sameEverywhere(random, () => [Math.sin === sin, Math.random()]);
    expect(inside[0]).toBe(true);
    expect(inside[1]).toBe(seededRandom(7)());
    expect(Math.sin).toBe(before);
  });
});

describe('what only one player sees', () => {
  it('uses the page own random numbers, not the shared ones', () => {
    const shared = seededRandom(5);
    const [first, second] = sameEverywhere(shared, () => {
      const one = Math.random();
      onlyHere(() => Math.random());
      return [one, Math.random()];
    });
    const again = seededRandom(5);
    expect([first, second]).toEqual([again(), again()]);
  });
});
