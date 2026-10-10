import { describe, expect, it } from 'vitest';
import { chaseStep, floatStep, nearestIndex } from './chase';

describe('nearestIndex', () => {
  it('finds the closest one', () => {
    expect(nearestIndex(100, [400, 130, 20])).toBe(1);
  });

  it('finds nobody when alone', () => {
    expect(nearestIndex(100, [])).toBeNull();
  });
});

describe('chaseStep', () => {
  it('runs toward a target on the right', () => {
    expect(chaseStep(100, -1, 400, 50, 100, 1000)).toEqual({ x: 200, facing: 1, inReach: false });
  });

  it('runs toward a target on the left', () => {
    expect(chaseStep(400, 1, 100, 50, 100, 1000)).toEqual({ x: 300, facing: -1, inReach: false });
  });

  it('stops at arm’s length and does not run through the target', () => {
    expect(chaseStep(100, 1, 180, 50, 100, 1000)).toEqual({ x: 130, facing: 1, inReach: true });
  });

  it('stands still when already close enough', () => {
    expect(chaseStep(100, 1, 70, 50, 100, 1000)).toEqual({ x: 100, facing: -1, inReach: true });
  });

  it('keeps facing the same way when standing on the same spot', () => {
    expect(chaseStep(100, -1, 100, 50, 100, 1000).facing).toBe(-1);
  });
});

describe('floatStep', () => {
  it('floats straight toward the spot, sideways and up at once', () => {
    const next = floatStep(0, 0, 300, -400, 100, 1000);
    expect(next.x).toBeCloseTo(60);
    expect(next.y).toBeCloseTo(-80);
  });

  it('stops on the spot and does not float past it', () => {
    expect(floatStep(0, 0, 3, 4, 100, 1000)).toEqual({ x: 3, y: 4 });
  });

  it('stays where it is when it is there already', () => {
    expect(floatStep(50, 60, 50, 60, 100, 16)).toEqual({ x: 50, y: 60 });
  });
});
