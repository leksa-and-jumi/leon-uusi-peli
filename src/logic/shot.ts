import type { Box } from './ground';

/**
 * A bullet flying straight sideways at height `y` from `fromX` to `toX`:
 * which box does it hit first? `null` when it hits nothing on the way.
 */
export function sweepHit(
  fromX: number,
  toX: number,
  y: number,
  boxes: readonly Box[],
): number | null {
  const low = Math.min(fromX, toX);
  const high = Math.max(fromX, toX);
  const goingRight = toX >= fromX;
  let best: number | null = null;
  let bestEdge = goingRight ? Infinity : -Infinity;
  boxes.forEach((box, index) => {
    if (y < box.top || y > box.bottom) return;
    if (box.right < low || box.left > high) return;
    const edge = goingRight ? box.left : box.right;
    if (goingRight ? edge < bestEdge : edge > bestEdge) {
      best = index;
      bestEdge = edge;
    }
  });
  return best;
}

/** Is the way from `fromX` to `toX` at height `y` free of solids? */
export function canSee(fromX: number, toX: number, y: number, solids: readonly Box[]): boolean {
  return sweepHit(fromX, toX, y, solids) === null;
}
