import type Phaser from 'phaser';
import { BLOCKS, ROTOR, WHEEL, type BlockDef, type VehicleKind } from '../config';
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
    case 'helicopter':
      return drawHelicopter(g, def);
    case 'plane':
      return drawPlane(g, def);
  }
}

/** Draws a whole vehicle with its wheels on, standing still: the picture for the menu. */
export function drawParkedVehicle(g: Graphics, kind: VehicleKind): Graphics {
  drawVehicle(g, kind);
  const drive = BLOCKS[kind].drive;
  if (!drive) return g;
  for (const x of drive.wheels.xs) {
    g.save();
    g.translateCanvas(x, -drive.wheels.up);
    drawWheel(g, drive.wheels.radius);
    g.restore();
  }
  if (drive.rotor) {
    g.save();
    g.translateCanvas(drive.rotor.x, -drive.rotor.up);
    drawRotor(g, drive.rotor);
    g.restore();
  }
  return g;
}

/** Draws a rotor or a propeller around (0, 0): two blades and a hub. */
export function drawRotor(
  g: Graphics,
  rotor: { length: number; thickness: number; flat: boolean },
): Graphics {
  const { length, thickness, flat } = rotor;
  g.fillStyle(ROTOR.color);
  if (flat) {
    g.fillRoundedRect(-length / 2, -thickness / 2, length, thickness, thickness / 2);
  } else {
    g.fillRoundedRect(-thickness / 2, -length / 2, thickness, length, thickness / 2);
  }
  g.fillStyle(ROTOR.hub);
  g.fillCircle(0, 0, thickness);
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

/**
 * A helicopter: a cabin with a big see-through bubble in front, a tail boom with a
 * fin and a small rotor, and two skids. The big rotor on top is drawn separately.
 */
function drawHelicopter(g: Graphics, def: BlockDef): Graphics {
  const { fill, dark, light, detail } = def.colors;
  // Skids and their struts
  g.lineStyle(2.5, dark);
  g.lineBetween(-22, -2, 34, -2);
  g.lineBetween(34, -2, 38, -5);
  g.lineBetween(-12, -2, -8, -10);
  g.lineBetween(20, -2, 16, -10);
  // Tail boom, fin and the little rotor at the end
  shape(g, fill, dark, [
    [-10, -31],
    [-46, -27],
    [-46, -22],
    [-10, -17],
  ]);
  shape(g, fill, dark, [
    [-39, -26],
    [-48, -42],
    [-43, -42],
    [-36, -26],
  ]);
  g.fillStyle(ROTOR.color, 0.35);
  g.fillCircle(-46, -30, 7);
  g.fillStyle(ROTOR.hub);
  g.fillCircle(-46, -30, 1.8);
  // Cabin: built around the open bubble, so that the pilot shows through the glass
  box(g, fill, dark, -12, -37, 26, 29, 9);
  shape(g, fill, dark, [
    [12, -37],
    [29, -37],
    [34, -32],
    [12, -32],
  ]);
  shape(g, fill, dark, [
    [29, -37],
    [37, -30],
    [43, -18],
    [38, -18],
    [33, -32],
  ]);
  shape(g, fill, dark, [
    [12, -18],
    [43, -18],
    [40, -10],
    [12, -8],
  ]);
  glass(g, detail, [
    [14, -32],
    [33, -32],
    [38, -18],
    [14, -18],
  ]);
  g.fillStyle(0xffffff, 0.45);
  g.fillTriangle(17, -20, 17, -30, 24, -30);
  g.fillStyle(light, 0.7);
  g.fillRoundedRect(-8, -34, 16, 2.5, 1);
  g.fillStyle(dark, 0.35);
  g.fillRect(-9, -13, 46, 3);
  // Mast for the rotor
  g.fillStyle(dark);
  g.fillRect(8, -44, 4, 8);
  return g;
}

/**
 * A small plane: a white body with a red stripe, a wing, a tail, and a glass canopy
 * that the pilot's head shows through. The propeller is drawn separately.
 */
function drawPlane(g: Graphics, def: BlockDef): Graphics {
  const { fill, dark, light, detail } = def.colors;
  // Legs for the two little wheels
  g.lineStyle(2, dark);
  g.lineBetween(-28, -5, -30, -13);
  g.lineBetween(22, -5, 20, -12);
  // Tail fin and tailplane
  shape(g, detail, dark, [
    [-50, -22],
    [-56, -41],
    [-46, -41],
    [-36, -27],
  ]);
  shape(g, fill, dark, [
    [-54, -20],
    [-40, -22],
    [-38, -18],
    [-54, -16],
  ]);
  // Body, with a nose cone for the propeller
  shape(g, fill, dark, [
    [-52, -23],
    [-38, -30],
    [32, -30],
    [48, -26],
    [54, -19],
    [48, -12],
    [30, -10],
    [-44, -13],
  ]);
  g.fillStyle(light, 0.9);
  g.fillRect(-36, -28.5, 66, 2.5);
  g.fillStyle(detail);
  g.fillRect(-42, -21, 88, 3);
  g.fillStyle(dark, 0.3);
  g.fillRect(-40, -15, 78, 3);
  // Wing, seen from the side
  shape(g, shade(fill, -0.12), dark, [
    [-10, -20],
    [16, -20],
    [8, -12],
    [-18, -12],
  ]);
  // Canopy: just glass and a thin frame over the body
  glass(g, 0x9fd6f2, [
    [2, -30],
    [8, -40],
    [22, -40],
    [32, -30],
  ]);
  g.lineStyle(1.6, dark);
  g.lineBetween(2, -30, 8, -40);
  g.lineBetween(8, -40, 22, -40);
  g.lineBetween(22, -40, 32, -30);
  g.lineBetween(15, -40, 15, -30);
  return g;
}
