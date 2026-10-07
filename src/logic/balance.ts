import type { Box } from './ground';

/** The stretch of ground under something: from where to where it is held up. */
export interface Span {
  left: number;
  right: number;
}

/**
 * What something resting stands on: `'floor'`, the stretch of the solids right under
 * it (never wider than the thing itself), or `null` when nothing holds it up.
 */
export function supportSpan(
  box: Box,
  solids: readonly Box[],
  floorY: number,
  slack: number,
): Span | 'floor' | null {
  if (box.bottom >= floorY - slack) return 'floor';
  const under = solids.filter(
    (solid) =>
      Math.abs(solid.top - box.bottom) <= slack && solid.left < box.right && solid.right > box.left,
  );
  if (under.length === 0) return null;
  return {
    left: Math.max(box.left, Math.min(...under.map((solid) => solid.left))),
    right: Math.min(box.right, Math.max(...under.map((solid) => solid.right))),
  };
}

/**
 * Which way something tips: its heavy middle has to be over what holds it up.
 * -1 when the middle hangs out over the left end, 1 over the right end, 0 when it
 * is balanced. `give` is how far past the end the middle may be before it goes.
 */
export function leaning(middleX: number, span: Span, give: number): -1 | 0 | 1 {
  if (middleX < span.left - give) return -1;
  if (middleX > span.right + give) return 1;
  return 0;
}

/** Is it so much taller than it is wide that it falls over onto its side? */
export function isTall(halfWidth: number, height: number, ratio: number): boolean {
  return height >= halfWidth * 2 * ratio;
}

/** Where something is and how big it is, by the middle of its bottom edge. */
export interface Standing {
  x: number;
  halfWidth: number;
  height: number;
}

/**
 * Fall over onto one side, around the bottom corner on that side: what was the
 * height is now the width, and it lies beside where it stood.
 */
export function toppled(standing: Standing, direction: 1 | -1): Standing {
  const width = standing.halfWidth * 2;
  return {
    x: standing.x + direction * (standing.halfWidth + standing.height / 2),
    halfWidth: standing.height / 2,
    height: width,
  };
}

/**
 * Where to draw something that is falling over, and how far it has turned. It turns
 * around its bottom corner on the side it falls toward. `part` goes from 0 (still
 * standing at `fromX`) to 1 (flat on its side); `fromY` and `toY` are how high its
 * bottom is at the start and once it lies there. The drawing is anchored at the
 * middle of the bottom edge it had while standing.
 */
export function topplePose(
  fromX: number,
  fromY: number,
  toY: number,
  halfWidth: number,
  direction: 1 | -1,
  part: number,
): { x: number; y: number; rotation: number } {
  const done = Math.min(Math.max(part, 0), 1);
  const rotation = direction * done * (Math.PI / 2);
  const cornerX = fromX + direction * halfWidth;
  const groundY = fromY + (toY - fromY) * done;
  return {
    x: cornerX - direction * halfWidth * Math.cos(rotation),
    y: groundY - direction * halfWidth * Math.sin(rotation),
    rotation,
  };
}
