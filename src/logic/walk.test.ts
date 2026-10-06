import { describe, expect, it } from 'vitest';
import { walkStep } from './walk';

describe('walkStep', () => {
  it('walks the way the person faces', () => {
    expect(walkStep({ x: 100, facing: 1 }, 50, 1000, 0, 800)).toEqual({ x: 150, facing: 1 });
    expect(walkStep({ x: 100, facing: -1 }, 50, 1000, 0, 800)).toEqual({ x: 50, facing: -1 });
  });

  it('turns around at the right edge', () => {
    expect(walkStep({ x: 790, facing: 1 }, 50, 1000, 0, 800)).toEqual({ x: 800, facing: -1 });
  });

  it('turns around at the left edge', () => {
    expect(walkStep({ x: 10, facing: -1 }, 50, 1000, 0, 800)).toEqual({ x: 0, facing: 1 });
  });
});
