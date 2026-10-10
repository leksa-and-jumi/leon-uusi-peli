import { describe, expect, it } from 'vitest';
import { isTall, leaning, overhang, supportSpan, toppled, topplePose } from './balance';

const wall = { left: 100, right: 140, top: 400, bottom: 500 };

describe('supportSpan', () => {
  it('is the floor for something standing on the floor', () => {
    expect(supportSpan({ left: 0, right: 50, top: 450, bottom: 500 }, [wall], 500, 2)).toBe(
      'floor',
    );
  });

  it('is the part of the solid right under it', () => {
    const beam = { left: 60, right: 240, top: 386, bottom: 400 };
    expect(supportSpan(beam, [wall], 500, 2)).toEqual({ left: 100, right: 140 });
  });

  it('is never wider than the thing itself', () => {
    const small = { left: 110, right: 160, top: 380, bottom: 400 };
    expect(supportSpan(small, [wall], 500, 2)).toEqual({ left: 110, right: 140 });
  });

  it('reaches from the first support to the last when it lies across two', () => {
    const other = { left: 300, right: 340, top: 400, bottom: 500 };
    const beam = { left: 90, right: 350, top: 386, bottom: 400 };
    expect(supportSpan(beam, [wall, other], 500, 2)).toEqual({ left: 100, right: 340 });
  });

  it('is nothing when no solid is right under it', () => {
    const floating = { left: 100, right: 140, top: 300, bottom: 350 };
    expect(supportSpan(floating, [wall], 500, 2)).toBeNull();
  });
});

describe('leaning', () => {
  const span = { left: 100, right: 140 };

  it('is balanced with the middle over the support', () => {
    expect(leaning(120, span, 1)).toBe(0);
    expect(leaning(100, span, 1)).toBe(0);
  });

  it('tips toward the side its middle hangs over', () => {
    expect(leaning(90, span, 1)).toBe(-1);
    expect(leaning(150, span, 1)).toBe(1);
  });

  it('gives a little before it goes', () => {
    expect(leaning(140.5, span, 1)).toBe(0);
  });
});

describe('isTall', () => {
  it('is true for something much taller than wide', () => {
    expect(isTall(17, 128, 1.6)).toBe(true);
  });

  it('is false for crates and beams', () => {
    expect(isTall(28, 56, 1.6)).toBe(false);
    expect(isTall(90, 14, 1.6)).toBe(false);
  });
});

describe('toppled', () => {
  it('lies beside where it stood, as wide as it was tall', () => {
    expect(toppled({ x: 100, halfWidth: 20, height: 120 }, 1)).toEqual({
      x: 180,
      halfWidth: 60,
      height: 40,
    });
    expect(toppled({ x: 100, halfWidth: 20, height: 120 }, -1).x).toBe(20);
  });
});

describe('topplePose', () => {
  it('starts standing where it stood', () => {
    const pose = topplePose(100, 500, 500, 20, 1, 0);
    expect(pose.x).toBeCloseTo(100);
    expect(pose.y).toBeCloseTo(500);
    expect(pose.rotation).toBeCloseTo(0);
  });

  it('ends flat on its side, turned a quarter of the way around its corner', () => {
    const right = topplePose(100, 500, 500, 20, 1, 1);
    expect(right.x).toBeCloseTo(120);
    expect(right.y).toBeCloseTo(480);
    expect(right.rotation).toBeCloseTo(Math.PI / 2);
    const left = topplePose(100, 500, 500, 20, -1, 1);
    expect(left.x).toBeCloseTo(80);
    expect(left.y).toBeCloseTo(480);
    expect(left.rotation).toBeCloseTo(-Math.PI / 2);
  });

  it('ends at the height where it comes to lie', () => {
    expect(topplePose(100, 500, 460, 20, 1, 1).y).toBeCloseTo(440);
  });

  it('does not go past flat', () => {
    expect(topplePose(100, 500, 500, 20, 1, 3).rotation).toBeCloseTo(Math.PI / 2);
  });
});

describe('overhang', () => {
  it('lets a long, flat piece hang far out', () => {
    expect(overhang(64, 34, 1, 1.6, 0.7)).toBeCloseTo(44.8);
  });

  it('gives a piece that is not long only the usual little bit', () => {
    expect(overhang(28, 56, 1, 1.6, 0.7)).toBe(1);
    expect(overhang(17, 128, 1, 1.6, 0.7)).toBe(1);
  });

  it('never gives less than the usual little bit', () => {
    expect(overhang(2, 1, 5, 1.6, 0.7)).toBe(5);
  });
});
