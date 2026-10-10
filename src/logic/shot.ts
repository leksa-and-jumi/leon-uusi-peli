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

/**
 * A bullet flying in a straight line from one point to another, in any direction:
 * which box does it hit first? `null` when it hits nothing on the way. A bullet that
 * starts inside a box hits that box at once.
 */
export function segmentHit(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  boxes: readonly Box[],
): number | null {
  const dx = toX - fromX;
  const dy = toY - fromY;
  let best: number | null = null;
  let bestAt = Infinity;
  boxes.forEach((box, index) => {
    // How far along the line (0 = start, 1 = end) it is inside the box, sideways and up-down
    const across = span(fromX, dx, box.left, box.right);
    const upDown = span(fromY, dy, box.top, box.bottom);
    if (!across || !upDown) return;
    const enters = Math.max(across.from, upDown.from, 0);
    const leaves = Math.min(across.to, upDown.to, 1);
    if (enters > leaves || enters >= bestAt) return;
    best = index;
    bestAt = enters;
  });
  return best;
}

/** For which part of a move of `delta` from `start` a value is between `low` and `high`. */
function span(
  start: number,
  delta: number,
  low: number,
  high: number,
): { from: number; to: number } | null {
  if (delta === 0) {
    return start >= low && start <= high ? { from: -Infinity, to: Infinity } : null;
  }
  const a = (low - start) / delta;
  const b = (high - start) / delta;
  return { from: Math.min(a, b), to: Math.max(a, b) };
}

/**
 * Which way to shoot to hit a spot: an arrow of length 1 pointing from one point to
 * another. Points straight ahead (the way `facing` says) when both are the same spot.
 */
export function aimAt(
  fromX: number,
  fromY: number,
  atX: number,
  atY: number,
  facing: 1 | -1,
): { x: number; y: number } {
  const dx = atX - fromX;
  const dy = atY - fromY;
  const length = Math.hypot(dx, dy);
  return length === 0 ? { x: facing, y: 0 } : { x: dx / length, y: dy / length };
}

/**
 * The ways the bullets of one shot fly: `count` arrows of length 1, fanned out evenly
 * over `spread` radians around the way the gun is aimed. One bullet flies straight.
 */
export function fan(
  aim: { x: number; y: number },
  count: number,
  spread: number,
): { x: number; y: number }[] {
  const straight = Math.atan2(aim.y, aim.x);
  const ways: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const turn = count <= 1 ? 0 : (i / (count - 1) - 0.5) * spread;
    ways.push({ x: Math.cos(straight + turn), y: Math.sin(straight + turn) });
  }
  return ways;
}
