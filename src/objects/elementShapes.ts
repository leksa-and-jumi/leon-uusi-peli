import type Phaser from 'phaser';
import { BLOCKS, LAVA, WATER, type BlockDef, type ElementKind } from '../config';
import { shade } from '../logic/color';

type Graphics = Phaser.GameObjects.Graphics;

/**
 * Draws a pool of lava, a pool of water or a black hole. The middle of its bottom
 * edge is at (0, 0). In the area all of these move, so they are drawn again every
 * frame by `drawLiquid` or turned as a picture of their own; only with `whole`
 * (for the menu) are they drawn here, standing still.
 */
export function drawElement(g: Graphics, kind: ElementKind, whole: boolean): Graphics {
  const def = BLOCKS[kind];
  if (kind === 'cloud') return drawCloud(g, def);
  if (!whole) return g;
  if (kind === 'blackHole') {
    g.save();
    g.translateCanvas(0, -def.height / 2);
    drawSwirl(g, def);
    g.restore();
    return g;
  }
  return drawLiquid(g, kind, 0, def, def.halfWidth, def.height);
}

/** A pool as it looks at this moment: water with waves rolling by, or glowing, bubbling lava. */
export function drawLiquid(
  g: Graphics,
  liquid: 'water' | 'lava',
  timeMs: number,
  def: BlockDef,
  halfWidth: number,
  height: number,
): Graphics {
  return liquid === 'water'
    ? drawWater(g, timeMs, def, halfWidth, height)
    : drawLava(g, timeMs, def, halfWidth, height);
}

/** Water, this wide and this deep right now: a pool spreads, and gets deeper. */
function drawWater(
  g: Graphics,
  timeMs: number,
  def: BlockDef,
  halfWidth: number,
  height: number,
): Graphics {
  const { colors } = def;
  const { wave } = WATER;
  const top = -height;
  /** How high the surface is at `x` right now. */
  const surface = (x: number): number =>
    top + wave.height * Math.sin((x / wave.length + timeMs / wave.ms) * Math.PI * 2);

  g.fillStyle(colors.fill);
  g.beginPath();
  g.moveTo(-halfWidth, 0);
  for (let x = -halfWidth; x <= halfWidth; x += 6) {
    g.lineTo(x, surface(x));
  }
  g.lineTo(halfWidth, surface(halfWidth));
  g.lineTo(halfWidth, 0);
  g.closePath();
  g.fillPath();
  // Darker toward the bottom
  g.fillStyle(colors.dark, 0.35);
  g.fillRect(-halfWidth, top + height * 0.45, halfWidth * 2, height * 0.55);
  g.fillStyle(colors.dark, 0.3);
  g.fillRect(-halfWidth, top + height * 0.75, halfWidth * 2, height * 0.25);
  // The bright line of the surface, and a few bubbles going up
  g.lineStyle(2, colors.detail, 0.9);
  g.beginPath();
  g.moveTo(-halfWidth, surface(-halfWidth));
  for (let x = -halfWidth + 6; x <= halfWidth; x += 6) {
    g.lineTo(x, surface(x));
  }
  g.strokePath();
  g.fillStyle(colors.light, 0.7);
  for (let i = 0, x = -halfWidth + 14; x < halfWidth - 10; i++, x += 36) {
    const rise = ((timeMs / (1700 + (i % 5) * 260) + i * 0.37) % 1) * Math.max(0, height - 16);
    g.fillCircle(x + 4 * Math.sin(timeMs / 400 + i), -6 - rise, 1.8 + (i % 2));
  }
  return g;
}

/** Lava, this wide and this deep right now. */
function drawLava(
  g: Graphics,
  timeMs: number,
  def: BlockDef,
  halfWidth: number,
  height: number,
): Graphics {
  const { colors } = def;
  const top = -height;
  g.fillStyle(colors.dark);
  g.fillRoundedRect(-halfWidth, top, halfWidth * 2, height, Math.min(6, height / 2));
  g.fillStyle(colors.fill);
  g.fillRoundedRect(-halfWidth + 2, top + 2, halfWidth * 2 - 4, Math.max(1, height - 3), 3);
  // Bright patches that drift from side to side, all along it
  const drift = Math.sin((timeMs / LAVA.driftMs) * Math.PI * 2);
  for (let i = 0, x = -halfWidth + 26; x < halfWidth - 14; i++, x += 38) {
    const wide = [26, 34, 22][i % 3] ?? 26;
    const sway = (i % 2 === 0 ? 1 : -1) * drift * 7;
    g.fillStyle(colors.light, 0.85);
    g.fillEllipse(x + sway, top + height * 0.5, wide, height * 0.42);
    if (i % 3 === 1) {
      g.fillStyle(colors.detail, 0.9);
      g.fillEllipse(x - sway * 0.7, top + height * 0.48, 16, height * 0.22);
    }
  }
  // Bubbles that swell up and pop, one after the other
  for (let i = 0, x = -halfWidth + 22; x < halfWidth - 12; i++, x += 58) {
    const part = (timeMs / LAVA.bubbleMs + (i % 3) / 3) % 1;
    g.fillStyle(shade(colors.light, 0.2), 1 - part);
    g.fillCircle(x, top + 3 - part * 3, 2 + part * 4);
  }
  g.fillStyle(colors.detail, 0.7);
  g.fillRoundedRect(-halfWidth + 5, top + 1.5, halfWidth * 2 - 10, 1.8, 0.9);
  return g;
}

/** A dark storm cloud: heavy gray puffs with a bright edge, and a bolt of lightning under it. */
function drawCloud(g: Graphics, def: BlockDef): Graphics {
  const { height, colors } = def;
  const middle = -height / 2;
  const puffs: readonly (readonly [number, number, number])[] = [
    [-34, middle + 6, 20],
    [-12, middle - 6, 24],
    [14, middle - 4, 22],
    [36, middle + 6, 19],
    [0, middle + 10, 22],
  ];
  g.fillStyle(colors.dark);
  for (const [x, y, radius] of puffs) g.fillCircle(x, y, radius + 2);
  g.fillStyle(colors.fill);
  for (const [x, y, radius] of puffs) g.fillCircle(x, y, radius);
  g.fillStyle(colors.light, 0.6);
  g.fillEllipse(-12, middle - 16, 30, 9);
  g.fillEllipse(16, middle - 14, 22, 7);
  g.fillStyle(colors.detail);
  g.fillTriangle(-4, -6, 6, -6, -2, 4);
  g.fillTriangle(2, 0, -6, 0, 3, 10);
  return g;
}

/**
 * A black hole around (0, 0): a dark middle with bright rings around it. The rings
 * have gaps, so that you can see it turn.
 */
export function drawSwirl(g: Graphics, def: BlockDef): Graphics {
  const { colors, halfWidth } = def;
  g.fillStyle(colors.dark, 0.3);
  g.fillCircle(0, 0, halfWidth);
  const rings: readonly (readonly [number, number, number, number])[] = [
    [halfWidth - 5, 5, colors.dark, 0],
    [halfWidth - 10, 4.5, colors.light, 1.2],
    [halfWidth - 14, 3, colors.detail, 2.6],
  ];
  for (const [radius, width, color, turn] of rings) {
    g.lineStyle(width, color, 0.95);
    for (const from of [0, Math.PI]) {
      g.beginPath();
      g.arc(0, 0, radius, turn + from, turn + from + Math.PI * 0.72);
      g.strokePath();
    }
  }
  g.fillStyle(colors.fill);
  g.fillCircle(0, 0, halfWidth - 16);
  return g;
}
