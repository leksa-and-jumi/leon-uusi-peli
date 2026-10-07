/** A stain on the floor: where its middle is, how wide it is to each side, and its color. */
export interface Stain {
  x: number;
  halfWidth: number;
  color: number;
}

/** How stains start and grow. */
export interface StainGrowth {
  /** A new stain is this wide to each side. */
  start: number;
  /** Every drop that lands on a stain makes it this much wider, up to `most`. */
  grow: number;
  most: number;
  /** A drop this close to the middle of a stain of the same color lands on it. */
  near: number;
  /** At most this many stains. The oldest one goes when there are more. */
  max: number;
}

/**
 * A drop lands on the floor at `x`. It widens a stain of the same color that is
 * already there, or starts a new one. Gives the new list of stains.
 */
export function addDrop(
  stains: readonly Stain[],
  x: number,
  color: number,
  growth: StainGrowth,
): Stain[] {
  const index = stains.findIndex(
    (stain) =>
      stain.color === color &&
      stain.halfWidth < growth.most &&
      Math.abs(stain.x - x) <= Math.max(growth.near, stain.halfWidth),
  );
  if (index === -1) {
    const added = [...stains, { x, halfWidth: growth.start, color }];
    return added.length > growth.max ? added.slice(added.length - growth.max) : added;
  }
  return stains.map((stain, i) =>
    i === index
      ? { ...stain, halfWidth: Math.min(stain.halfWidth + growth.grow, growth.most) }
      : stain,
  );
}

/** Wipe the floor from `left` to `right`: every stain that reaches in there is gone. */
export function wipe(stains: readonly Stain[], left: number, right: number): Stain[] {
  return stains.filter(
    (stain) => stain.x + stain.halfWidth < left || stain.x - stain.halfWidth > right,
  );
}
