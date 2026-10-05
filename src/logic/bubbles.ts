/** The row of round action bubbles above a person. */
export interface BubbleRow {
  radius: number;
  gap: number;
  /** How far above the person's head the row floats. */
  above: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * The centers of `count` bubbles in a row above a person's head. The row slides
 * sideways and down when needed, so every bubble stays between `left`, `right` and `top`.
 */
export function bubbleCenters(
  count: number,
  personX: number,
  headTopY: number,
  row: BubbleRow,
  left: number,
  right: number,
  top: number,
): Point[] {
  const step = row.radius * 2 + row.gap;
  const width = count * row.radius * 2 + (count - 1) * row.gap;
  const minStart = left + row.radius;
  const maxStart = Math.max(minStart, right - width + row.radius);
  const startX = Math.min(Math.max(personX - width / 2 + row.radius, minStart), maxStart);
  const y = Math.max(headTopY - row.above - row.radius, top + row.radius);
  return Array.from({ length: count }, (_, index) => ({ x: startX + index * step, y }));
}

/** Which bubble is under the point, or `null` if none is. */
export function bubbleAt(
  centers: readonly Point[],
  radius: number,
  px: number,
  py: number,
): number | null {
  const index = centers.findIndex((c) => Math.hypot(px - c.x, py - c.y) <= radius);
  return index === -1 ? null : index;
}
