import type { Box } from './ground';

/**
 * A flight of stairs as boxes to walk up: `steps` of them side by side, each one
 * step higher than the one before. The middle of the bottom edge of the stairs is at
 * (`x`, `y`); they climb toward `direction` (1 right, -1 left), up to `height`.
 */
export function stairSteps(
  x: number,
  y: number,
  halfWidth: number,
  height: number,
  steps: number,
  direction: 1 | -1,
): Box[] {
  const count = Math.max(1, Math.round(steps));
  const wide = (halfWidth * 2) / count;
  const boxes: Box[] = [];
  for (let i = 0; i < count; i++) {
    // Counted from the low end, wherever that is
    const from = direction > 0 ? x - halfWidth + i * wide : x + halfWidth - (i + 1) * wide;
    boxes.push({ left: from, right: from + wide, top: y - ((i + 1) * height) / count, bottom: y });
  }
  return boxes;
}
