import { describe, expect, it } from 'vitest';
import { swingDirection, swingLands, swingSpeed } from './swing';

describe('swingSpeed', () => {
  it('is the distance moved in a second', () => {
    expect(swingSpeed({ x: 0, y: 0 }, { x: 30, y: 40 }, 100)).toBeCloseTo(500);
  });

  it('is zero when no time has passed', () => {
    expect(swingSpeed({ x: 0, y: 0 }, { x: 30, y: 40 }, 0)).toBe(0);
  });
});

describe('swingLands', () => {
  it('lands when fast enough and the last hit was a while ago', () => {
    expect(swingLands(900, 600, 500, 400)).toBe(true);
  });

  it('does not land when too slow', () => {
    expect(swingLands(300, 600, 500, 400)).toBe(false);
  });

  it('does not land again right after a hit', () => {
    expect(swingLands(900, 600, 100, 400)).toBe(false);
  });
});

describe('swingDirection', () => {
  it('knocks the doll the way the weapon moves', () => {
    expect(swingDirection(12, 100, 50)).toBe(1);
    expect(swingDirection(-12, 100, 150)).toBe(-1);
  });

  it('knocks away from the weapon when it moves straight down', () => {
    expect(swingDirection(0, 100, 50)).toBe(-1);
    expect(swingDirection(0, 100, 150)).toBe(1);
  });
});
