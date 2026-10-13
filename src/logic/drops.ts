/** A group of things that can be picked, and how big its share of all picks is. */
export interface DropGroup<Thing> {
  share: number;
  things: readonly Thing[];
}

/**
 * Pick one thing at random. First a group, by its share (a group with nothing in it,
 * or with no share, is never picked), then any one of the things in that group.
 * `random` gives numbers from 0 up to 1, like `Math.random`. With nothing to pick
 * from at all, it gives `null`.
 */
export function pickDrop<Thing>(
  groups: readonly DropGroup<Thing>[],
  random: () => number = Math.random,
): Thing | null {
  const open = groups.filter((group) => group.share > 0 && group.things.length > 0);
  const whole = open.reduce((sum, group) => sum + group.share, 0);
  if (whole <= 0) return null;
  let left = random() * whole;
  const group = open.find((one) => (left -= one.share) < 0) ?? open[open.length - 1];
  if (!group) return null;
  const index = Math.min(group.things.length - 1, Math.floor(random() * group.things.length));
  return group.things[index] ?? null;
}
