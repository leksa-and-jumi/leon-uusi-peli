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
