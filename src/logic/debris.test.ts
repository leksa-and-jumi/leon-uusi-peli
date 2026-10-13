import { describe, expect, it } from 'vitest';
import {
  crumbAlpha,
  crumbCount,
  crumbStep,
  scatter,
  settleTurn,
  materialOf,
  pickShard,
} from './debris';

const box = { left: 100, right: 160, top: 400, bottom: 460 };
const burst = { pushX: 50, pushY: -100, spread: 20, size: { min: 4, max: 8 }, spin: 6 };
const physics = {
  gravity: 1000,
  floorY: 500,
  left: 0,
  right: 800,
  bounce: 0.5,
  restSpeed: 60,
  slideMs: 200,
};

describe('crumbCount', () => {
  it('makes more pieces from bigger things', () => {
    expect(crumbCount(box, 300, 4, 30)).toBe(12);
  });

  it('never makes fewer than the least or more than the most', () => {
    expect(crumbCount(box, 300, 20, 30)).toBe(20);
    expect(crumbCount(box, 300, 2, 5)).toBe(5);
  });
});

describe('scatter', () => {
  it('starts every piece inside the thing that broke', () => {
    let seed = 0.21;
    const random = (): number => {
      seed = (seed * 7.77 + 0.31) % 1;
      return seed;
    };
    const crumbs = scatter(box, 25, burst, random);
    expect(crumbs).toHaveLength(25);
    for (const crumb of crumbs) {
      expect(crumb.x).toBeGreaterThanOrEqual(box.left);
      expect(crumb.x).toBeLessThanOrEqual(box.right);
      expect(crumb.y).toBeGreaterThanOrEqual(box.top);
      expect(crumb.y).toBeLessThanOrEqual(box.bottom);
      expect(crumb.size).toBeGreaterThanOrEqual(4);
      expect(crumb.size).toBeLessThanOrEqual(8);
      expect(crumb.ageMs).toBe(0);
    }
  });

  it('pushes the pieces the way of the burst, give or take the spread', () => {
    expect(scatter(box, 1, burst, () => 1)[0]).toMatchObject({ vx: 70, vy: -80 });
    expect(scatter(box, 1, burst, () => 0)[0]).toMatchObject({ vx: 30, vy: -120 });
  });
});

describe('crumbStep', () => {
  const crumb = { x: 100, y: 300, vx: 100, vy: 0, size: 5, turn: 0, spin: 2, ageMs: 0 };

  it('flies sideways, falls and turns', () => {
    const next = crumbStep(crumb, physics, 100);
    expect(next.x).toBeCloseTo(110);
    expect(next.vy).toBeCloseTo(100);
    expect(next.y).toBeCloseTo(310);
    expect(next.turn).toBeCloseTo(0.2);
    expect(next.ageMs).toBe(100);
  });

  it('bounces off the floor when it lands fast', () => {
    const next = crumbStep({ ...crumb, y: 495, vy: 400 }, physics, 100);
    expect(next.y).toBe(500);
    expect(next.vy).toBeCloseTo(-250);
  });

  it('lies still when it lands slowly', () => {
    const next = crumbStep({ ...crumb, y: 499.9, vy: 10 }, physics, 16);
    expect(next.y).toBe(500);
    expect(next.vy).toBe(0);
  });

  it('bounces back from the sides of the area', () => {
    const next = crumbStep({ ...crumb, x: 795, vx: 400 }, physics, 100);
    expect(next.x).toBe(800);
    expect(next.vx).toBeCloseTo(-200);
  });

  it('slides to a stop on the floor', () => {
    let lying = { ...crumb, y: 500, vy: 0 };
    for (let i = 0; i < 200; i++) {
      lying = crumbStep(lying, physics, 16);
    }
    expect(Math.abs(lying.vx)).toBeLessThan(1);
    expect(lying.y).toBe(500);
  });
});

describe('crumbAlpha', () => {
  it('stays solid while lying, then fades away', () => {
    expect(crumbAlpha(0, 2000, 1000)).toBe(1);
    expect(crumbAlpha(2000, 2000, 1000)).toBe(1);
    expect(crumbAlpha(2500, 2000, 1000)).toBeCloseTo(0.5);
    expect(crumbAlpha(3000, 2000, 1000)).toBe(0);
    expect(crumbAlpha(9000, 2000, 1000)).toBe(0);
  });
});

describe('settleTurn', () => {
  it('turns toward the closest way of lying flat', () => {
    expect(settleTurn(1, 1000, 100)).toBeCloseTo(Math.PI / 2);
    expect(settleTurn(-1, 1000, 100)).toBeCloseTo(-Math.PI / 2);
    expect(settleTurn(4, 1000, 100)).toBeCloseTo((3 * Math.PI) / 2);
  });

  it('gets there bit by bit', () => {
    const next = settleTurn(1, 50, 100);
    expect(next).toBeGreaterThan(1);
    expect(next).toBeLessThan(Math.PI / 2);
  });

  it('stays put once it lies flat', () => {
    expect(settleTurn(Math.PI / 2, 16, 100)).toBeCloseTo(Math.PI / 2);
  });
});

describe('materialOf', () => {
  it('goes by what the thing says it is made of, first of all', () => {
    expect(materialOf({ burns: true }, 'straw')).toBe('straw');
    expect(materialOf({}, 'brick')).toBe('brick');
  });

  it('works it out from what the thing does, otherwise', () => {
    expect(materialOf({ fragile: {} })).toBe('glass');
    expect(materialOf({ burns: true })).toBe('wood');
    expect(materialOf({ metal: true })).toBe('metal');
    expect(materialOf({})).toBe('other');
  });

  it('takes what breaks at a touch for glass, whatever else it is', () => {
    expect(materialOf({ fragile: {}, metal: true })).toBe('glass');
  });
});

describe('pickShard', () => {
  const kinds = [
    { share: 3, shape: 'bar' as const, long: { min: 10, max: 20 }, wide: { min: 4, max: 6 } },
    {
      share: 1,
      shape: 'chip' as const,
      long: { min: 2, max: 4 },
      wide: { min: 2, max: 4 },
      alpha: 0.5,
    },
  ];
  const rolls = (...numbers: number[]): (() => number) => {
    let next = 0;
    return () => numbers[next++ % numbers.length] ?? 0;
  };

  it('picks a kind of piece by its share', () => {
    expect(pickShard(kinds, rolls(0, 0, 0)).shape).toBe('bar');
    expect(pickShard(kinds, rolls(0.7, 0, 0)).shape).toBe('bar');
    expect(pickShard(kinds, rolls(0.8, 0, 0)).shape).toBe('chip');
  });

  it('gives it a size between the smallest and the biggest of its kind', () => {
    expect(pickShard(kinds, rolls(0, 0, 0))).toEqual({ shape: 'bar', long: 10, wide: 4, alpha: 1 });
    const middle = pickShard(kinds, rolls(0, 0.5, 0.5));
    expect(middle.long).toBeCloseTo(15);
    expect(middle.wide).toBeCloseTo(5);
  });

  it('keeps how see-through the kind is', () => {
    expect(pickShard(kinds, rolls(0.9, 0, 0)).alpha).toBe(0.5);
  });

  it('gives a plain piece when there is no kind to pick from', () => {
    expect(pickShard([], rolls(0.5)).shape).toBe('bar');
  });
});
