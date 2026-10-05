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
