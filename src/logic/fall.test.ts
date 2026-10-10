import { describe, expect, it } from 'vitest';
import { ceilingBounce, fallStep, springSpeed } from './fall';

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

describe('springSpeed', () => {
  const spring = { minSpeed: 140, keep: 0.85, boost: 150, dull: 0.55, most: 1100 };

  it('does not bounce something that lands softly', () => {
    expect(springSpeed(100, spring, true)).toBe(0);
    expect(springSpeed(100, spring, false)).toBe(0);
  });

  it('throws a doll back up with a boost', () => {
    expect(springSpeed(400, spring, true)).toBeCloseTo(490);
  });

  it('keeps a doll bouncing at the same height in the end', () => {
    let speed = 300;
    for (let i = 0; i < 150; i++) speed = springSpeed(speed, spring, true);
    expect(speed).toBeCloseTo(1000);
  });

  it('lets other things bounce lower and lower until they rest', () => {
    const first = springSpeed(600, spring, false);
    const second = springSpeed(first, spring, false);
    expect(first).toBeCloseTo(330);
    expect(second).toBeCloseTo(181.5);
    expect(springSpeed(springSpeed(second, spring, false), spring, false)).toBe(0);
  });

  it('never throws anything faster than its top speed', () => {
    expect(springSpeed(5000, spring, true)).toBe(1100);
  });
});
