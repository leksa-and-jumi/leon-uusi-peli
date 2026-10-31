import type { Box } from './ground';
import type { Spot } from './pick';
import type { Facing } from './walk';

/** How fast something was moved from one spot to another, in pixels per second. */
export function swingSpeed(from: Spot, to: Spot, deltaMs: number): number {
  if (deltaMs <= 0) return 0;
  return Math.hypot(to.x - from.x, to.y - from.y) / (deltaMs / 1000);
}

/** Does a swing count as a hit? It must be fast enough, and not too soon after the last hit. */
export function swingLands(
  speed: number,
  minSpeed: number,
  sinceLastHitMs: number,
  cooldownMs: number,
): boolean {
  return speed >= minSpeed && sinceLastHitMs >= cooldownMs;
}

/**
 * Which way a hit doll is knocked: the way the weapon was moving, or away from the
 * weapon when it moved straight up or down.
 */
export function swingDirection(movedX: number, weaponX: number, targetX: number): Facing {
  if (movedX > 0) return 1;
  if (movedX < 0) return -1;
  return targetX < weaponX ? -1 : 1;
}

/**
 * All the space a box went through when it moved here from `dx`, `dy` away: so that
 * something moved very fast still hits what was in its way, and doesn't jump past it.
 */
export function sweptBox(box: Box, dx: number, dy: number): Box {
  return {
    left: Math.min(box.left, box.left + dx),
    right: Math.max(box.right, box.right + dx),
    top: Math.min(box.top, box.top + dy),
    bottom: Math.max(box.bottom, box.bottom + dy),
  };
}
