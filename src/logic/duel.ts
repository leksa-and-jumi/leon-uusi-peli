import type { Facing } from './walk';

/** What a player tells its doll to do right now. */
export interface Steer {
  /** The way to go: left (-1), right (1), or to stay (0). */
  x: Facing | 0;
  jump: boolean;
  hit: boolean;
}

/** What the keys a player holds down mean. Left and right together is neither. */
export function steerFrom(left: boolean, right: boolean, jump: boolean, hit: boolean): Steer {
  return { x: left === right ? 0 : left ? -1 : 1, jump, hit };
}

/**
 * The seats of the players, each with the one who sits in it or `null`. Somebody who
 * has a seat gets up from it; somebody who has none sits down in the first free one.
 * With every seat taken, nothing changes.
 */
export function takeSeat<T>(seats: readonly (T | null)[], who: T): (T | null)[] {
  if (seats.includes(who)) return seats.map((sitting) => (sitting === who ? null : sitting));
  const free = seats.indexOf(null);
  return seats.map((sitting, seat) => (seat === free ? who : sitting));
}
