/** A pool that is spreading: where its two sides are, and how deep it is. */
export interface Spread {
  left: number;
  right: number;
  level: number;
}

/**
 * A pool spreads out over the floor: both its sides move outward at `speed` (pixels
 * per second) until they reach the sides of the area. Meanwhile its depth eases
 * toward `target`, in about `levelMs`.
 */
export function spreadStep(
  pool: Spread,
  target: number,
  areaLeft: number,
  areaRight: number,
  speed: number,
  levelMs: number,
  deltaMs: number,
): Spread {
  const step = speed * (deltaMs / 1000);
  return {
    left: Math.max(areaLeft, pool.left - step),
    right: Math.min(areaRight, pool.right + step),
    level: pool.level + (target - pool.level) * Math.min(1, deltaMs / levelMs),
  };
}

/** More is poured in: the pool gets `more` deeper, but never deeper than `most`. */
export function deeper(target: number, more: number, most: number): number {
  return Math.min(most, target + more);
}
