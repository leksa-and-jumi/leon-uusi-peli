import { describe, expect, it } from 'vitest';
import { stairSteps } from './stairs';

describe('stairSteps', () => {
  it('climbs to the right, one even step at a time', () => {
    const steps = stairSteps(100, 500, 40, 56, 4, 1);
    expect(steps).toHaveLength(4);
    expect(steps[0]).toEqual({ left: 60, right: 80, top: 486, bottom: 500 });
    expect(steps[3]).toEqual({ left: 120, right: 140, top: 444, bottom: 500 });
  });

  it('climbs to the left when turned around', () => {
    const steps = stairSteps(100, 500, 40, 56, 4, -1);
    expect(steps[0]).toEqual({ left: 120, right: 140, top: 486, bottom: 500 });
    expect(steps[3]).toEqual({ left: 60, right: 80, top: 444, bottom: 500 });
  });

  it('covers the whole width without gaps', () => {
    const steps = stairSteps(0, 0, 30, 60, 5, 1);
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i]?.left).toBeCloseTo(steps[i - 1]?.right ?? NaN);
    }
    expect(steps.at(-1)?.right).toBeCloseTo(30);
  });
});
