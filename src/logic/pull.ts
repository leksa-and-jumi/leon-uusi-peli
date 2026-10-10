/** How a black hole pulls. Speeds are in pixels per second. */
export interface Pull {
  /** It pulls on everything closer than this. */
  radius: number;
  /** Right next to it, things come in this fast; at the edge of its reach, at `least`. */
  speed: number;
  least: number;
  /** Closer than this, a thing is swallowed. */
  eat: number;
}

/**
 * A black hole at (`holeX`, `holeY`) and a thing at (`x`, `y`): how far is the thing
 * pulled this frame? The closer it is, the faster it comes. Gives `null` when it is
 * out of reach, and `'eaten'` when it is close enough to be swallowed.
 */
export function pullStep(
  x: number,
  y: number,
  holeX: number,
  holeY: number,
  pull: Pull,
  deltaMs: number,
): { dx: number; dy: number } | 'eaten' | null {
  const gapX = holeX - x;
  const gapY = holeY - y;
  const distance = Math.hypot(gapX, gapY);
  if (distance > pull.radius) return null;
  if (distance <= pull.eat) return 'eaten';
  const closeness = 1 - distance / pull.radius;
  const speed = pull.least + (pull.speed - pull.least) * closeness * closeness;
  const step = Math.min(distance, speed * (deltaMs / 1000));
  return { dx: (gapX / distance) * step, dy: (gapY / distance) * step };
}
