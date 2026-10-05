import type { Box } from './ground';
import type { Facing } from './walk';

/** Is the middle of the box inside the blast? */
export function inBlast(x: number, y: number, box: Box, radius: number): boolean {
  const middleX = (box.left + box.right) / 2;
  const middleY = (box.top + box.bottom) / 2;
  return Math.hypot(middleX - x, middleY - y) <= radius;
}

/** Which way something at `targetX` is thrown by a blast at `x`: away from it. */
export function blastDirection(x: number, targetX: number): Facing {
  return targetX < x ? -1 : 1;
}
