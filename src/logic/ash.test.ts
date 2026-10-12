import { describe, expect, it } from 'vitest';
import { blowOrder, blownOff, toArea, toPicture } from './ash';

describe('toArea and toPicture', () => {
  // Turned a quarter, twice as big, and moved to 100, 50
  const placing = { a: 0, b: 2, c: -2, d: 0, tx: 100, ty: 50 };

  it('places a spot of a picture in the area', () => {
    expect(toArea(placing, 0, 0)).toEqual({ x: 100, y: 50 });
    expect(toArea(placing, 10, 0)).toEqual({ x: 100, y: 70 });
    expect(toArea(placing, 0, 10)).toEqual({ x: 80, y: 50 });
  });

  it('finds the spot on the picture again', () => {
    const there = toArea(placing, 7, -3);
    const back = toPicture(placing, there.x, there.y);
    expect(back.x).toBeCloseTo(7);
    expect(back.y).toBeCloseTo(-3);
  });

  it('works for a picture that is flipped over', () => {
    const flipped = { a: -1, b: 0, c: 0, d: 1, tx: 30, ty: 0 };
    expect(toArea(flipped, 5, 2)).toEqual({ x: 25, y: 2 });
    expect(toPicture(flipped, 25, 2)).toEqual({ x: 5, y: 2 });
  });
});

describe('blowOrder', () => {
  const squares = [
    { x: 0, y: 0 },
    { x: 30, y: 0 },
    { x: 60, y: 0 },
  ];
  const steady = { topFirst: 0, ragged: 0 };

  it('takes the squares furthest downwind first', () => {
    expect(blowOrder(squares, 1, steady)).toEqual([2, 1, 0]);
    expect(blowOrder(squares, -1, steady)).toEqual([0, 1, 2]);
  });

  it('takes the high ones before the low ones', () => {
    const column = [
      { x: 0, y: 100 },
      { x: 0, y: 40 },
      { x: 0, y: 70 },
    ];
    expect(blowOrder(column, 1, { topFirst: 1, ragged: 0 })).toEqual([1, 2, 0]);
  });

  it('gives every square a turn, however ragged the edge', () => {
    let seed = 0;
    const random = (): number => (seed = (seed * 7 + 3) % 11) / 11;
    const order = blowOrder(squares, 1, { topFirst: 0.5, ragged: 200 }, random);
    expect([...order].sort()).toEqual([0, 1, 2]);
  });
});

describe('blownOff', () => {
  it('counts how many squares have gone', () => {
    expect(blownOff(200, 1)).toBe(0);
    expect(blownOff(200, 0.75)).toBe(50);
    expect(blownOff(200, 0)).toBe(200);
  });

  it('never goes past all or nothing', () => {
    expect(blownOff(200, 1.4)).toBe(0);
    expect(blownOff(200, -0.2)).toBe(200);
  });
});
