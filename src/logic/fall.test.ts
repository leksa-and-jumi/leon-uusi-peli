import { describe, expect, it } from 'vitest';
import { fallStep } from './fall';

describe('fallStep', () => {
  it('falls faster and faster', () => {
    const first = fallStep({ y: 0, speed: 0, landed: false }, 1000, 500, 100);
    expect(first).toEqual({ y: 10, speed: 100, landed: false });
    const second = fallStep(first, 1000, 500, 100);
    expect(second).toEqual({ y: 30, speed: 200, landed: false });
  });

  it('stops exactly on the floor', () => {
    expect(fallStep({ y: 495, speed: 300, landed: false }, 1000, 500, 100)).toEqual({
      y: 500,
      speed: 0,
      landed: true,
    });
  });

  it('stays put after landing', () => {
    const landed = { y: 500, speed: 0, landed: true };
    expect(fallStep(landed, 1000, 500, 100)).toBe(landed);
  });
});
