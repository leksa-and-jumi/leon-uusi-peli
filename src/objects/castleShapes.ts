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
    case 'hauntedHouse':
      return drawHauntedHouse(g, def);
    case 'cannon':
      return drawCannon(g, def);
    case 'catapult':
      drawCatapultFrame(g, def);
      if (whole && def.launcher?.pivot && def.launcher.arm) {
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

/**
 * An old haunted house with no front wall, so you look right in: striped wallpaper,
 * a crooked portrait whose eyes glow, a cobweb in the corner and a moonlit window
 * with a torn curtain. Over it the boards of the upper floor, a round attic window
 * with a light in it, and a sagging roof with a hole and a crooked chimney.
 */
function drawHauntedHouse(g: Graphics, def: BlockDef): Graphics {
  const { fill, dark, light, detail } = def.colors;
  const { halfWidth, height } = def;
  const hollow = def.hollow ?? { floor: 140, thick: 14 };
  const inner = halfWidth - 8;
  const ceiling = -hollow.floor;
  const upper = ceiling - hollow.thick;
  const polygon = (color: number, points: readonly (readonly [number, number])[]): void => {
    g.fillStyle(color);
    g.beginPath();
    points.forEach(([x, y], index) => {
      if (index === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    });
    g.closePath();
    g.fillPath();
  };
  // The room inside: dark striped wallpaper and an old wooden floor
  g.fillStyle(0x2b2233);
  g.fillRect(-inner, ceiling, inner * 2, hollow.floor);
  g.fillStyle(0x3a2f45);
  for (let x = -inner + 6; x < inner - 4; x += 16) g.fillRect(x, ceiling, 5, hollow.floor);
  g.fillStyle(dark);
  g.fillRect(-inner, -7, inner * 2, 7);
  g.fillStyle(fill, 0.6);
  for (let x = -inner; x < inner; x += 26) g.fillRect(x + 1, -6, 24, 1.5);
  // A window at the back, with the moon shining in, and a torn red curtain
  const windowX = 52;
  g.fillStyle(0x0d1420);
  g.fillRect(windowX - 22, -112, 44, 56);
  g.fillStyle(0x9fb4d0, 0.55);
  g.fillRect(windowX - 19, -109, 38, 50);
  g.fillStyle(0xe8eef8, 0.85);
  g.fillCircle(windowX + 8, -97, 6);
  g.lineStyle(3, dark);
  g.lineBetween(windowX, -112, windowX, -56);
  g.lineBetween(windowX - 22, -84, windowX + 22, -84);
  g.lineStyle(1, 0xe8eef8, 0.7);
  g.lineBetween(windowX - 15, -104, windowX - 6, -92);
  g.lineBetween(windowX - 6, -92, windowX - 11, -86);
  polygon(0x5a1f2b, [
    [windowX - 26, -116],
    [windowX - 12, -116],
    [windowX - 16, -80],
    [windowX - 11, -62],
    [windowX - 19, -66],
    [windowX - 24, -52],
    [windowX - 27, -70],
  ]);
  // A crooked portrait, its eyes glowing
  polygon(0x6d4c22, [
    [-82, -118],
    [-44, -112],
    [-49, -70],
    [-87, -76],
  ]);
  polygon(0x1a1414, [
    [-78, -113],
    [-49, -108],
    [-53, -75],
    [-82, -80],
  ]);
  g.fillStyle(0x3b302c);
  g.fillEllipse(-65, -95, 16, 22);
  g.fillStyle(detail);
  g.fillCircle(-69, -98, 1.6);
  g.fillCircle(-61, -97, 1.6);
  // A cobweb in the top corner
  g.lineStyle(1, 0xd9d9d9, 0.55);
  const corner = { x: -inner, y: ceiling };
  for (const angle of [0.1, 0.5, 0.9, 1.3]) {
    g.lineBetween(
      corner.x,
      corner.y,
      corner.x + Math.cos(angle) * 38,
      corner.y + Math.sin(angle) * 38,
    );
  }
  for (const reach of [12, 22, 32]) {
    g.beginPath();
    g.arc(corner.x, corner.y, reach, 0.1, 1.3);
    g.strokePath();
  }
  // The side walls: old boards, one of them hanging loose
  for (const side of [-1, 1]) {
    const x = side === -1 ? -halfWidth : inner;
    g.fillStyle(dark);
    g.fillRect(x, upper, 8, -upper);
    g.fillStyle(fill);
    g.fillRect(x + 1.5, upper + 2, 5, -upper - 2);
    g.fillStyle(light, 0.5);
    g.fillRect(x + 2, upper + 2, 1.2, -upper - 2);
  }
  polygon(fill, [
    [-halfWidth - 6, -96],
    [-halfWidth + 2, -100],
    [-halfWidth + 22, -40],
    [-halfWidth + 15, -37],
  ]);
  // The upper floor, of planks
  g.fillStyle(dark);
  g.fillRect(-halfWidth, upper, halfWidth * 2, hollow.thick);
  g.fillStyle(fill);
  g.fillRect(-halfWidth + 1.5, upper + 1.5, halfWidth * 2 - 3, hollow.thick - 3);
  g.fillStyle(light, 0.45);
  g.fillRect(-halfWidth + 1.5, upper + 1.5, halfWidth * 2 - 3, 1.5);
  g.fillStyle(dark);
  for (let x = -halfWidth + 30; x < halfWidth; x += 34)
    g.fillRect(x, upper + 1.5, 1.4, hollow.thick - 3);
  // The attic wall, with a round window that has a light in it
  const atticTop = upper - 24;
  g.fillStyle(dark);
  g.fillRect(-inner + 10, atticTop, (inner - 10) * 2, 24);
  g.fillStyle(fill);
  for (let x = -inner + 12; x < inner - 12; x += 13) g.fillRect(x, atticTop + 1, 11, 23);
  g.fillStyle(dark);
  g.fillCircle(0, atticTop + 12, 10);
  g.fillStyle(detail, 0.9);
  g.fillCircle(0, atticTop + 12, 7.5);
  g.lineStyle(1.5, dark);
  g.lineBetween(-7.5, atticTop + 12, 7.5, atticTop + 12);
  g.lineBetween(0, atticTop + 4.5, 0, atticTop + 19.5);
  // A crooked chimney, and the sagging roof with a hole in it
  polygon(dark, [
    [62, -height + 4],
    [80, -height + 1],
    [82, atticTop - 8],
    [64, atticTop - 6],
  ]);
  polygon(0x5d4037, [
    [64, -height + 6],
    [78, -height + 3],
    [80, atticTop - 9],
    [66, atticTop - 7],
  ]);
  const peak = -height + 12;
  polygon(dark, [
    [-halfWidth - 14, atticTop + 4],
    [-60, atticTop - 26],
    [-6, peak],
    [70, atticTop - 22],
    [halfWidth + 12, atticTop + 4],
  ]);
  polygon(0x3a2a24, [
    [-halfWidth - 9, atticTop + 1],
    [-59, atticTop - 23],
    [-6, peak + 4],
    [68, atticTop - 19],
    [halfWidth + 7, atticTop + 1],
  ]);
  g.lineStyle(1, dark, 0.8);
  for (let row = 1; row <= 3; row++) {
    const y = atticTop + 1 - row * 9;
    g.lineBetween(-halfWidth + row * 22, y, halfWidth - row * 20, y);
  }
  polygon(0x0b0809, [
    [28, atticTop - 20],
    [44, atticTop - 24],
    [40, atticTop - 10],
    [30, atticTop - 8],
  ]);
  return g;
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

/** A castle cannon: a thick iron barrel pointing up and ahead, on a wooden carriage with wheels. */
function drawCannon(g: Graphics, def: BlockDef): Graphics {
  const { halfWidth, colors } = def;
  // The barrel, slanted upward: thick at the back, with a ring around its mouth
  const barrel: [number, number][] = [
    [-22, -24],
    [-14, -36],
    [34, -56],
    [39, -46],
    [-6, -16],
  ];
  g.fillStyle(colors.dark);
  g.beginPath();
  barrel.forEach(([x, y], i) => {
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  });
  g.closePath();
  g.fillPath();
  g.lineStyle(5, colors.fill);
  g.lineBetween(-14, -28, 32, -49);
  g.lineStyle(1.6, colors.light, 0.8);
  g.lineBetween(-10, -32, 30, -52);
  g.lineStyle(4, colors.dark);
  g.lineBetween(31, -57, 38, -44);
  g.fillStyle(colors.dark);
  g.fillCircle(-18, -29, 8);
  // The carriage and its wheels
  g.fillStyle(shade(colors.detail, -0.35));
  g.fillRoundedRect(-halfWidth + 6, -20, halfWidth * 2 - 18, 10, 3);
  g.fillStyle(colors.detail);
  g.fillRoundedRect(-halfWidth + 7.5, -18.5, halfWidth * 2 - 21, 7, 2);
  for (const x of [-halfWidth + 16, halfWidth - 20]) {
    g.fillStyle(colors.dark);
    g.fillCircle(x, -12, 12);
    g.fillStyle(colors.detail);
    g.fillCircle(x, -12, 9.5);
    g.lineStyle(1.8, colors.dark);
    g.lineBetween(x - 9, -12, x + 9, -12);
    g.lineBetween(x, -21, x, -3);
    g.fillStyle(colors.light);
    g.fillCircle(x, -12, 2.4);
  }
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
  const length = def.launcher?.arm?.length ?? 40;
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
