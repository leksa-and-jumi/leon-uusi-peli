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

/**
 * A long thing that has landed turns to lie flat: its turn eases toward the closest
 * quarter turn to either side (so it points left or right, never up), in about `ms`.
 */
export function settleTurn(turn: number, deltaMs: number, ms: number): number {
  const quarter = Math.PI / 2;
  const flat = Math.round((turn - quarter) / Math.PI) * Math.PI + quarter;
  return turn + (flat - turn) * Math.min(1, deltaMs / ms);
}

/** What a thing is made of, which decides what it breaks into. */
export type Material = 'wood' | 'straw' | 'brick' | 'stone' | 'metal' | 'glass' | 'other';

/**
 * What a thing is made of. It can say so itself (`known`). Otherwise what breaks at a
 * touch is glass, what burns is wood, what a magnet pulls is metal, and anything else
 * just crumbles.
 */
export function materialOf(
  thing: { fragile?: unknown; burns?: boolean; metal?: boolean },
  known?: Material,
): Material {
  if (known) return known;
  if (thing.fragile) return 'glass';
  if (thing.burns) return 'wood';
  if (thing.metal) return 'metal';
  return 'other';
}

/** One kind of piece a thing breaks into: a long bar, a pointed chip or a round dot of some size. */
export interface ShardKind {
  /** How many of the pieces are of this kind, next to the other kinds. */
  share: number;
  shape: 'bar' | 'chip' | 'dot';
  long: { min: number; max: number };
  wide: { min: number; max: number };
  /** How see-through it is (1 when left out: not at all). */
  alpha?: number;
}

/** A piece of something that broke: its shape and its size. */
export interface Shard {
  shape: 'bar' | 'chip' | 'dot';
  long: number;
  wide: number;
  alpha: number;
}

/**
 * One piece of something that broke: one of the kinds of piece its material breaks
 * into, picked by their shares, of a size between that kind's smallest and biggest.
 * `random` gives numbers from 0 up to 1, like `Math.random`.
 */
export function pickShard(kinds: readonly ShardKind[], random: () => number = Math.random): Shard {
  const whole = kinds.reduce((sum, kind) => sum + Math.max(0, kind.share), 0);
  let left = random() * whole;
  const kind = kinds.find((one) => (left -= Math.max(0, one.share)) < 0) ?? kinds[kinds.length - 1];
  if (!kind) return { shape: 'bar', long: 6, wide: 6, alpha: 1 };
  const between = (range: { min: number; max: number }): number =>
    range.min + random() * (range.max - range.min);
  return {
    shape: kind.shape,
    long: between(kind.long),
    wide: between(kind.wide),
    alpha: kind.alpha ?? 1,
  };
}
