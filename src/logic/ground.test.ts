import { describe, expect, it } from 'vitest';
import {
  blockedX,
  boxAround,
  groundBelow,
  hurdle,
  liftOut,
  lyingRoom,
  overlaps,
  pressingOn,
  standsOn,
  tiltedBox,
} from './ground';

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

describe('tiltedBox', () => {
  it('is the same as an upright box when not turned', () => {
    expect(tiltedBox(100, 500, 0, 20, 120)).toEqual(boxAround(100, 500, 20, 120));
  });

  it('lies along the ground when turned flat to the right', () => {
    const box = tiltedBox(100, 500, Math.PI / 2, 20, 120);
    expect(box.left).toBeCloseTo(80);
    expect(box.right).toBeCloseTo(240);
    expect(box.top).toBeCloseTo(480);
    expect(box.bottom).toBeCloseTo(520);
  });

  it('lies the other way when turned flat to the left', () => {
    const box = tiltedBox(100, 500, -Math.PI / 2, 20, 120);
    expect(box.left).toBeCloseTo(-40);
    expect(box.right).toBeCloseTo(120);
  });

  it('hangs below the spot when turned upside down', () => {
    const box = tiltedBox(100, 300, Math.PI, 20, 120);
    expect(box.top).toBeCloseTo(300);
    expect(box.bottom).toBeCloseTo(420);
  });
});

describe('pressingOn', () => {
  const doll = { left: 80, right: 120, top: 380, bottom: 500 };

  it('finds a tall thing that has landed on the doll', () => {
    const fallen = { left: 90, right: 150, top: 340, bottom: 400 };
    expect(pressingOn(doll, [fallen], 20)).toBe(fallen);
  });

  it('ignores a low thing at the feet that can be stepped onto', () => {
    const plank = { left: 60, right: 200, top: 485, bottom: 500 };
    expect(pressingOn(doll, [plank], 20)).toBeUndefined();
  });

  it('ignores things that only touch or are somewhere else', () => {
    const beside = { left: 120, right: 180, top: 380, bottom: 500 };
    const above = { left: 80, right: 120, top: 300, bottom: 380 };
    expect(pressingOn(doll, [beside, above], 20)).toBeUndefined();
  });
});

describe('lyingRoom', () => {
  const room = { least: 0, most: 800 };
  const wallRight = { left: 460, right: 494, top: 372, bottom: 500 };

  it("leaves all the room when nothing stands in the body's way", () => {
    expect(lyingRoom(100, 500, 1, 24, 120, [wallRight], room, 20)).toEqual(room);
  });

  it('keeps the head out of a wall on the side it points to', () => {
    // Lying with the head to the right, the body reaches 120 that way
    expect(lyingRoom(400, 500, 1, 24, 120, [wallRight], room, 20)).toEqual({
      least: 0,
      most: 340,
    });
  });

  it('keeps the feet out of a wall behind them', () => {
    const wallLeft = { left: 360, right: 394, top: 372, bottom: 500 };
    expect(lyingRoom(400, 500, 1, 24, 120, [wallLeft], room, 20)).toEqual({
      least: 418,
      most: 800,
    });
  });

  it('works the same with the head to the left', () => {
    const wallLeft = { left: 300, right: 334, top: 372, bottom: 500 };
    expect(lyingRoom(400, 500, -1, 24, 120, [wallLeft], room, 20)).toEqual({
      least: 454,
      most: 800,
    });
  });

  it('ignores a thing that lies on top of the doll', () => {
    const crateOnDoll = { left: 420, right: 476, top: 404, bottom: 460 };
    expect(lyingRoom(400, 500, 1, 24, 120, [crateOnDoll], room, 20)).toEqual(room);
  });

  it('ignores a low thing the doll can lie over', () => {
    const plank = { left: 420, right: 560, top: 482, bottom: 500 };
    expect(lyingRoom(400, 500, 1, 24, 120, [plank], room, 20)).toEqual(room);
  });
});

describe('standsOn', () => {
  const car = { left: 100, right: 200, top: 460, bottom: 500 };

  it('is true for something standing on top', () => {
    expect(standsOn({ left: 120, right: 160, top: 340, bottom: 460 }, car, 3)).toBe(true);
    expect(standsOn({ left: 120, right: 160, top: 342, bottom: 462 }, car, 3)).toBe(true);
  });

  it('is false for something beside it, above it or on the ground next to it', () => {
    expect(standsOn({ left: 220, right: 260, top: 340, bottom: 460 }, car, 3)).toBe(false);
    expect(standsOn({ left: 120, right: 160, top: 300, bottom: 420 }, car, 3)).toBe(false);
    expect(standsOn({ left: 120, right: 160, top: 380, bottom: 500 }, car, 3)).toBe(false);
  });

  it('still counts something the carrier has just moved out from under a little', () => {
    const rider = { left: 201, right: 241, top: 340, bottom: 460 };
    expect(standsOn(rider, car, 3)).toBe(false);
    expect(standsOn(rider, car, 3, 4)).toBe(true);
  });
});

describe('hurdle', () => {
  const crate = { left: 120, right: 176, top: 444, bottom: 500 };

  it('says how high a low thing right in front is', () => {
    expect(hurdle(100, 500, 1, 20, 100, [crate], 20, 70)).toBe(56);
  });

  it('works the same way walking left', () => {
    expect(hurdle(196, 500, -1, 20, 100, [crate], 20, 70)).toBe(56);
  });

  it('finds nothing to jump when the way is free', () => {
    expect(hurdle(50, 500, 1, 20, 100, [crate], 20, 70)).toBeNull();
    expect(hurdle(100, 500, -1, 20, 100, [crate], 20, 70)).toBeNull();
  });

  it('can not jump onto something too tall', () => {
    const wall = { left: 120, right: 154, top: 372, bottom: 500 };
    expect(hurdle(100, 500, 1, 20, 100, [wall], 20, 70)).toBeNull();
  });

  it('counts the top of a pile, not just its lowest piece', () => {
    const upper = { left: 120, right: 176, top: 388, bottom: 444 };
    expect(hurdle(100, 500, 1, 20, 100, [crate, upper], 20, 70)).toBeNull();
    expect(hurdle(100, 500, 1, 20, 100, [crate, upper], 20, 120)).toBe(112);
  });

  it('leaves alone what can simply be stepped onto', () => {
    const plank = { left: 120, right: 260, top: 482, bottom: 500 };
    expect(hurdle(100, 500, 1, 20, 100, [plank], 20, 70)).toBeNull();
  });
});
