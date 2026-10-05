import type { Facing } from './walk';

/** The closest of the others, or `null` when there is nobody. */
export function nearestIndex(x: number, others: readonly number[]): number | null {
  let best: number | null = null;
  let bestDistance = Infinity;
  others.forEach((otherX, index) => {
    const distance = Math.abs(otherX - x);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}

export interface Chase {
  x: number;
  facing: Facing;
  /** Close enough to hit. */
  inReach: boolean;
}

/** Run toward the target and stop at arm's length from it. */
export function chaseStep(
  x: number,
  facing: Facing,
  targetX: number,
  reach: number,
  speed: number,
  deltaMs: number,
): Chase {
  const gap = targetX - x;
  const distance = Math.abs(gap);
  const toward: Facing = gap > 0 ? 1 : gap < 0 ? -1 : facing;
  if (distance <= reach) {
    return { x, facing: toward, inReach: true };
  }
  const step = Math.min(speed * (deltaMs / 1000), distance - reach);
  return { x: x + toward * step, facing: toward, inReach: distance - step <= reach };
}
