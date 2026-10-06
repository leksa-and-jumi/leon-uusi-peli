import type { Box } from './ground';

/** Where something stands: the middle of its bottom edge. */
export interface Spot {
  x: number;
  y: number;
}

/**
 * Which box is under the point, or `null` if none is. Boxes later in the list
 * are drawn on top, so they win when two overlap.
 */
export function boxAt(boxes: readonly Box[], px: number, py: number): number | null {
  for (let index = boxes.length - 1; index >= 0; index--) {
    const box = boxes[index];
    if (!box) continue;
    if (px >= box.left && px <= box.right && py >= box.top && py <= box.bottom) return index;
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
