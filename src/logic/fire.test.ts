import { describe, expect, it } from 'vitest';
import { flameAt, mixColors } from './fire';

describe('mixColors', () => {
  it('gives the first color, the second, or one in between', () => {
    expect(mixColors(0x000000, 0xffffff, 0)).toBe(0x000000);
    expect(mixColors(0x000000, 0xffffff, 1)).toBe(0xffffff);
    expect(mixColors(0xff0000, 0x0000ff, 0.5)).toBe(0x800080);
  });

  it('never goes past either color', () => {
    expect(mixColors(0x102030, 0x405060, -1)).toBe(0x102030);
    expect(mixColors(0x102030, 0x405060, 2)).toBe(0x405060);
  });
});

describe('flameAt', () => {
  const look = {
    colors: [
      { at: 0, color: 0xffffff },
      { at: 0.5, color: 0xff8000 },
      { at: 1, color: 0x400000 },
    ],
    small: 0.5,
    big: 2,
    alpha: 0.8,
    fadeFrom: 0.6,
    rise: 20,
  };

  it('is small, bright and low when it is lit', () => {
    expect(flameAt(0, look)).toEqual({ color: 0xffffff, scale: 0.5, alpha: 0.8, rise: 0 });
  });

  it('goes through its colors as it burns', () => {
    expect(flameAt(0.5, look).color).toBe(0xff8000);
    expect(flameAt(0.25, look).color).toBe(mixColors(0xffffff, 0xff8000, 0.5));
    expect(flameAt(1, look).color).toBe(0x400000);
  });

  it('grows and rises all the time', () => {
    const young = flameAt(0.2, look);
    const old = flameAt(0.8, look);
    expect(old.scale).toBeGreaterThan(young.scale);
    expect(old.rise).toBeGreaterThan(young.rise);
    expect(flameAt(1, look).scale).toBeCloseTo(2);
    expect(flameAt(1, look).rise).toBeCloseTo(20);
  });

  it('fades to nothing at the end', () => {
    expect(flameAt(0.6, look).alpha).toBeCloseTo(0.8);
    expect(flameAt(0.8, look).alpha).toBeCloseTo(0.4);
    expect(flameAt(1, look).alpha).toBeCloseTo(0);
  });

  it('stays what it was at the start and at the end for a moment outside its life', () => {
    expect(flameAt(-1, look)).toEqual(flameAt(0, look));
    expect(flameAt(3, look).color).toBe(0x400000);
  });
});
