import { describe, expect, it } from 'vitest';
import { ceilingBounce, fallStep } from './fall';

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

describe('ceilingBounce', () => {
  it('changes nothing below the ceiling', () => {
    expect(ceilingBounce(400, -300, 120, 100, 0.4)).toEqual({ y: 400, speed: -300 });
  });

  it('stops at the ceiling and bounces back down', () => {
    expect(ceilingBounce(200, -300, 120, 100, 0.4)).toEqual({ y: 220, speed: 120 });
  });

  it('does not speed up something that is already coming down', () => {
    expect(ceilingBounce(200, 50, 120, 100, 0.4)).toEqual({ y: 220, speed: 50 });
  });
});
