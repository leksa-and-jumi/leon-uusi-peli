import { describe, expect, it } from 'vitest';
import { gearHit } from './gear';

const order = ['arm', 'chest', 'head'] as const;

describe('gearHit', () => {
  it('is nothing for a doll that wears nothing', () => {
    expect(gearHit([], order, 1)).toBeNull();
  });

  it('lets the outermost piece take the hit', () => {
    const worn = [
      { slot: 'head' as const, left: 3 },
      { slot: 'chest' as const, left: 5 },
    ];
    expect(gearHit(worn, order, 1)).toEqual({ slot: 'chest', left: 4 });
  });

  it('wears the piece down by as much as the hit would have taken', () => {
    expect(gearHit([{ slot: 'chest' as const, left: 5 }], order, 2)).toEqual({
      slot: 'chest',
      left: 3,
    });
  });

  it('breaks the piece when the hit is more than it can take, and no more than that', () => {
    expect(gearHit([{ slot: 'head' as const, left: 3 }], order, 99)).toEqual({
      slot: 'head',
      left: 0,
    });
  });

  it('wears a piece down by 1 at least', () => {
    expect(gearHit([{ slot: 'head' as const, left: 3 }], order, 0)).toEqual({
      slot: 'head',
      left: 2,
    });
  });

  it('skips a piece that is broken already', () => {
    const worn = [
      { slot: 'arm' as const, left: 0 },
      { slot: 'head' as const, left: 2 },
    ];
    expect(gearHit(worn, order, 1)).toEqual({ slot: 'head', left: 1 });
  });
});
