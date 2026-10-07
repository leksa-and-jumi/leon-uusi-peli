import type { Box } from './ground';

/** A small piece of something that broke. Speeds are in pixels per second. */
export interface Crumb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  /** How far it has turned, and how fast it turns (radians, radians per second). */
  turn: number;
  spin: number;
  ageMs: number;
}

/** How pieces fly out when something breaks. */
export interface Burst {
  /** Every piece gets this push, in pixels per second. */
  pushX: number;
  pushY: number;
  /** And a random extra push of at most this much in any direction. */
  spread: number;
  size: { min: number; max: number };
  /** The most a piece can spin, in radians per second. */
  spin: number;
}

/** How many pieces something of this size breaks into. */
export function crumbCount(box: Box, areaPerCrumb: number, least: number, most: number): number {
  const area = (box.right - box.left) * (box.bottom - box.top);
  return Math.min(Math.max(Math.round(area / areaPerCrumb), least), most);
}

/**
 * Break something into pieces: they start all over the space it took up and fly
 * apart. `random` gives numbers from 0 to 1, like `Math.random`.
 */
export function scatter(
  box: Box,
  count: number,
  burst: Burst,
  random: () => number = Math.random,
): Crumb[] {
  const between = (min: number, max: number): number => min + random() * (max - min);
  return Array.from({ length: count }, () => ({
    x: between(box.left, box.right),
    y: between(box.top, box.bottom),
    vx: burst.pushX + between(-burst.spread, burst.spread),
    vy: burst.pushY + between(-burst.spread, burst.spread),
    size: between(burst.size.min, burst.size.max),
    turn: between(0, Math.PI),
    spin: between(-burst.spin, burst.spin),
    ageMs: 0,
  }));
}

/** How pieces fall, bounce and slide to a stop. */
export interface CrumbPhysics {
  gravity: number;
  floorY: number;
  left: number;
  right: number;
  /** How much of its speed a piece keeps when it bounces. */
  bounce: number;
  /** Slower than this it stops bouncing and lies still. */
  restSpeed: number;
  /** On the floor it slides to a stop in about this long. */
  slideMs: number;
}

/** Move a piece forward in time: it flies, bounces off the floor and the sides, and comes to rest. */
export function crumbStep(crumb: Crumb, physics: CrumbPhysics, deltaMs: number): Crumb {
  const seconds = deltaMs / 1000;
  let { x, y, vx, vy, turn, spin } = crumb;
  vy += physics.gravity * seconds;
  x += vx * seconds;
  y += vy * seconds;
  turn += spin * seconds;

  if (x < physics.left || x > physics.right) {
    x = Math.min(Math.max(x, physics.left), physics.right);
    vx = -vx * physics.bounce;
  }
  if (y >= physics.floorY) {
    y = physics.floorY;
    vy = Math.abs(vy) > physics.restSpeed ? -vy * physics.bounce : 0;
    const slowed = Math.exp(-deltaMs / physics.slideMs);
    vx *= slowed;
    spin *= slowed;
  }
  return { ...crumb, x, y, vx, vy, turn, spin, ageMs: crumb.ageMs + deltaMs };
}

/** How see-through a piece is: solid while it lies there, then fading to nothing. */
export function crumbAlpha(ageMs: number, lieMs: number, fadeMs: number): number {
  if (ageMs <= lieMs) return 1;
  return Math.max(0, 1 - (ageMs - lieMs) / fadeMs);
}
