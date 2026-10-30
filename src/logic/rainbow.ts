import { clamp } from './bounds';
import type { Spot } from './pick';

/**
 * The spot on top of an arch, `dx` from its middle. The arch stands with its feet at
 * `feet`, reaches `halfWidth` to each side and is `height` high in the middle.
 */
export function archTop(feet: Spot, halfWidth: number, height: number, dx: number): Spot {
  const across = clamp(dx / halfWidth, -1, 1);
  return { x: feet.x + dx, y: feet.y - height * Math.sqrt(1 - across * across) };
}

/**
 * Where a jump from `from` to `to` is when it is `part` of the way there (0 to 1):
 * along the straight line between them, and `up` higher than it at the top of the jump.
 */
export function hopSpot(from: Spot, to: Spot, part: number, up: number): Spot {
  const done = clamp(part, 0, 1);
  return {
    x: from.x + (to.x - from.x) * done,
    y: from.y + (to.y - from.y) * done - up * Math.sin(Math.PI * done),
  };
}

/**
 * How fast sideways something let go of at `from` has to go to land on `to`, falling
 * with `gravity` (pixels per second, every second). Never faster than `most` either way.
 */
export function aimDrop(from: Spot, to: Spot, gravity: number, most: number): number {
  const fall = Math.max(to.y - from.y, 1);
  const seconds = Math.sqrt((2 * fall) / gravity);
  return clamp((to.x - from.x) / seconds, -most, most);
}
