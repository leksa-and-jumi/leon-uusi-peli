import type { Spot } from './pick';
import type { Facing } from './walk';

/**
 * How a picture is placed in the area: where its own middle is, and how it is turned
 * and stretched. A spot `x`, `y` of the picture is at `a·x + c·y + tx`, `b·x + d·y + ty`.
 */
export interface Placing {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
}

/** Where a spot of a picture is in the area. */
export function toArea(placing: Placing, x: number, y: number): Spot {
  const { a, b, c, d, tx, ty } = placing;
  return { x: a * x + c * y + tx, y: b * x + d * y + ty };
}

/** Where a spot in the area is on a picture: the other way around from `toArea`. */
export function toPicture(placing: Placing, x: number, y: number): Spot {
  const { a, b, c, d, tx, ty } = placing;
  const size = a * d - b * c;
  const dx = x - tx;
  const dy = y - ty;
  return { x: (d * dx - c * dy) / size, y: (a * dy - b * dx) / size };
}

/** How the wind takes something of ash apart. */
export interface Wind {
  /** How much sooner the high parts go than the low ones, next to how far downwind they are. */
  topFirst: number;
  /** The order is shuffled by up to this many pixels, so that the edge is ragged. */
  ragged: number;
}

/**
 * The order in which the wind takes the little squares of ash: the ones furthest
 * downwind and highest up go first, and it eats its way through to the other side.
 * Gives the numbers of the squares, first to go first. `random` is like `Math.random`.
 */
export function blowOrder(
  squares: readonly Spot[],
  direction: Facing,
  wind: Wind,
  random: () => number = Math.random,
): number[] {
  const turn = squares.map(
    ({ x, y }) => direction * x - y * wind.topFirst + (random() * 2 - 1) * wind.ragged,
  );
  return squares
    .map((_, index) => index)
    .sort((one, other) => (turn[other] ?? 0) - (turn[one] ?? 0));
}

/** How many of its squares of ash have gone, when this share of it (0 to 1) is left. */
export function blownOff(squares: number, left: number): number {
  return Math.round(squares * (1 - Math.min(1, Math.max(0, left))));
}
