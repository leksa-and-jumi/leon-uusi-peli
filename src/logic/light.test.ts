import { describe, expect, it } from 'vitest';
import { angleBetween, inBeam, type Beam } from './light';

const right: Beam = { x: 100, y: 100, angle: 0, length: 200, spread: 0.3 };

describe('angleBetween', () => {
  it('is how far apart two angles are', () => {
    expect(angleBetween(0.5, 0.2)).toBeCloseTo(0.3);
    expect(angleBetween(0.2, 0.5)).toBeCloseTo(0.3);
  });

  it('goes the short way round', () => {
    expect(angleBetween(-3, 3)).toBeCloseTo(Math.PI * 2 - 6);
    expect(angleBetween(Math.PI * 2, 0)).toBeCloseTo(0);
  });
});

describe('inBeam', () => {
  it('lights up what is straight ahead', () => {
    expect(inBeam(right, 250, 100)).toBe(true);
  });

  it('lights up a little to the side, but not far to the side', () => {
    expect(inBeam(right, 250, 130)).toBe(true);
    expect(inBeam(right, 250, 200)).toBe(false);
  });

  it('does not reach farther than its length', () => {
    expect(inBeam(right, 320, 100)).toBe(false);
  });

  it('does not light up what is behind it', () => {
    expect(inBeam(right, 20, 100)).toBe(false);
  });

  it('points the way it is turned', () => {
    const down: Beam = { ...right, angle: Math.PI / 2 };
    expect(inBeam(down, 100, 250)).toBe(true);
    expect(inBeam(down, 250, 100)).toBe(false);
  });
});
