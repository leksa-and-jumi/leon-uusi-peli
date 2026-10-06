/** Someone thrown through the air. Speeds are in pixels per second. */
export interface Flying {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/** Move a flying person forward by `deltaMs`: sideways steadily, and pulled down. */
export function flyStep(flying: Flying, gravity: number, deltaMs: number): Flying {
  const seconds = deltaMs / 1000;
  const vy = flying.vy + gravity * seconds;
  return {
    x: flying.x + flying.vx * seconds,
    y: flying.y + vy * seconds,
    vx: flying.vx,
    vy,
  };
}

/** Throw toward the closer side edge, so the person is sure to fly off the screen. */
export function throwDirection(x: number, left: number, right: number): 1 | -1 {
  return x - left < right - x ? -1 : 1;
}

/** Has the person flown `margin` past the sides or the bottom? */
export function isGone(
  flying: Flying,
  left: number,
  right: number,
  bottom: number,
  margin: number,
): boolean {
  return flying.x < left - margin || flying.x > right + margin || flying.y > bottom + margin;
}
