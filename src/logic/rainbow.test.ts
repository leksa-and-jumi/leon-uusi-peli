import { describe, expect, it } from 'vitest';
import { aimDrop, archTop, hopSpot } from './rainbow';

describe('archTop', () => {
  const feet = { x: 300, y: 600 };

  it('is highest in the middle', () => {
    expect(archTop(feet, 200, 150, 0)).toEqual({ x: 300, y: 450 });
  });

  it('comes down toward the ends', () => {
    const side = archTop(feet, 200, 150, 120);
    expect(side.x).toBe(420);
    expect(side.y).toBeCloseTo(600 - 150 * 0.8);
    expect(archTop(feet, 200, 150, -200).y).toBeCloseTo(600);
  });

  it('stays on the arch past its ends', () => {
    expect(archTop(feet, 200, 150, 260).y).toBeCloseTo(600);
  });
});

describe('hopSpot', () => {
  const from = { x: 0, y: 500 };
  const to = { x: 100, y: 300 };

  it('starts at the start and ends at the end', () => {
    expect(hopSpot(from, to, 0, 80)).toEqual(from);
    const end = hopSpot(from, to, 1, 80);
    expect(end.x).toBeCloseTo(100);
    expect(end.y).toBeCloseTo(300);
  });

  it('goes higher than the straight line halfway', () => {
    const half = hopSpot(from, to, 0.5, 80);
    expect(half.x).toBeCloseTo(50);
    expect(half.y).toBeCloseTo(400 - 80);
  });

  it('stays at the end once the jump is over', () => {
    expect(hopSpot(from, to, 3, 80).x).toBeCloseTo(100);
  });
});

describe('aimDrop', () => {
  it('goes sideways just enough to land on the spot', () => {
    // 450 pixels down at 900 takes a second
    expect(aimDrop({ x: 100, y: 100 }, { x: 250, y: 550 }, 900, 1000)).toBeCloseTo(150);
    expect(aimDrop({ x: 100, y: 100 }, { x: 0, y: 550 }, 900, 1000)).toBeCloseTo(-100);
  });

  it('is never too fast', () => {
    expect(aimDrop({ x: 0, y: 100 }, { x: 900, y: 550 }, 900, 300)).toBe(300);
  });

  it('copes with a spot above it', () => {
    expect(Number.isFinite(aimDrop({ x: 0, y: 500 }, { x: 10, y: 100 }, 900, 300))).toBe(true);
  });
});
