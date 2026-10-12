import { describe, expect, it } from 'vitest';
import { sharpness } from './sharp';

describe('sharpness', () => {
  it('is 1 on a plain screen that shows the game at its own size or smaller', () => {
    expect(sharpness(1, 1, 3)).toBe(1);
    expect(sharpness(1, 0.6, 3)).toBe(1);
  });

  it('draws more pixels on a screen that has more of them', () => {
    expect(sharpness(2, 1, 3)).toBe(2);
    expect(sharpness(2, 0.8, 3)).toBe(2);
    expect(sharpness(3, 0.5, 3)).toBe(2);
  });

  it('draws more pixels when the game is shown bigger', () => {
    expect(sharpness(1, 1.6, 3)).toBe(2);
    expect(sharpness(2, 1.3, 3)).toBe(3);
  });

  it('does not take a whole step more for a tiny bit over', () => {
    expect(sharpness(2, 1.04, 3)).toBe(2);
  });

  it('never goes over the most, or under 1', () => {
    expect(sharpness(3, 2, 2)).toBe(2);
    expect(sharpness(0, 1, 3)).toBe(1);
    expect(sharpness(Number.NaN, 1, 3)).toBe(1);
  });
});
