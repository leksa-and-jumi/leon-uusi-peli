import type { PersonSize } from './place';

/** Where a person's feet are. */
export interface Spot {
  x: number;
  y: number;
}

/**
 * Which person is under the point, or `null` if none is. People later in the list
 * are drawn on top, so they win when two overlap.
 */
export function personAt(
  feet: readonly Spot[],
  px: number,
  py: number,
  size: PersonSize,
): number | null {
  for (let index = feet.length - 1; index >= 0; index--) {
    const spot = feet[index];
    if (!spot) continue;
    const insideX = Math.abs(px - spot.x) <= size.halfWidth;
    const insideY = py <= spot.y && py >= spot.y - size.height;
    if (insideX && insideY) return index;
  }
  return null;
}

/** A click on something, remembered so the next click can be checked against it. */
export interface Click {
  timeMs: number;
  target: unknown;
}

/** Is this the second click of a double-click on the same thing? */
export function isDoubleClick(previous: Click | null, now: Click, maxGapMs: number): boolean {
  if (!previous) return false;
  return previous.target === now.target && now.timeMs - previous.timeMs <= maxGapMs;
}
