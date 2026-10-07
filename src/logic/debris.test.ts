import { describe, expect, it } from 'vitest';
import { crumbAlpha, crumbCount, crumbStep, scatter } from './debris';

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
