import { describe, expect, it } from 'vitest';
import { aimAt, canSee, segmentHit, sweepHit } from './shot';

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

describe('segmentHit', () => {
  const low = { left: 200, right: 240, top: 380, bottom: 500 };
  const further = { left: 400, right: 440, top: 380, bottom: 500 };

  it('hits the first box on a straight line sideways', () => {
    expect(segmentHit(100, 420, 600, 420, [further, low])).toBe(1);
    expect(segmentHit(600, 420, 100, 420, [low, further])).toBe(1);
  });

  it('hits a box when shooting down at a slant', () => {
    expect(segmentHit(100, 100, 220, 440, [low])).toBe(0);
  });

  it('misses a box the line passes over', () => {
    expect(segmentHit(100, 100, 600, 150, [low, further])).toBeNull();
  });

  it('misses a box that is further than the bullet flies', () => {
    expect(segmentHit(100, 420, 150, 420, [low])).toBeNull();
  });

  it('hits straight down', () => {
    expect(segmentHit(220, 100, 220, 400, [low])).toBe(0);
    expect(segmentHit(260, 100, 260, 400, [low])).toBeNull();
  });

  it('hits at once when it starts inside a box', () => {
    expect(segmentHit(220, 420, 600, 420, [further, low])).toBe(1);
  });
});

describe('aimAt', () => {
  it('points from one spot to the other, with length 1', () => {
    expect(aimAt(0, 0, 30, 40, 1)).toEqual({ x: 0.6, y: 0.8 });
    expect(aimAt(100, 100, 0, 100, 1)).toEqual({ x: -1, y: 0 });
  });

  it('points straight ahead when there is nowhere to aim', () => {
    expect(aimAt(5, 5, 5, 5, -1)).toEqual({ x: -1, y: 0 });
  });
});
