import type Phaser from 'phaser';
import { ITEM_COLORS, type ItemKind } from '../config';

type Graphics = Phaser.GameObjects.Graphics;
type Point = readonly [number, number];

/** Where the lit end of a bomb's fuse is, from the middle of the bomb. */
export const FUSE_TIP = { x: 10, y: -24 };

/** Draws an item with code. The grip (where a hand holds it) is at (0, 0), pointing right. */
export function drawItem(g: Graphics, kind: ItemKind): Graphics {
  switch (kind) {
    case 'pistol':
      return drawPistol(g);
    case 'mgun':
      return drawMachineGun(g);
    case 'sword':
      return drawSword(g);
    case 'axe':
      return drawAxe(g);
    case 'spear':
      return drawSpear(g);
    case 'bat':
      return drawBat(g);
    case 'bomb':
      return drawBomb(g);
    case 'bottle':
      return drawBottle(g);
    case 'pan':
      return drawPan(g);
    case 'broom':
      return drawBroom(g);
  }
}

/** Fill a shape with corners at the given points. */
function shape(g: Graphics, color: number, points: readonly Point[], alpha = 1): void {
  const [first, ...rest] = points;
  if (!first) return;
  g.fillStyle(color, alpha);
  g.beginPath();
  g.moveTo(first[0], first[1]);
  for (const [x, y] of rest) {
    g.lineTo(x, y);
  }
  g.closePath();
  g.fillPath();
}

function drawPistol(g: Graphics): Graphics {
  const c = ITEM_COLORS.gun;
  // Grip, leaning back a little, with grooves
  shape(g, c.gripDark, [
    [-4, -1],
    [6, -1],
    [3, 13],
    [-7, 13],
  ]);
  shape(g, c.grip, [
    [-2.5, 0],
    [4.5, 0],
    [2, 11.5],
    [-5, 11.5],
  ]);
  g.lineStyle(1, c.gripDark, 0.8);
  for (const y of [3, 6, 9]) {
    g.lineBetween(-3.5, y, 3.5, y);
  }
  // Trigger and its guard
  g.lineStyle(1.5, c.dark);
  g.strokeRoundedRect(5.5, 1, 7, 6, 2);
  g.lineBetween(8, 1, 7, 4.5);
  // Slide and barrel
  g.fillStyle(c.dark);
  g.fillRoundedRect(-5, -7, 29.5, 9, 2);
  g.fillStyle(c.body);
  g.fillRoundedRect(-4, -6, 27, 6.5, 1.5);
  g.fillStyle(c.shine, 0.9);
  g.fillRect(-2, -5.5, 21, 1.4);
  g.fillStyle(c.dark);
  g.fillRect(-3, -8.5, 3, 2);
  g.fillRect(20, -8.5, 2, 2);
  g.fillRect(14, -4, 1.5, 4);
  g.fillRect(16.5, -4, 1.5, 4);
  return g;
}

function drawMachineGun(g: Graphics): Graphics {
  const c = ITEM_COLORS.gun;
  // Stock
  shape(g, c.gripDark, [
    [-23, -5],
    [-8, -6],
    [-8, 3],
    [-23, 7],
  ]);
  shape(g, c.grip, [
    [-21.5, -3.5],
    [-9, -4.5],
    [-9, 1.5],
    [-21.5, 5],
  ]);
  // Magazine, curved forward
  shape(g, c.dark, [
    [6, 1],
    [14, 1],
    [17, 14],
    [9.5, 14],
  ]);
  shape(g, c.body, [
    [7.5, 2],
    [12.5, 2],
    [15, 12.5],
    [10.5, 12.5],
  ]);
  // Grip
  shape(g, c.gripDark, [
    [-4, 1],
    [3, 1],
    [1, 11],
    [-6, 11],
  ]);
  // Barrel with its tip
  g.fillStyle(c.dark);
  g.fillRect(20, -5.5, 19, 4.5);
  g.fillRect(37, -7, 4, 7.5);
  g.fillStyle(c.shine, 0.8);
  g.fillRect(22, -5, 14, 1.2);
  // Body
  g.fillStyle(c.dark);
  g.fillRoundedRect(-9, -8, 32, 10.5, 2);
  g.fillStyle(c.body);
  g.fillRoundedRect(-8, -7, 30, 8, 1.5);
  g.fillStyle(c.shine, 0.9);
  g.fillRect(-6, -6.5, 26, 1.4);
  g.fillStyle(c.dark);
  g.fillRect(8, -11, 4, 3.5);
  g.fillRect(-2, -3.5, 12, 1.5);
  g.lineStyle(1.5, c.dark);
  g.strokeRoundedRect(-1, 2, 6, 5, 2);
  return g;
}

function drawSword(g: Graphics): Graphics {
  const blade = ITEM_COLORS.blade;
  const c = ITEM_COLORS.sword;
  // Blade: dark edge all around, bright upper half, darker lower half
  shape(g, blade.dark, [
    [3, -5.5],
    [47, -5.5],
    [59, 0],
    [47, 5.5],
    [3, 5.5],
  ]);
  shape(g, blade.light, [
    [4, -4.3],
    [46.5, -4.3],
    [56, 0],
    [4, 0],
  ]);
  shape(g, blade.steel, [
    [4, 0],
    [56, 0],
    [46.5, 4.3],
    [4, 4.3],
  ]);
  g.lineStyle(1.2, blade.dark, 0.7);
  g.lineBetween(7, 0, 42, 0);
  // Grip with a wrap, and a round pommel
  g.fillStyle(c.wrap);
  g.fillRoundedRect(-10, -3, 11, 6, 2);
  g.fillStyle(c.grip);
  for (const x of [-9, -6, -3]) {
    g.fillRect(x, -3, 1.8, 6);
  }
  g.fillStyle(c.guardDark);
  g.fillCircle(-11.5, 0, 3.6);
  g.fillStyle(c.guard);
  g.fillCircle(-11.8, -0.5, 2.4);
  // Crossguard with round ends
  g.fillStyle(c.guardDark);
  g.fillRoundedRect(-0.5, -9, 5.5, 18, 2.5);
  g.fillStyle(c.guard);
  g.fillRoundedRect(0.3, -8.2, 3.2, 16.4, 1.6);
  return g;
}

function drawAxe(g: Graphics): Graphics {
  const blade = ITEM_COLORS.blade;
  const wood = ITEM_COLORS.wood;
  // Handle with a wrapped grip
  g.fillStyle(wood.dark);
  g.fillRoundedRect(-12, -3, 50, 6, 2.5);
  g.fillStyle(wood.fill);
  g.fillRoundedRect(-11, -2, 48, 3.2, 1.5);
  g.fillStyle(wood.wrap);
  for (const x of [-10, -6, -2]) {
    g.fillRect(x, -3, 2.2, 6);
  }
  // Head: a wide curved blade on the upper side
  shape(g, blade.dark, [
    [20, 3],
    [39, 3],
    [44, -18],
    [31, -12.5],
    [17, -18],
  ]);
  shape(g, blade.steel, [
    [21.5, 1.5],
    [37.5, 1.5],
    [41.5, -15],
    [31, -10.5],
    [19.5, -15],
  ]);
  shape(g, blade.light, [
    [19.5, -15],
    [31, -10.5],
    [41.5, -15],
    [40.8, -12],
    [31, -7.5],
    [20.2, -12],
  ]);
  g.fillStyle(blade.dark);
  g.fillRect(26, -3.5, 7, 7);
  return g;
}

function drawSpear(g: Graphics): Graphics {
  const blade = ITEM_COLORS.blade;
  const wood = ITEM_COLORS.wood;
  // Shaft
  g.fillStyle(wood.dark);
  g.fillRoundedRect(-30, -2.5, 82, 5, 2);
  g.fillStyle(wood.fill);
  g.fillRect(-29, -1.6, 80, 2.2);
  // Wrapped where the hand holds it, and where the tip is tied on
  g.fillStyle(wood.wrap);
  for (const x of [-5, -1, 3, 44, 47.5]) {
    g.fillRect(x, -2.8, 2.2, 5.6);
  }
  // Leaf-shaped tip
  shape(g, blade.dark, [
    [49, 0],
    [55, -5],
    [68, 0],
    [55, 5],
  ]);
  shape(g, blade.light, [
    [51, 0],
    [55.5, -3.6],
    [65.5, 0],
  ]);
  shape(g, blade.steel, [
    [51, 0],
    [65.5, 0],
    [55.5, 3.6],
  ]);
  return g;
}

function drawBat(g: Graphics): Graphics {
  const wood = ITEM_COLORS.wood;
  // Thin at the handle, thick at the end
  shape(g, wood.dark, [
    [-12, -3],
    [12, -3.5],
    [28, -6],
    [49, -6],
    [49, 6],
    [28, 6],
    [12, 3.5],
    [-12, 3],
  ]);
  g.fillCircle(49, 0, 6);
  shape(g, wood.fill, [
    [-11, -1.9],
    [12, -2.4],
    [28, -4.8],
    [49, -4.8],
    [49, 4.8],
    [28, 4.8],
    [12, 2.4],
    [-11, 1.9],
  ]);
  g.fillCircle(49, 0, 4.8);
  shape(
    g,
    wood.light,
    [
      [14, -2],
      [28, -4],
      [48, -4],
      [48, -1.6],
      [28, -1.6],
      [14, -0.6],
    ],
    0.8,
  );
  // Grip tape and the knob at the end
  g.fillStyle(wood.wrap);
  g.fillRoundedRect(-11, -3, 17, 6, 2);
  g.fillCircle(-13, 0, 3.6);
  g.fillStyle(wood.dark, 0.9);
  for (const x of [-8, -4, 0]) {
    g.fillRect(x, -3, 1.4, 6);
  }
  return g;
}

function drawBomb(g: Graphics): Graphics {
  const c = ITEM_COLORS.bomb;
  // A curly fuse
  g.lineStyle(2.6, c.fuse);
  g.beginPath();
  g.moveTo(0, -15);
  g.lineTo(3, -20);
  g.lineTo(8, -19);
  g.lineTo(FUSE_TIP.x, FUSE_TIP.y);
  g.strokePath();
  g.fillStyle(c.cap);
  g.fillRoundedRect(-4.5, -17, 9, 6, 1.5);
  g.fillStyle(c.body);
  g.fillCircle(0, 0, 13);
  g.fillStyle(c.shine, 0.35);
  g.fillCircle(-2, -2, 9);
  g.fillStyle(c.body, 0.85);
  g.fillCircle(1, 1, 9);
  g.fillStyle(c.shine, 0.9);
  g.fillEllipse(-5.5, -6.5, 6, 3.5);
  return g;
}

/** A green glass bottle, held by the neck: cap, neck, shoulder, body and a paper label. */
function drawBottle(g: Graphics): Graphics {
  const c = ITEM_COLORS.bottle;
  shape(g, c.dark, [
    [-4, -3.6],
    [10, -3.6],
    [17, -8],
    [43, -8],
    [45, -6],
    [45, 6],
    [43, 8],
    [17, 8],
    [10, 3.6],
    [-4, 3.6],
  ]);
  shape(g, c.glass, [
    [-3, -2.4],
    [10, -2.4],
    [17.5, -6.6],
    [42.5, -6.6],
    [43.6, -5.5],
    [43.6, 5.5],
    [42.5, 6.6],
    [17.5, 6.6],
    [10, 2.4],
    [-3, 2.4],
  ]);
  // Light shining through the glass along the top
  shape(
    g,
    c.shine,
    [
      [-1, -1.8],
      [10, -1.8],
      [17.5, -5.4],
      [41, -5.4],
      [41, -3.6],
      [18, -3.6],
      [10, -0.6],
      [-1, -0.6],
    ],
    0.7,
  );
  g.fillStyle(c.dark, 0.35);
  g.fillRect(18, 3.5, 24, 2.5);
  // Paper label
  g.fillStyle(c.label);
  g.fillRect(22, -6.6, 15, 13.2);
  g.fillStyle(c.dark, 0.5);
  g.fillRect(24.5, -3, 10, 1.4);
  g.fillRect(24.5, 0, 10, 1.4);
  g.fillRect(24.5, 3, 6, 1.4);
  // Cap
  g.fillStyle(c.dark);
  g.fillRoundedRect(-7.5, -4.4, 5, 8.8, 1.5);
  g.fillStyle(c.cap);
  g.fillRoundedRect(-6.8, -3.6, 3.6, 7.2, 1);
  return g;
}

/** A frying pan seen from above: a wooden handle and a round, dark pan with a rim. */
function drawPan(g: Graphics): Graphics {
  const c = ITEM_COLORS.pan;
  // Handle with a metal neck and a hole to hang it by
  g.fillStyle(c.dark);
  g.fillRoundedRect(-11, -3.4, 30, 6.8, 3);
  g.fillStyle(c.handle);
  g.fillRoundedRect(-10, -2.4, 22, 4.8, 2.4);
  g.fillStyle(c.dark);
  g.fillCircle(-6.5, 0, 1.3);
  g.fillStyle(c.metal);
  g.fillRect(12, -2.4, 7, 4.8);
  // Pan: dark rim, metal edge, and the darker inside with a shine
  g.fillStyle(c.dark);
  g.fillCircle(33, 0, 16);
  g.fillStyle(c.metal);
  g.fillCircle(33, 0, 14.6);
  g.fillStyle(c.inside);
  g.fillCircle(33, 0, 11.5);
  g.fillStyle(c.shine, 0.45);
  g.fillEllipse(28.5, -5.5, 9, 5);
  g.lineStyle(1.2, c.shine, 0.6);
  g.strokeCircle(33, 0, 13.2);
  return g;
}

/** A broom: a long wooden handle and a head of straw bristles tied with a red band. */
function drawBroom(g: Graphics): Graphics {
  const wood = ITEM_COLORS.wood;
  const c = ITEM_COLORS.broom;
  // Handle
  g.fillStyle(wood.dark);
  g.fillRoundedRect(-30, -2.6, 66, 5.2, 2.4);
  g.fillStyle(wood.fill);
  g.fillRect(-29, -1.6, 64, 2.2);
  // The bristles fan out from the band to the end
  shape(g, c.bristleDark, [
    [36, -6.5],
    [53, -13],
    [53, 13],
    [36, 6.5],
  ]);
  shape(g, c.bristle, [
    [37, -5.2],
    [52, -11.5],
    [52, 11.5],
    [37, 5.2],
  ]);
  g.lineStyle(1, c.bristleDark, 0.75);
  for (const tip of [-8, -4, 0, 4, 8]) {
    g.lineBetween(38, tip * 0.45, 52, tip);
  }
  // The band that ties them to the handle
  g.fillStyle(c.bandDark);
  g.fillRoundedRect(33, -7.2, 6, 14.4, 2);
  g.fillStyle(c.band);
  g.fillRoundedRect(34, -6.2, 3.2, 12.4, 1.4);
  return g;
}
