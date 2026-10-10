import { describe, expect, it } from 'vitest';
import { jagged } from './bolt';

describe('jagged', () => {
  it('starts and ends exactly where it should', () => {
    const corners = jagged(10, 20, 110, 220, 8, 30);
    expect(corners).toHaveLength(9);
    expect(corners[0]).toEqual({ x: 10, y: 20 });
    expect(corners[8]).toEqual({ x: 110, y: 220 });
  });

  it('is a straight line when nothing strays', () => {
    const corners = jagged(0, 0, 100, 0, 4, 30, () => 0.5);
    expect(corners.map((corner) => corner.x)).toEqual([0, 25, 50, 75, 100]);
    corners.forEach((corner) => expect(corner.y).toBeCloseTo(0));
  });

  it('lets the corners in between stray to the side, but no further than the sway', () => {
    const corners = jagged(0, 0, 0, 100, 5, 12, () => 1);
    corners.slice(1, -1).forEach((corner) => expect(Math.abs(corner.x)).toBeCloseTo(12));
    expect(corners[2]?.y).toBeCloseTo(40);
  });

  it('is a single bit when asked for less than one', () => {
    expect(jagged(0, 0, 10, 10, 0, 5)).toHaveLength(2);
  });
});
