import type Phaser from 'phaser';
import { BLOCKS, type BlockDef, type CastleKind } from '../config';
import { shade } from '../logic/color';

type Graphics = Phaser.GameObjects.Graphics;

/**
 * Draws a piece of a castle with code. The middle of its bottom edge is at (0, 0).
 * The grille of a gate is a picture of its own, so that it can go up and down; with
 * `whole` it is drawn in too, closed, for the menu.
 */
export function drawCastle(g: Graphics, kind: CastleKind, whole: boolean): Graphics {
  const def = BLOCKS[kind];
  switch (kind) {
    case 'tower':
      return drawTower(g, def);
    case 'rampart':
      return drawRampart(g, def);
    case 'gate':
      if (whole && def.gate) {
        g.save();
        g.translateCanvas(0, -def.gate.opening.height);
        drawGrille(g, def);
        g.restore();
      }
      return drawGateFrame(g, def);
    case 'drawbridge':
      return drawBridge(g, def);
    case 'banner':
      return drawBanner(g, def);
    case 'catapult':
      drawCatapultFrame(g, def);
      if (whole && def.launcher) {
        const { pivot, arm } = def.launcher;
        g.save();
        g.translateCanvas(pivot.x, -pivot.up);
        g.rotateCanvas(arm.rest);
        drawCatapultArm(g, def);
        g.restore();
      }
      return g;
  }
}

/** A wall of gray stone blocks, every other row shifted, with a dark line around it. */
function stones(g: Graphics, def: BlockDef, x: number, y: number, width: number, height: number) {
  const { fill, dark, light, detail } = def.colors;
  const rowHeight = 15;
  const stoneWidth = 22;
  g.fillStyle(detail);
  g.fillRect(x, y, width, height);
  for (let row = 0; row * rowHeight < height; row++) {
    const top = y + row * rowHeight;
    const tall = Math.min(rowHeight, y + height - top) - 1.5;
    if (tall < 1) continue;
    const shift = row % 2 === 0 ? 0 : -stoneWidth / 2;
    for (let i = 0, left = x + shift; left < x + width; i++, left += stoneWidth) {
      const from = Math.max(left, x) + 0.75;
      const to = Math.min(left + stoneWidth, x + width) - 0.75;
      if (to - from < 1) continue;
      g.fillStyle(shade(fill, ((row * 3 + i * 5) % 4) * 0.045 - 0.07));
      g.fillRect(from, top + 0.75, to - from, tall);
      g.fillStyle(light, 0.4);
      g.fillRect(from, top + 0.75, to - from, 1.5);
    }
  }
  g.lineStyle(1.5, dark);
  g.strokeRect(x, y, width, height);
}

/** The teeth along the top of a castle wall: `count` of them, from `left` to `right`. */
function merlons(
  g: Graphics,
  def: BlockDef,
  left: number,
  right: number,
  top: number,
  tall: number,
  count: number,
) {
  const each = (right - left) / (count * 2 - 1);
  for (let i = 0; i < count; i++) {
    stones(g, def, left + i * each * 2, top, each, tall);
  }
}

/** A tall round tower seen from the side: stone, a wider top with teeth, and two narrow windows. */
function drawTower(g: Graphics, def: BlockDef): Graphics {
  const { halfWidth, height, colors } = def;
  const cap = 22;
  stones(g, def, -halfWidth + 4, -height + cap, halfWidth * 2 - 8, height - cap);
  // Light from the left, shadow on the right: it is round
  g.fillStyle(colors.light, 0.22);
  g.fillRect(-halfWidth + 5, -height + cap, 9, height - cap);
  g.fillStyle(colors.dark, 0.28);
  g.fillRect(halfWidth - 15, -height + cap, 10, height - cap);
  stones(g, def, -halfWidth, -height + cap - 8, halfWidth * 2, 10);
  merlons(g, def, -halfWidth, halfWidth, -height, cap - 8, 4);
  g.fillStyle(colors.dark);
  for (const y of [-height + 62, -height + 124]) {
    g.fillRoundedRect(-3.5, y, 7, 24, 3.5);
  }
  return g;
}

/** A stretch of castle wall with teeth along its top. */
function drawRampart(g: Graphics, def: BlockDef): Graphics {
  const { halfWidth, height } = def;
  const teeth = 16;
  stones(g, def, -halfWidth, -height + teeth, halfWidth * 2, height - teeth);
  merlons(g, def, -halfWidth, halfWidth, -height, teeth, 5);
  return g;
}

/** The stone frame of a gate: two posts and the part above the opening, with an arch. */
function drawGateFrame(g: Graphics, def: BlockDef): Graphics {
  const { halfWidth, height, colors } = def;
  const opening = def.gate?.opening ?? { halfWidth: 0, height: 0 };
  const post = halfWidth - opening.halfWidth;
  const teeth = 14;
  stones(g, def, -halfWidth, -opening.height, post, opening.height);
  stones(g, def, opening.halfWidth, -opening.height, post, opening.height);
  stones(g, def, -halfWidth, -height + teeth, halfWidth * 2, height - teeth - opening.height);
  merlons(g, def, -halfWidth, halfWidth, -height, teeth, 4);
  // The dark edge of the arch over the opening
  g.fillStyle(colors.dark);
  g.fillRect(-opening.halfWidth, -opening.height - 3, opening.halfWidth * 2, 3);
  g.fillTriangle(
    -opening.halfWidth,
    -opening.height,
    -opening.halfWidth + 12,
    -opening.height,
    -opening.halfWidth,
    -opening.height + 12,
  );
  g.fillTriangle(
    opening.halfWidth,
    -opening.height,
    opening.halfWidth - 12,
    -opening.height,
    opening.halfWidth,
    -opening.height + 12,
  );
  return g;
}

/**
 * The iron grille of a gate, hanging down from (0, 0) as far as the opening is high.
 * Its top is at (0, 0), so that it can be pulled up from there.
 */
export function drawGrille(g: Graphics, def: BlockDef): Graphics {
  const opening = def.gate?.opening;
  if (!opening) return g;
  const iron = def.colors.detail;
  g.lineStyle(3.5, iron);
  for (let x = -opening.halfWidth + 6; x < opening.halfWidth; x += 12) {
    g.lineBetween(x, 0, x, opening.height - 5);
    g.fillStyle(iron);
    g.fillTriangle(x - 3, opening.height - 6, x + 3, opening.height - 6, x, opening.height);
  }
  for (let y = 14; y < opening.height - 8; y += 24) {
    g.lineBetween(-opening.halfWidth, y, opening.halfWidth, y);
  }
  return g;
}

/** A drawbridge standing up: thick boards held together by iron bands, with a ring for the chain. */
function drawBridge(g: Graphics, def: BlockDef): Graphics {
  const { halfWidth, height, colors } = def;
  g.fillStyle(colors.dark);
  g.fillRect(-halfWidth, -height, halfWidth * 2, height);
  g.fillStyle(colors.fill);
  g.fillRect(-halfWidth + 1.5, -height + 1.5, halfWidth * 2 - 3, height - 3);
  g.fillStyle(colors.light, 0.6);
  g.fillRect(-halfWidth + 3, -height + 3, 2.5, height - 6);
  g.lineStyle(1, colors.dark, 0.6);
  for (let y = -height + 18; y < -4; y += 18) {
    g.lineBetween(-halfWidth + 1.5, y, halfWidth - 1.5, y);
  }
  g.fillStyle(colors.detail);
  for (const y of [-height + 8, -height / 2 - 2, -12]) {
    g.fillRect(-halfWidth, y, halfWidth * 2, 4);
  }
  g.lineStyle(2, colors.detail);
  g.strokeCircle(0, -height + 20, 3.5);
  return g;
}

/** The frame of a catapult: a beam on two wheels, with two posts that hold the arm up. */
function drawCatapultFrame(g: Graphics, def: BlockDef): Graphics {
  const { halfWidth, colors } = def;
  const pivot = def.launcher?.pivot ?? { x: 0, up: 40 };
  // The posts, leaning together at the top
  for (const [width, color] of [
    [7, colors.dark],
    [4.4, colors.fill],
  ] as const) {
    g.lineStyle(width, color);
    g.lineBetween(pivot.x - 22, -12, pivot.x, -pivot.up);
    g.lineBetween(pivot.x + 22, -12, pivot.x, -pivot.up);
  }
  // The beam they stand on
  g.fillStyle(colors.dark);
  g.fillRoundedRect(-halfWidth + 4, -18, halfWidth * 2 - 8, 9, 2);
  g.fillStyle(colors.fill);
  g.fillRoundedRect(-halfWidth + 5.5, -16.5, halfWidth * 2 - 11, 6, 1.5);
  g.fillStyle(colors.light, 0.7);
  g.fillRect(-halfWidth + 8, -15.8, halfWidth * 2 - 16, 1.5);
  // Wheels with iron rims
  for (const x of [-halfWidth + 16, halfWidth - 16]) {
    g.fillStyle(colors.detail);
    g.fillCircle(x, -11, 11);
    g.fillStyle(colors.dark);
    g.fillCircle(x, -11, 9);
    g.fillStyle(colors.fill);
    g.fillCircle(x, -11, 7.4);
    g.lineStyle(1.6, colors.dark);
    g.lineBetween(x - 7, -11, x + 7, -11);
    g.lineBetween(x, -18, x, -4);
    g.fillStyle(colors.detail);
    g.fillCircle(x, -11, 2.2);
  }
  g.fillStyle(colors.detail);
  g.fillCircle(pivot.x, -pivot.up, 3.4);
  return g;
}

/**
 * The arm of a catapult, turning around (0, 0): a long beam pointing up with a bucket
 * at its end, and a short end below with a heavy weight.
 */
export function drawCatapultArm(g: Graphics, def: BlockDef): Graphics {
  const { colors } = def;
  const length = def.launcher?.arm.length ?? 40;
  g.fillStyle(colors.dark);
  g.fillRoundedRect(-3.5, -length, 7, length + 16, 2);
  g.fillStyle(colors.fill);
  g.fillRoundedRect(-2.2, -length + 1.3, 4.4, length + 13.4, 1.4);
  // The bucket the boulder lies in
  g.lineStyle(3, colors.dark);
  g.beginPath();
  g.arc(0, -length - 2, 8, 0.15 * Math.PI, 0.85 * Math.PI);
  g.strokePath();
  // The weight that pulls the short end down
  g.fillStyle(colors.detail);
  g.fillRoundedRect(-8, 10, 16, 13, 2);
  g.fillStyle(shade(colors.detail, 0.3), 0.8);
  g.fillRect(-6, 11.5, 12, 2);
  return g;
}

/** A banner: a wooden pole on a stone foot, with a golden knob and a long red flag. */
function drawBanner(g: Graphics, def: BlockDef): Graphics {
  const { halfWidth, height, colors } = def;
  g.fillStyle(colors.detail);
  g.fillRoundedRect(-halfWidth - 3, -7, halfWidth * 2 + 6, 7, 2);
  g.fillStyle(colors.dark);
  g.fillRect(-2, -height + 5, 4, height - 10);
  // The flag: two tails that end in points
  g.fillStyle(shade(colors.fill, -0.3));
  g.fillTriangle(2, -height + 8, 46, -height + 14, 2, -height + 24);
  g.fillTriangle(2, -height + 24, 44, -height + 34, 2, -height + 42);
  g.fillStyle(colors.fill);
  g.fillTriangle(2, -height + 9.5, 42, -height + 14, 2, -height + 22.5);
  g.fillTriangle(2, -height + 25.5, 40, -height + 34, 2, -height + 40.5);
  g.fillRect(2, -height + 9.5, 12, 31);
  g.fillStyle(colors.light);
  g.fillCircle(8, -height + 25, 4);
  g.fillCircle(0, -height + 4, 4);
  return g;
}
