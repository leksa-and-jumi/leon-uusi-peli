import { describe, expect, it } from 'vitest';
import { canSee, sweepHit } from './shot';

const near = { left: 200, right: 240, top: 380, bottom: 500 };
const far = { left: 400, right: 440, top: 380, bottom: 500 };

describe('sweepHit', () => {
  it('hits the first box on the way to the right', () => {
    expect(sweepHit(100, 600, 420, [far, near])).toBe(1);
  });

  it('hits the first box on the way to the left', () => {
    expect(sweepHit(600, 100, 420, [near, far])).toBe(1);
  });

  it('hits nothing when the boxes are further than the bullet flies', () => {
    expect(sweepHit(100, 150, 420, [near, far])).toBeNull();
  });

  it('flies over a box that is lower than the bullet', () => {
    expect(sweepHit(100, 600, 300, [near, far])).toBeNull();
  });

  it('does not hit boxes behind the start', () => {
    expect(sweepHit(300, 350, 420, [near])).toBeNull();
  });
});

describe('canSee', () => {
  it('sees past when nothing is between', () => {
    expect(canSee(250, 390, 420, [near, far])).toBe(true);
  });

  it('cannot see through a wall', () => {
    expect(canSee(100, 300, 420, [near])).toBe(false);
  });
});
