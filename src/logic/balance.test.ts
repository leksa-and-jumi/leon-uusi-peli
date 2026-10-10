import { describe, expect, it } from 'vitest';
import {
  isTall,
  leanAngle,
  leaning,
  leaningShape,
  overhang,
  rampSteps,
  supportSpan,
  toppled,
  topplePose,
} from './balance';

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

describe('leanAngle', () => {
  // A wall 128 tall stands with its right bottom corner at (100, 500)
  const crate = { left: 160, right: 216, top: 444, bottom: 500 };

  it('falls flat when nothing is in the way', () => {
    expect(leanAngle(100, 500, 1, 128, [])).toBeCloseTo(Math.PI / 2);
  });

  it('comes down on the top corner of a block and stays leaning there', () => {
    expect(leanAngle(100, 500, 1, 128, [crate])).toBeCloseTo(Math.atan2(60, 56));
  });

  it('works the same way falling left', () => {
    const left = { left: -16, right: 40, top: 444, bottom: 500 };
    expect(leanAngle(100, 500, -1, 128, [left])).toBeCloseTo(Math.atan2(60, 56));
  });

  it('leans with its tip against the side of something tall and far away', () => {
    const tower = { left: 200, right: 240, top: 200, bottom: 500 };
    expect(leanAngle(100, 500, 1, 128, [tower])).toBeCloseTo(Math.asin(100 / 128));
  });

  it('falls flat when the block is out of reach, behind it, or what it stands on', () => {
    const far = { left: 240, right: 296, top: 444, bottom: 500 };
    const behind = { left: 20, right: 76, top: 444, bottom: 500 };
    const under = { left: 60, right: 300, top: 500, bottom: 540 };
    expect(leanAngle(100, 500, 1, 128, [far, behind, under])).toBeCloseTo(Math.PI / 2);
  });

  it('stops at whatever it meets first', () => {
    const closer = { left: 120, right: 150, top: 420, bottom: 500 };
    expect(leanAngle(100, 500, 1, 128, [crate, closer])).toBeCloseTo(Math.atan2(20, 80));
  });

  it('leaves alone what sits on top of it once it leans', () => {
    const onTop = { left: 120, right: 150, top: 380, bottom: 420 };
    const leaning = Math.atan2(60, 56);
    expect(leanAngle(100, 500, 1, 128, [crate, onTop], leaning - 0.03)).toBeCloseTo(leaning);
  });
});

describe('leaningShape', () => {
  it('is the standing piece at no lean at all', () => {
    const shape = leaningShape(100, 1, 17, 128, 0);
    expect(shape.x).toBeCloseTo(83);
    expect(shape.halfWidth).toBeCloseTo(17);
    expect(shape.height).toBeCloseTo(128);
  });

  it('is the piece lying on its side at a quarter turn', () => {
    const flat = toppled({ x: 83, halfWidth: 17, height: 128 }, 1);
    const shape = leaningShape(100, 1, 17, 128, Math.PI / 2);
    expect(shape.x).toBeCloseTo(flat.x);
    expect(shape.halfWidth).toBeCloseTo(flat.halfWidth);
    expect(shape.height).toBeCloseTo(flat.height);
  });

  it('is a mirror image falling the other way', () => {
    const right = leaningShape(100, 1, 17, 128, 0.8);
    const left = leaningShape(100, -1, 17, 128, 0.8);
    expect(left.x - 100).toBeCloseTo(-(right.x - 100));
    expect(left.height).toBeCloseTo(right.height);
  });
});

describe('rampSteps', () => {
  const angle = Math.atan2(60, 56);
  const steps = rampSteps(100, 500, 1, 17, 128, angle, 14, 12);

  it('makes steps side by side from the low end to the high end', () => {
    const shape = leaningShape(100, 1, 17, 128, angle);
    expect(steps[0]?.left).toBeCloseTo(shape.x - shape.halfWidth);
    expect(steps.at(-1)?.right).toBeCloseTo(shape.x + shape.halfWidth);
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i]?.left).toBeCloseTo(steps[i - 1]?.right ?? NaN);
    }
  });

  it('climbs, never more than a step at a time', () => {
    for (let i = 1; i < steps.length; i++) {
      const up = (steps[i - 1]?.top ?? 0) - (steps[i]?.top ?? 0);
      expect(up).toBeGreaterThanOrEqual(0);
      expect(up).toBeLessThanOrEqual(14);
    }
  });

  it('never has a step upside down', () => {
    steps.forEach((step) => expect(step.bottom).toBeGreaterThan(step.top));
  });

  it('is one flat box for a piece lying on its side', () => {
    const flat = rampSteps(100, 500, 1, 17, 128, Math.PI / 2, 14, 12);
    expect(flat).toHaveLength(1);
    expect(flat[0]?.left).toBeCloseTo(100);
    expect(flat[0]?.right).toBeCloseTo(228);
    expect(flat[0]?.top).toBeCloseTo(466);
    expect(flat[0]?.bottom).toBeCloseTo(500);
  });

  it('mirrors for a piece that fell to the left', () => {
    const mirrored = rampSteps(100, 500, -1, 17, 128, angle, 14, 12);
    expect(mirrored[0]?.right).toBeCloseTo(200 - (steps[0]?.left ?? 0));
    expect(mirrored[0]?.top).toBeCloseTo(steps[0]?.top ?? NaN);
  });
});
