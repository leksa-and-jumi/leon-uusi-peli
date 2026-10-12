import { describe, expect, it } from 'vitest';
import { shadowOf } from './shadow';

const look = { alpha: 0.4, fadeHeight: 200, grow: 0.5 };

describe('shadowOf', () => {
  it('is right under a thing on the floor, as wide as the thing and at its darkest', () => {
    const shadow = shadowOf({ left: 100, right: 160, top: 400, bottom: 500 }, 500, look);
    expect(shadow).toEqual({ x: 130, halfWidth: 30, alpha: 0.4 });
  });

  it('is wider and fainter under a thing that is higher up', () => {
    const shadow = shadowOf({ left: 100, right: 160, top: 300, bottom: 400 }, 500, look);
    expect(shadow?.x).toBe(130);
    expect(shadow?.halfWidth).toBeCloseTo(37.5);
    expect(shadow?.alpha).toBeCloseTo(0.2);
  });

  it('is gone when the thing is too high up', () => {
    expect(shadowOf({ left: 100, right: 160, top: 100, bottom: 300 }, 500, look)).toBeNull();
    expect(shadowOf({ left: 100, right: 160, top: 0, bottom: 100 }, 500, look)).toBeNull();
  });

  it('is at its darkest for a thing that has sunk into the floor a little', () => {
    const shadow = shadowOf({ left: 0, right: 40, top: 480, bottom: 510 }, 500, look);
    expect(shadow?.alpha).toBe(0.4);
  });

  it('is nothing for a thing with no width', () => {
    expect(shadowOf({ left: 50, right: 50, top: 400, bottom: 500 }, 500, look)).toBeNull();
  });
});
