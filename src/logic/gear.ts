/** A piece of gear a doll has on: where it wears it, and how many more hits it takes. */
export interface Worn<Slot> {
  slot: Slot;
  left: number;
}

/**
 * A hit lands on a doll that wears gear. The outermost piece it has on (the first in
 * `order`) takes the whole hit, and the doll isn't hurt. The piece wears down by as
 * much as the hit would have taken, and by 1 at least; at 0 it is broken. Gives that
 * piece as it is after the hit, or `null` when the doll wears nothing.
 */
export function gearHit<Slot>(
  worn: readonly Worn<Slot>[],
  order: readonly Slot[],
  damage: number,
): Worn<Slot> | null {
  for (const slot of order) {
    const piece = worn.find((one) => one.slot === slot && one.left > 0);
    if (piece) return { slot, left: Math.max(0, piece.left - Math.max(1, damage)) };
  }
  return null;
}
