import { describe, expect, it } from 'vitest';
import { isDead, takeHit } from './health';

describe('takeHit', () => {
  it('takes lives away', () => {
    expect(takeHit(3, 1)).toBe(2);
  });

  it('never goes below zero', () => {
    expect(takeHit(1, 5)).toBe(0);
  });

  it('rejects negative damage', () => {
    expect(() => takeHit(3, -1)).toThrow(RangeError);
  });
});

describe('isDead', () => {
  it('is dead only when no lives are left', () => {
    expect(isDead(1)).toBe(false);
    expect(isDead(0)).toBe(true);
  });
});
