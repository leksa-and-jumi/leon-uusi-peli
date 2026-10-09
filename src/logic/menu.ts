/** A row of slots in the menu: where each one is, and which one was clicked. */
export interface SlotRow {
  x: number;
  y: number;
  width: number;
  height: number;
  gap: number;
  /** Stack the slots on top of each other instead of side by side. */
  vertical?: boolean;
  /** With stacked slots: start a new column beside the first after this many. */
  wrap?: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The rectangle of the slot at `index` (0 = the first one, on the left or at the top). */
export function slotRect(row: SlotRow, index: number): Rect {
  if (!row.vertical) {
    return {
      x: row.x + index * (row.width + row.gap),
      y: row.y,
      width: row.width,
      height: row.height,
    };
  }
  const perColumn = row.wrap ?? Infinity;
  const column = Math.floor(index / perColumn);
  const inColumn = index - column * (row.wrap ?? 0);
  return {
    x: row.x + column * (row.width + row.gap),
    y: row.y + inColumn * (row.height + row.gap),
    width: row.width,
    height: row.height,
  };
}

/** Which of the `count` slots is under the point, or `null` if none is. */
export function slotAt(row: SlotRow, count: number, px: number, py: number): number | null {
  for (let index = 0; index < count; index++) {
    const rect = slotRect(row, index);
    const inside =
      px >= rect.x && px < rect.x + rect.width && py >= rect.y && py < rect.y + rect.height;
    if (inside) return index;
  }
  return null;
}
