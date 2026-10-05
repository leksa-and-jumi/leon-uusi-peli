import { describe, expect, it } from 'vitest';
import { chaseStep, nearestIndex } from './chase';

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
