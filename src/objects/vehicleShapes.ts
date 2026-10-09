import type Phaser from 'phaser';
import { BLOCKS, WHEEL, type BlockDef, type VehicleKind } from '../config';
import { shade } from '../logic/color';

type Graphics = Phaser.GameObjects.Graphics;
type Point = readonly [number, number];

const OUTLINE = 1.6;

/**
 * Draws a vehicle without its wheels, facing right. The middle of its bottom edge is
 * at (0, 0). The wheels are drawn separately, so that they can turn.
 */
export function drawVehicle(g: Graphics, kind: VehicleKind): Graphics {
  const def = BLOCKS[kind];
  switch (kind) {
    case 'car':
      return drawCar(g, def);
    case 'truck':
      return drawTruck(g, def);
    case 'bike':
      return drawBike(g, def);
    case 'skateboard':
      return drawSkateboard(g, def);
  }
}

/** Draws a whole vehicle with its wheels on, standing still: the picture for the menu. */
export function drawParkedVehicle(g: Graphics, kind: VehicleKind): Graphics {
  drawVehicle(g, kind);
  const wheels = BLOCKS[kind].drive?.wheels;
  if (!wheels) return g;
  for (const x of wheels.xs) {
    g.save();
    g.translateCanvas(x, -wheels.up);
    drawWheel(g, wheels.radius);
    g.restore();
  }
  return g;
}

/** Draws one wheel around (0, 0): a tire, a rim and spokes that show it turning. */
export function drawWheel(g: Graphics, radius: number): Graphics {
  g.fillStyle(WHEEL.tire);
  g.fillCircle(0, 0, radius);
  if (radius < 5) {
    // A tiny skateboard wheel: just a hub and one mark
    g.fillStyle(WHEEL.rim);
    g.fillCircle(0, 0, radius * 0.45);
    g.lineStyle(1, WHEEL.rim);
    g.lineBetween(0, 0, radius - 0.5, 0);
    return g;
  }
  g.fillStyle(WHEEL.rim);
  g.fillCircle(0, 0, radius * 0.62);
  g.lineStyle(1.6, WHEEL.hub);
  for (let i = 0; i < WHEEL.spokes; i++) {
    const angle = (i / WHEEL.spokes) * Math.PI;
    const x = Math.cos(angle) * radius * 0.58;
    const y = Math.sin(angle) * radius * 0.58;
    g.lineBetween(-x, -y, x, y);
  }
  g.fillStyle(WHEEL.hub);
  g.fillCircle(0, 0, radius * 0.22);
  return g;
}

function shape(g: Graphics, fill: number, outline: number, points: readonly Point[]): void {
  const [first, ...rest] = points;
  if (!first) return;
  g.beginPath();
  g.moveTo(first[0], first[1]);
  for (const [x, y] of rest) {
    g.lineTo(x, y);
  }
  g.closePath();
  g.fillStyle(fill);
  g.fillPath();
  g.lineStyle(OUTLINE, outline);
  g.strokePath();
}

/** A pane of glass: you can see through it. */
function glass(g: Graphics, color: number, points: readonly Point[]): void {
  const [first, ...rest] = points;
  if (!first) return;
  g.beginPath();
  g.moveTo(first[0], first[1]);
  for (const [x, y] of rest) {
    g.lineTo(x, y);
  }
  g.closePath();
  g.fillStyle(color, 0.38);
  g.fillPath();
}

function box(
  g: Graphics,
  fill: number,
  outline: number,
  x: number,
  y: number,
  width: number,
  height: number,
  round: number,
): void {
  g.fillStyle(fill);
  g.fillRoundedRect(x, y, width, height, round);
  g.lineStyle(OUTLINE, outline);
  g.strokeRoundedRect(x, y, width, height, round);
}

/** A small red car: cabin with two windows, lights, bumpers and wheel arches. */
function drawCar(g: Graphics, def: BlockDef): Graphics {
  const { fill, dark, light, detail } = def.colors;
  const wheels = def.drive?.wheels;
  // Cabin: a roof on three pillars, with nothing in between, so that whoever sits
  // inside shows through the glass
  shape(g, fill, dark, [
    [-30, -24],
    [-20, -40],
    [-17, -37],
    [-24, -25],
  ]);
  shape(g, fill, dark, [
    [-3, -37],
    [1, -37],
    [1, -25],
    [-3, -25],
  ]);
  shape(g, fill, dark, [
    [14, -37],
    [16, -40],
    [30, -24],
    [24, -25],
  ]);
  shape(g, fill, dark, [
    [-20, -40],
    [16, -40],
    [14, -37],
    [-17, -37],
  ]);
  glass(g, detail, [
    [-24, -25],
    [-17, -37],
    [-3, -37],
    [-3, -25],
  ]);
  glass(g, detail, [
    [1, -25],
    [1, -37],
    [14, -37],
    [24, -25],
  ]);
  g.fillStyle(0xffffff, 0.45);
  g.fillTriangle(-21, -27, -16, -35, -12, -35);
  // Body
  box(g, fill, dark, -52, -27, 104, 19, 7);
  g.fillStyle(light, 0.7);
  g.fillRoundedRect(-46, -25, 92, 3, 1.5);
  g.fillStyle(dark, 0.35);
  g.fillRoundedRect(-50, -13, 100, 4, 2);
  g.lineStyle(1.2, dark, 0.8);
  g.lineBetween(-1, -25, -1, -10);
  g.fillStyle(dark);
  g.fillRoundedRect(4, -21, 7, 2.4, 1);
  // Lights and bumpers
  g.fillStyle(0xfff59d);
  g.fillRoundedRect(46, -23, 5, 6, 2);
  g.fillStyle(0x7f0000);
  g.fillRoundedRect(-51, -23, 4, 6, 2);
  g.fillStyle(0xb0b8c0);
  g.fillRoundedRect(44, -12, 9, 4, 2);
  g.fillRoundedRect(-53, -12, 9, 4, 2);
  // Dark arches for the wheels to sit in
  if (wheels) {
    g.fillStyle(shade(dark, -0.4));
    for (const x of wheels.xs) {
      g.fillCircle(x, -wheels.up, wheels.radius + 2.5);
    }
  }
  return g;
}

/** A truck: a big ribbed box on the back, and a blue cab with a window in front. */
function drawTruck(g: Graphics, def: BlockDef): Graphics {
  const { fill, dark, light, detail } = def.colors;
  const wheels = def.drive?.wheels;
  // Frame under everything
  g.fillStyle(0x2a2a2e);
  g.fillRect(-76, -20, 150, 7);
  // Cargo box with ribs
  box(g, detail, shade(detail, -0.5), -78, -62, 104, 44, 3);
  g.lineStyle(1.2, shade(detail, -0.25));
  for (let x = -62; x < 22; x += 16) {
    g.lineBetween(x, -59, x, -21);
  }
  g.fillStyle(0xffffff, 0.6);
  g.fillRect(-75, -60, 98, 3);
  // Cab: built around an empty window, so that the driver shows through the glass
  shape(g, fill, dark, [
    [28, -18],
    [28, -52],
    [42, -52],
    [42, -18],
  ]);
  shape(g, fill, dark, [
    [42, -52],
    [56, -52],
    [55, -48],
    [42, -48],
  ]);
  shape(g, fill, dark, [
    [55, -48],
    [56, -52],
    [72, -36],
    [78, -30],
    [67, -34],
    [67, -35],
  ]);
  shape(g, fill, dark, [
    [42, -34],
    [67, -34],
    [78, -30],
    [78, -18],
    [42, -18],
  ]);
  glass(g, 0x9fd6f2, [
    [42, -34],
    [42, -48],
    [55, -48],
    [67, -35],
    [67, -34],
  ]);
  g.fillStyle(0xffffff, 0.45);
  g.fillTriangle(45, -36, 45, -46, 52, -46);
  g.fillStyle(light, 0.7);
  g.fillRect(31, -50, 22, 2.5);
  g.lineStyle(1.2, dark, 0.8);
  g.lineBetween(40, -32, 40, -20);
  // Lights and bumper
  g.fillStyle(0xfff59d);
  g.fillRoundedRect(73, -29, 5, 6, 2);
  g.fillStyle(0x7f0000);
  g.fillRect(-78, -24, 3, 5);
  g.fillStyle(0xb0b8c0);
  g.fillRoundedRect(70, -19, 10, 5, 2);
  if (wheels) {
    g.fillStyle(0x151517);
    for (const x of wheels.xs) {
      g.fillCircle(x, -wheels.up, wheels.radius + 2.5);
    }
  }
  return g;
}

/** A motorbike: frame, engine, tank, seat, handlebar and a headlight. */
function drawBike(g: Graphics, def: BlockDef): Graphics {
  const { fill, dark, light, detail } = def.colors;
  // Frame and fork
  g.lineStyle(3, dark);
  g.lineBetween(-22, -11, -6, -24);
  g.lineBetween(-6, -24, 12, -24);
  g.lineBetween(22, -11, 13, -31);
  g.lineBetween(-22, -11, 2, -11);
  g.lineBetween(2, -11, 12, -24);
  // Engine and exhaust
  box(g, detail, dark, -8, -19, 15, 10, 3);
  g.lineStyle(1, dark, 0.7);
  g.lineBetween(-5, -16, 4, -16);
  g.lineBetween(-5, -13, 4, -13);
  g.fillStyle(detail);
  g.fillRoundedRect(-30, -10, 22, 3.5, 1.5);
  // Tank, seat and rear fender
  shape(g, fill, dark, [
    [-4, -24],
    [0, -32],
    [12, -32],
    [15, -24],
  ]);
  g.fillStyle(light, 0.75);
  g.fillRoundedRect(1, -30.5, 9, 2, 1);
  shape(g, 0x1c1c1f, dark, [
    [-24, -25],
    [-22, -30],
    [-5, -29],
    [-4, -24],
  ]);
  shape(g, fill, dark, [
    [-32, -19],
    [-30, -24],
    [-22, -25],
    [-22, -21],
  ]);
  // Handlebar and headlight
  g.lineStyle(2.5, dark);
  g.lineBetween(13, -31, 9, -39);
  g.lineBetween(6, -39, 13, -40);
  g.fillStyle(dark);
  g.fillCircle(18, -30, 4.5);
  g.fillStyle(0xfff59d);
  g.fillCircle(19.5, -30, 3);
  return g;
}

/** A skateboard: a deck with turned-up ends on two small axles. */
function drawSkateboard(g: Graphics, def: BlockDef): Graphics {
  const { fill, dark, light, detail } = def.colors;
  shape(g, fill, dark, [
    [-27, -10],
    [-22, -8],
    [22, -8],
    [27, -10],
    [26, -7],
    [21, -4.5],
    [-21, -4.5],
    [-26, -7],
  ]);
  g.fillStyle(light, 0.8);
  g.fillRect(-19, -7.5, 38, 1.2);
  g.fillStyle(detail);
  g.fillRect(-20, -4.5, 6, 2);
  g.fillRect(14, -4.5, 6, 2);
  return g;
}
