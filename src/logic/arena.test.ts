import { describe, expect, it } from 'vitest';
import { layOutArena } from './arena';

const sizes = {
  crate: { halfWidth: 28, height: 56 },
  steelCrate: { halfWidth: 28, height: 56 },
  plank: { halfWidth: 70, height: 18 },
  girder: { halfWidth: 90, height: 14 },
  stone: { halfWidth: 30, height: 30 },
  hay: { halfWidth: 34, height: 42 },
  fence: { halfWidth: 50, height: 46 },
  barrel: { halfWidth: 19, height: 50 },
  trampoline: { halfWidth: 46, height: 24 },
};
const rules = { mid: 240, far: 420, middleChance: 0.85, placeChance: 0.9 };

/** Numbers like `Math.random`'s, but the same every time for the same seed. */
const seeded = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
};

describe('layOutArena', () => {
  it('is the same on both sides of the middle', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const pieces = layOutArena(sizes, rules, seeded(seed));
      for (const piece of pieces) {
        const twin = pieces.some(
          (other) =>
            other.kind === piece.kind &&
            Math.abs(other.dx + piece.dx) < 0.001 &&
            other.up === piece.up,
        );
        expect(twin).toBe(true);
      }
    }
  });

  it('is never empty, and different from one time to the next', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
      const pieces = layOutArena(sizes, rules, seeded(seed));
      expect(pieces.length).toBeGreaterThanOrEqual(2);
      seen.add(JSON.stringify(pieces));
    }
    expect(seen.size).toBeGreaterThan(20);
  });

  it('puts the pieces bottom first, and nothing below the floor', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const pieces = layOutArena(sizes, rules, seeded(seed));
      pieces.forEach((piece, index) => {
        expect(piece.up).toBeGreaterThanOrEqual(0);
        expect(piece.up).toBeGreaterThanOrEqual(pieces[index - 1]?.up ?? 0);
      });
    }
  });

  it('rests every piece that is off the floor on a piece right under it', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const pieces = layOutArena(sizes, rules, seeded(seed));
      for (const piece of pieces.filter((one) => one.up > 0)) {
        const held = pieces.some((under) => {
          const top = under.up + sizes[under.kind].height;
          const reach = sizes[under.kind].halfWidth + sizes[piece.kind].halfWidth;
          return top === piece.up && Math.abs(under.dx - piece.dx) < reach;
        });
        expect(held).toBe(true);
      }
    }
  });

  it('keeps everything a doll must climb within a jump', () => {
    // No single piece on the floor is taller than a crate, which a doll can jump onto
    for (let seed = 1; seed <= 60; seed++) {
      for (const piece of layOutArena(sizes, rules, seeded(seed))) {
        if (piece.up === 0) expect(sizes[piece.kind].height).toBeLessThanOrEqual(56);
      }
    }
  });

  it('stays within the area, which is 560 to either side of its middle', () => {
    for (let seed = 1; seed <= 60; seed++) {
      for (const piece of layOutArena(sizes, rules, seeded(seed))) {
        expect(Math.abs(piece.dx) + sizes[piece.kind].halfWidth).toBeLessThanOrEqual(560);
      }
    }
  });

  it('keeps the things on the sides clear of the thing in the middle', () => {
    // Nothing on the floor overlaps anything else on the floor
    for (let seed = 1; seed <= 60; seed++) {
      const floor = layOutArena(sizes, rules, seeded(seed)).filter((piece) => piece.up === 0);
      floor.forEach((piece, index) => {
        for (const other of floor.slice(index + 1)) {
          const apart = Math.abs(piece.dx - other.dx);
          expect(apart).toBeGreaterThanOrEqual(
            sizes[piece.kind].halfWidth + sizes[other.kind].halfWidth - 0.001,
          );
        }
      });
    }
  });
});
