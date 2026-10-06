import { describe, expect, it } from 'vitest';
import { blockedX, boxAround, groundBelow, liftOut, overlaps } from './ground';

const crate = { left: 100, right: 160, top: 440, bottom: 500 };

describe('boxAround', () => {
  it('stands on (x, y)', () => {
    expect(boxAround(100, 500, 20, 120)).toEqual({ left: 80, right: 120, top: 380, bottom: 500 });
  });
});

describe('overlaps', () => {
  it('is true when boxes share space', () => {
    expect(overlaps(crate, { left: 150, right: 200, top: 400, bottom: 450 })).toBe(true);
  });

  it('is false when they only touch or are apart', () => {
    expect(overlaps(crate, { left: 160, right: 200, top: 440, bottom: 500 })).toBe(false);
    expect(overlaps(crate, { left: 100, right: 160, top: 380, bottom: 440 })).toBe(false);
    expect(overlaps(crate, { left: 300, right: 360, top: 440, bottom: 500 })).toBe(false);
  });
});

describe('groundBelow', () => {
  it('is the floor when nothing is under', () => {
    expect(groundBelow(300, 340, 200, [crate], 500, 2)).toBe(500);
  });

  it('is the top of a solid under the feet', () => {
    expect(groundBelow(120, 170, 200, [crate], 500, 2)).toBe(440);
  });

  it('picks the highest solid under the feet', () => {
    const upper = { left: 100, right: 160, top: 380, bottom: 440 };
    expect(groundBelow(120, 170, 200, [crate, upper], 500, 2)).toBe(380);
  });

  it('ignores solids whose top is above the feet', () => {
    expect(groundBelow(120, 170, 480, [crate], 500, 2)).toBe(500);
  });

  it('still stands on a solid when the feet have sunk a tiny bit', () => {
    expect(groundBelow(120, 170, 441, [crate], 500, 2)).toBe(440);
  });

  it('does not count a solid that only touches the side', () => {
    expect(groundBelow(160, 200, 200, [crate], 500, 2)).toBe(500);
  });
});

describe('liftOut', () => {
  it('leaves a free box alone', () => {
    expect(liftOut({ left: 300, right: 340, top: 380, bottom: 500 }, [crate])).toBe(500);
  });

  it('lifts a box out of a solid onto its top', () => {
    expect(liftOut({ left: 120, right: 170, top: 380, bottom: 500 }, [crate])).toBe(440);
  });

  it('keeps lifting through a stack', () => {
    const upper = { left: 100, right: 160, top: 380, bottom: 440 };
    expect(liftOut({ left: 120, right: 170, top: 380, bottom: 500 }, [crate, upper])).toBe(380);
  });
});

describe('blockedX', () => {
  it('walks freely when nothing is in the way', () => {
    expect(blockedX(20, 60, 20, 500, 120, [crate], 4)).toBe(60);
  });

  it('stops at a solid on the right', () => {
    expect(blockedX(60, 90, 20, 500, 120, [crate], 4)).toBe(80);
  });

  it('stops at a solid on the left', () => {
    expect(blockedX(200, 170, 20, 500, 120, [crate], 4)).toBe(180);
  });

  it('stays stopped when already standing against the solid', () => {
    expect(blockedX(80.0000001, 90, 20, 500, 120, [crate], 4)).toBe(80);
  });

  it('is not blocked by a solid under the feet', () => {
    expect(blockedX(120, 150, 20, 440, 120, [crate], 4)).toBe(150);
  });

  it('is not blocked by a solid above the head', () => {
    const high = { left: 100, right: 160, top: 300, bottom: 360 };
    expect(blockedX(60, 90, 20, 500, 120, [high], 4)).toBe(90);
  });

  it('does not block walking away from a solid', () => {
    expect(blockedX(80, 40, 20, 500, 120, [crate], 4)).toBe(40);
  });
});
