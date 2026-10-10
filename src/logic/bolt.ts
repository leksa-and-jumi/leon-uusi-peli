/** A corner of a flash of lightning. */
export interface Corner {
  x: number;
  y: number;
}

/**
 * The corners of a flash of lightning from one point to another: a line made of
 * `pieces` straight bits, where every corner between the two ends strays up to
 * `sway` pixels to one side. `random` gives numbers from 0 to 1, like `Math.random`.
 */
export function jagged(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  pieces: number,
  sway: number,
  random: () => number = Math.random,
): Corner[] {
  const count = Math.max(1, Math.round(pieces));
  const length = Math.hypot(toX - fromX, toY - fromY);
  // An arrow of length 1 pointing straight to the side of the line
  const sideX = length === 0 ? 0 : -(toY - fromY) / length;
  const sideY = length === 0 ? 0 : (toX - fromX) / length;
  const corners: Corner[] = [];
  for (let i = 0; i <= count; i++) {
    const along = i / count;
    const off = i === 0 || i === count ? 0 : (random() * 2 - 1) * sway;
    corners.push({
      x: fromX + (toX - fromX) * along + sideX * off,
      y: fromY + (toY - fromY) * along + sideY * off,
    });
  }
  return corners;
}
