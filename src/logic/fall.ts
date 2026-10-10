/** A person falling toward the floor. `y` is where the feet are. */
export interface Fall {
  y: number;
  /** Pixels per second, downward. */
  speed: number;
  landed: boolean;
}

/** Move a falling person forward by `deltaMs`. They stop when their feet reach the floor. */
export function fallStep(fall: Fall, gravity: number, floorY: number, deltaMs: number): Fall {
  if (fall.landed) return fall;
  const seconds = deltaMs / 1000;
  const speed = fall.speed + gravity * seconds;
  const y = fall.y + speed * seconds;
  if (y >= floorY) {
    return { y: floorY, speed: 0, landed: true };
  }
  return { y, speed, landed: false };
}

/**
 * Something flying up hits the ceiling: it stops there and bounces back down with
 * part of its speed. `y` is its bottom, `height` how tall it is, and a negative
 * `speed` is upward. Below the ceiling nothing changes.
 */
export function ceilingBounce(
  y: number,
  speed: number,
  height: number,
  ceilingY: number,
  bounce: number,
): { y: number; speed: number } {
  const lowest = ceilingY + height;
  if (y >= lowest) return { y, speed };
  return { y: lowest, speed: speed < 0 ? -speed * bounce : speed };
}

/** How a trampoline throws things back up. Speeds are in pixels per second. */
export interface Spring {
  /** Slower than this, a thing just lands on it. */
  minSpeed: number;
  /** A doll keeps this share of its speed and gets `boost` on top, so it never stops bouncing. */
  keep: number;
  boost: number;
  /** Everything else keeps only this share, so it bounces lower and lower and comes to rest. */
  dull: number;
  /** Nothing leaves it faster than this. */
  most: number;
}

/**
 * Something lands on a trampoline at `impact` pixels per second: how fast does it fly
 * back up? 0 when it is too slow to bounce at all. A `lively` thing (a doll) bounces
 * on and on; anything else loses speed with every bounce.
 */
export function springSpeed(impact: number, spring: Spring, lively: boolean): number {
  if (impact < spring.minSpeed) return 0;
  const speed = lively ? impact * spring.keep + spring.boost : impact * spring.dull;
  return Math.min(speed, spring.most);
}
