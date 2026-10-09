/** The space something takes up. `top` is a smaller number than `bottom`. */
export interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** A box for something `halfWidth` wide to each side and `height` tall, standing at (x, y). */
export function boxAround(x: number, y: number, halfWidth: number, height: number): Box {
  return { left: x - halfWidth, right: x + halfWidth, top: y - height, bottom: y };
}

/**
 * A box around something that has tipped over. It stands on (x, y) and reaches `height`
 * from there, turned by `rotation` (0 is upright, π/2 lies flat with its top to the right).
 */
export function tiltedBox(
  x: number,
  y: number,
  rotation: number,
  halfWidth: number,
  height: number,
): Box {
  const topX = x + Math.sin(rotation) * height;
  const topY = y - Math.cos(rotation) * height;
  return {
    left: Math.min(x, topX) - halfWidth,
    right: Math.max(x, topX) + halfWidth,
    top: Math.min(y, topY) - halfWidth * Math.abs(Math.sin(rotation)),
    bottom: Math.max(y, topY) + halfWidth * Math.abs(Math.sin(rotation)),
  };
}

/** Do the two boxes overlap? Just touching edges doesn't count. */
export function overlaps(a: Box, b: Box): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/**
 * The ground under something whose bottom is at `feetY`: the top of the highest solid
 * below it, or the floor. `slack` lets feet that have sunk a tiny bit still count as on top.
 */
export function groundBelow(
  left: number,
  right: number,
  feetY: number,
  solids: readonly Box[],
  floorY: number,
  slack: number,
): number {
  let ground = floorY;
  for (const solid of solids) {
    const under = solid.left < right && solid.right > left;
    if (under && solid.top >= feetY - slack && solid.top < ground) {
      ground = solid.top;
    }
  }
  return ground;
}

/**
 * Something put inside a solid is lifted up to stand on top of it (and on top of the
 * next one, if it is then inside that). Gives the new bottom of the box.
 */
export function liftOut(box: Box, solids: readonly Box[]): number {
  const height = box.bottom - box.top;
  let bottom = box.bottom;
  for (let tries = 0; tries < solids.length; tries++) {
    const moved = { ...box, top: bottom - height, bottom };
    const inside = solids.find((solid) => overlaps(moved, solid));
    if (!inside) break;
    bottom = inside.top;
  }
  return bottom;
}

/** A solid this close to your side still counts as in front of you, not as passed. */
const EDGE = 1;

/**
 * Walking from `fromX` toward `toX`: how far you get before a solid is in the way.
 * Solids no higher than `stepUp` above the feet don't block.
 */
export function blockedX(
  fromX: number,
  toX: number,
  halfWidth: number,
  feetY: number,
  height: number,
  solids: readonly Box[],
  stepUp: number,
): number {
  let x = toX;
  for (const solid of solids) {
    const inTheWay = solid.top < feetY - stepUp && solid.bottom > feetY - height;
    if (!inTheWay) continue;
    if (toX > fromX && solid.left >= fromX + halfWidth - EDGE) {
      x = Math.min(x, solid.left - halfWidth);
    } else if (toX < fromX && solid.right <= fromX - halfWidth + EDGE) {
      x = Math.max(x, solid.right + halfWidth);
    }
  }
  return x;
}

/**
 * The solid thing that is pressing on something from above or has landed in it: the
 * first one that overlaps `box` and is too tall to just step up onto. `undefined`
 * when nothing does.
 */
export function pressingOn(box: Box, solids: readonly Box[], stepUp: number): Box | undefined {
  return solids.find((solid) => overlaps(box, solid) && solid.top < box.bottom - stepUp);
}

/**
 * How far left (`least`) and right (`most`) the feet of a doll lying on the ground
 * may be, so that its body doesn't lie through anything solid standing on the same
 * ground. `side` is the way its head points (1 right, -1 left); `low` is how low a
 * thing may be for the doll to just lie over it, and things whose bottom is higher
 * than that above the ground lie on top of the doll and don't count.
 */
export function lyingRoom(
  x: number,
  y: number,
  side: number,
  halfWidth: number,
  height: number,
  solids: readonly Box[],
  room: { least: number; most: number },
  low: number,
): { least: number; most: number } {
  // The body reaches `height` toward the head and `halfWidth` the other way
  const toLeft = side > 0 ? halfWidth : height;
  const toRight = side > 0 ? height : halfWidth;
  let { least, most } = room;
  for (const solid of solids) {
    const onSameGround = solid.bottom > y - low && solid.top < y - low;
    const through = solid.left < x + toRight && solid.right > x - toLeft;
    if (!onSameGround || !through) continue;
    if ((solid.left + solid.right) / 2 >= x) {
      most = Math.min(most, solid.left - toRight);
    } else {
      least = Math.max(least, solid.right + toLeft);
    }
  }
  return { least, most };
}

/**
 * Does `box` stand on top of `under`? Its bottom has to be within `gap` of the top
 * of `under`, and it has to be over it sideways, give or take `reach` (how far
 * `under` has just moved).
 */
export function standsOn(box: Box, under: Box, gap: number, reach = 0): boolean {
  const onTop = Math.abs(box.bottom - under.top) <= gap;
  const over = box.left < under.right + reach && box.right > under.left - reach;
  return onTop && over;
}
