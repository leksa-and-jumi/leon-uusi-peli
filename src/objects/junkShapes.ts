import type Phaser from 'phaser';
import {
  BLOCKS,
  BOSS_LOOK,
  CHOMPER,
  SKIBIDI,
  type BlockDef,
  type JunkBlockKind,
  type MonsterDef,
  type MonsterKind,
} from '../config';
import { shade } from '../logic/color';

type Graphics = Phaser.GameObjects.Graphics;
type Point = readonly [number, number];

/** How thick the dark line around every part is. */
const OUTLINE = 1.6;

/**
 * Draws a piece of junk with code, with outlines, shading and small details so it
 * looks like the real thing. The middle of its bottom edge is at (0, 0).
 */
export function drawJunk(g: Graphics, kind: JunkBlockKind | MonsterKind): Graphics {
  const def = BLOCKS[kind];
  switch (kind) {
    case 'toilet':
      return drawToilet(g, def);
    case 'tv':
      return drawTv(g, def);
    case 'trashcan':
      return drawTrashCan(g, def);
    case 'armchair':
      return drawArmchair(g, def);
    case 'table':
      return drawTable(g, def);
    case 'fridge':
      return drawFridge(g, def);
    case 'skibidi':
    case 'skibidiToilet':
    case 'skibidiCone':
    case 'skibidiTv':
    case 'chomper': {
      // In the menu the head is drawn popped out, behind the thing it lives in
      const { head, body, face } = def.monster ?? {};
      if (!head || !body) return g;
      const scale = head.scale ?? 1;
      g.save();
      g.translateCanvas(head.x, -head.outUp);
      g.scaleCanvas(scale, scale);
      drawMonsterHead(g, face, head);
      g.restore();
      return drawJunk(g, body);
    }
    case 'ghost':
      return drawGhost(g, def);
    case 'batMonster':
      return drawBatMonster(g, def);
    case 'ufo':
      return drawUfo(g, def);
    case 'boss':
      return drawBoss(g, def);
    case 'cone':
      return drawCone(g, def);
    case 'tire':
      return drawTire(g, def);
  }
}

/** A filled shape with corners at the given points and a dark line around it. */
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

/** A filled box with round corners and a dark line around it. */
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

/** A white porcelain toilet seen from the side: tank, seat, bowl and foot. */
function drawToilet(g: Graphics, def: BlockDef): Graphics {
  const { fill, dark, light, detail } = def.colors;
  // Foot
  shape(g, fill, dark, [
    [-7, 0],
    [15, 0],
    [12, -17],
    [-4, -17],
  ]);
  g.fillStyle(detail, 0.7);
  g.fillRect(9, -15, 3, 14);
  // Bowl, wide at the top and narrow at the foot
  shape(g, fill, dark, [
    [-11, -34],
    [24, -34],
    [22, -25],
    [13, -15],
    [-5, -15],
    [-11, -21],
  ]);
  shape(g, detail, detail, [
    [8, -17],
    [13, -17],
    [20, -26],
    [21, -32],
    [17, -32],
  ]);
  g.fillStyle(light);
  g.fillRoundedRect(-8, -32, 9, 12, 3);
  // Seat and lid
  box(g, light, dark, -13, -39, 38, 6, 3);
  g.lineStyle(1, detail);
  g.lineBetween(-10, -36, 22, -36);
  // Tank with its lid and the flush button
  box(g, fill, dark, -25, -53, 17, 33, 3);
  box(g, light, dark, -26, -58, 19, 6, 2);
  g.fillStyle(detail);
  g.fillRoundedRect(-19, -60, 6, 3, 1);
  g.fillStyle(detail, 0.7);
  g.fillRect(-12, -51, 3, 29);
  g.fillStyle(light);
  g.fillRoundedRect(-23, -50, 4, 26, 2);
  return g;
}

/** An old television: a dark box with a glass screen, knobs, a speaker and an aerial. */
function drawTv(g: Graphics, def: BlockDef): Graphics {
  const { fill, dark, light, detail } = def.colors;
  // The aerial sticks up above the box
  g.lineStyle(1.8, light);
  g.lineBetween(-2, -44, -16, -64);
  g.lineBetween(2, -44, 13, -66);
  g.fillStyle(light);
  g.fillCircle(-16, -64, 2);
  g.fillCircle(13, -66, 2);
  // Feet and box
  g.fillStyle(dark);
  g.fillRect(-23, -5, 9, 5);
  g.fillRect(14, -5, 9, 5);
  box(g, fill, dark, -31, -46, 62, 42, 5);
  g.fillStyle(light, 0.5);
  g.fillRoundedRect(-28, -44, 56, 3, 1.5);
  // Screen: dark rim, bluish glass, and a streak of light across it
  box(g, dark, dark, -27, -41, 42, 32, 4);
  g.fillStyle(detail);
  g.fillRoundedRect(-25, -39, 38, 28, 4);
  g.fillStyle(shade(detail, 0.5), 0.7);
  g.fillTriangle(-22, -37, -8, -37, -22, -20);
  g.fillStyle(shade(detail, -0.35), 0.5);
  g.fillRoundedRect(-25, -18, 38, 7, 3);
  // Knobs and speaker slits
  g.fillStyle(dark);
  g.fillCircle(23, -35, 4);
  g.fillCircle(23, -24, 4);
  g.fillStyle(light);
  g.fillCircle(23, -35, 2.4);
  g.fillCircle(23, -24, 2.4);
  g.lineStyle(1, dark);
  for (const y of [-16, -13, -10]) {
    g.lineBetween(19, y, 27, y);
  }
  return g;
}

/** A metal trash can: ribbed sides, wider at the top, with a lid and a handle. */
function drawTrashCan(g: Graphics, def: BlockDef): Graphics {
  const { fill, dark, light, detail } = def.colors;
  shape(g, fill, dark, [
    [-15, 0],
    [15, 0],
    [18, -41],
    [-18, -41],
  ]);
  // Ribs down the sides, and a bright streak that makes it look round
  g.lineStyle(1.4, detail);
  for (const x of [-10, -3.5, 3.5, 10]) {
    g.lineBetween(x * 1.15, -39, x, -2);
  }
  g.fillStyle(light, 0.6);
  g.fillRect(-14, -38, 3.5, 34);
  g.fillStyle(dark, 0.35);
  g.fillRect(11, -38, 5, 36);
  g.lineStyle(1.4, dark, 0.7);
  g.lineBetween(-17, -30, 17, -30);
  g.lineBetween(-16, -9, 16, -9);
  // Lid and handle
  box(g, shade(fill, -0.12), dark, -20, -47, 40, 7, 3);
  g.fillStyle(light, 0.6);
  g.fillRoundedRect(-17, -46, 34, 2, 1);
  g.lineStyle(2.2, dark);
  g.strokeRoundedRect(-6, -51, 12, 5, 2);
  return g;
}

/** A soft armchair seen from the side: back, seat cushion, armrest and wooden legs. */
function drawArmchair(g: Graphics, def: BlockDef): Graphics {
  const { fill, dark, light, detail } = def.colors;
  // Wooden legs
  box(g, detail, dark, -29, -8, 7, 8, 1.5);
  box(g, detail, dark, 22, -8, 7, 8, 1.5);
  // Back, leaning a little, then the base, the cushion and the armrest on top
  shape(g, fill, dark, [
    [-34, -18],
    [-14, -18],
    [-11, -52],
    [-16, -56],
    [-30, -56],
    [-34, -50],
  ]);
  g.fillStyle(light, 0.45);
  g.fillRoundedRect(-30, -52, 5, 30, 2);
  box(g, shade(fill, -0.1), dark, -33, -25, 66, 18, 5);
  box(g, shade(fill, 0.08), dark, -16, -34, 46, 12, 5);
  g.fillStyle(light, 0.5);
  g.fillRoundedRect(-12, -32, 38, 2.5, 1);
  box(g, shade(fill, -0.2), dark, -22, -43, 54, 10, 5);
  g.fillStyle(light, 0.4);
  g.fillRoundedRect(-18, -41, 46, 2.5, 1);
  // A button on the back and a seam along the base
  g.fillStyle(dark);
  g.fillCircle(-22, -40, 1.6);
  g.lineStyle(1, dark, 0.6);
  g.lineBetween(-28, -13, 28, -13);
  return g;
}

/** A wooden table: a thick top with grain, a rail under it, and two legs. */
function drawTable(g: Graphics, def: BlockDef): Graphics {
  const { fill, dark, light, detail } = def.colors;
  // Legs, a little thinner toward the floor
  shape(g, detail, dark, [
    [-45, -37],
    [-37, -37],
    [-38, 0],
    [-43, 0],
  ]);
  shape(g, detail, dark, [
    [37, -37],
    [45, -37],
    [43, 0],
    [38, 0],
  ]);
  g.fillStyle(light, 0.35);
  g.fillRect(-43.5, -35, 1.6, 33);
  g.fillRect(38.5, -35, 1.6, 33);
  // Rail and top
  box(g, shade(fill, -0.15), dark, -46, -39, 92, 7, 1.5);
  box(g, fill, dark, -50, -46, 100, 8, 2.5);
  g.fillStyle(light, 0.8);
  g.fillRoundedRect(-48, -45, 96, 2, 1);
  g.lineStyle(1, dark, 0.4);
  g.lineBetween(-40, -41.5, -8, -41.5);
  g.lineBetween(4, -42.5, 42, -42.5);
  return g;
}

/** A fridge: a small freezer door on top, a big door below, handles and feet. */
function drawFridge(g: Graphics, def: BlockDef): Graphics {
  const { fill, dark, light, detail } = def.colors;
  g.fillStyle(detail);
  g.fillRect(-22, -4, 8, 4);
  g.fillRect(14, -4, 8, 4);
  box(g, fill, dark, -27, -112, 54, 109, 5);
  // Light falls on the left side, the right side is in shadow
  g.fillStyle(light);
  g.fillRoundedRect(-24, -109, 6, 103, 3);
  g.fillStyle(dark, 0.22);
  g.fillRoundedRect(17, -109, 8, 103, 3);
  // The gap between the two doors
  g.fillStyle(dark);
  g.fillRect(-27, -76, 54, 2.5);
  g.fillStyle(light);
  g.fillRect(-25, -73.5, 50, 1.2);
  // Handles, each with a shine
  for (const [y, height] of [
    [-104, 21],
    [-66, 40],
  ] as const) {
    g.fillStyle(detail);
    g.fillRoundedRect(15, y, 5, height, 2);
    g.fillStyle(light, 0.8);
    g.fillRect(16, y + 2, 1.4, height - 4);
  }
  // A little badge on the big door
  g.fillStyle(detail, 0.8);
  g.fillRoundedRect(-16, -68, 12, 3, 1);
  return g;
}

/** An orange traffic cone with two white reflective bands and a square foot. */
function drawCone(g: Graphics, def: BlockDef): Graphics {
  const { fill, dark, light, detail } = def.colors;
  const tipY = -42;
  const footY = -6;
  /** How far from the middle the side of the cone is at height `y`. */
  const side = (y: number): number => 3 + ((y - tipY) / (footY - tipY)) * 9.5;
  const band = (top: number, bottom: number): Point[] => [
    [-side(top), top],
    [side(top), top],
    [side(bottom), bottom],
    [-side(bottom), bottom],
  ];

  box(g, shade(fill, -0.15), dark, -18, footY, 36, 6, 2);
  shape(g, fill, dark, band(tipY, footY));
  // Reflective bands
  shape(g, detail, dark, band(-33, -27));
  shape(g, detail, dark, band(-20, -13));
  // A streak of light down the left side, shadow down the right
  shape(g, light, light, [
    [-side(-40) + 1, -40],
    [-side(-40) + 2.5, -40],
    [-side(footY) + 5, footY - 1],
    [-side(footY) + 2, footY - 1],
  ]);
  g.fillStyle(dark, 0.25);
  g.fillTriangle(1, tipY + 1, side(footY) - 1, footY - 1, side(footY) - 5, footY - 1);
  g.fillStyle(dark);
  g.fillRoundedRect(-3, tipY - 1.5, 6, 3, 1.5);
  return g;
}

/** A car tire standing up: rubber with tread, a sidewall, and a steel rim with bolts. */
function drawTire(g: Graphics, def: BlockDef): Graphics {
  const { fill, dark, light, detail } = def.colors;
  const middleY = -def.height / 2;
  const radius = def.halfWidth;
  g.fillStyle(dark);
  g.fillCircle(0, middleY, radius);
  g.fillStyle(fill);
  g.fillCircle(0, middleY, radius - 2);
  // Tread: short notches all around the edge
  g.lineStyle(2, dark);
  for (let i = 0; i < 18; i++) {
    const angle = (i / 18) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    g.lineBetween(
      cos * (radius - 5),
      middleY + sin * (radius - 5),
      cos * (radius - 0.5),
      middleY + sin * (radius - 0.5),
    );
  }
  g.lineStyle(1.2, light, 0.7);
  g.strokeCircle(0, middleY, radius - 7);
  // Rim
  g.fillStyle(dark);
  g.fillCircle(0, middleY, 13);
  g.fillStyle(detail);
  g.fillCircle(0, middleY, 11.5);
  g.fillStyle(shade(detail, 0.45), 0.8);
  g.fillCircle(-3, middleY - 3.5, 5);
  g.fillStyle(shade(detail, -0.35));
  g.fillCircle(0, middleY, 3.5);
  g.fillStyle(dark);
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
    g.fillCircle(Math.cos(angle) * 7.5, middleY + Math.sin(angle) * 7.5, 1.4);
  }
  return g;
}

/**
 * The boss: a huge purple brute with horns, glowing eyes, a jaw full of teeth, thick
 * arms with fists and two heavy legs. Its bottom middle is at (0, 0), and it looks right.
 */
function drawBoss(g: Graphics, def: BlockDef): Graphics {
  const { fill, dark, light, detail } = def.colors;
  const c = BOSS_LOOK;
  // The arm at the back, then the legs
  box(g, shade(fill, -0.25), dark, -58, -122, 22, 66, 10);
  g.fillStyle(dark);
  g.fillCircle(-47, -52, 15);
  g.fillStyle(shade(fill, -0.25));
  g.fillCircle(-47, -52, 13.4);
  for (const x of [-36, 8]) {
    box(g, shade(fill, -0.12), dark, x, -56, 28, 52, 8);
    box(g, shade(fill, -0.3), dark, x - 4, -12, 38, 12, 5);
  }
  // Body, with a paler belly and a belt of spikes
  box(g, fill, dark, -46, -132, 92, 86, 24);
  g.fillStyle(light, 0.35);
  g.fillEllipse(6, -84, 54, 50);
  box(g, dark, dark, -46, -58, 92, 9, 3);
  g.fillStyle(detail);
  for (const x of [-34, -17, 0, 17, 34]) {
    g.fillTriangle(x - 5, -58, x + 5, -58, x, -68);
  }
  // Horns, behind the head
  shape(g, detail, dark, [
    [-20, -152],
    [-34, -176],
    [-8, -160],
  ]);
  shape(g, detail, dark, [
    [26, -154],
    [42, -176],
    [34, -148],
  ]);
  // Head
  g.fillStyle(dark);
  g.fillCircle(6, -140, 29);
  g.fillStyle(fill);
  g.fillCircle(6, -140, 27.4);
  g.fillStyle(light, 0.4);
  g.fillEllipse(0, -156, 30, 12);
  // Glowing eyes under heavy brows
  for (const x of [8, 25]) {
    g.fillStyle(c.glow);
    g.fillCircle(x, -143, 6);
    g.fillStyle(c.eye);
    g.fillCircle(x + 1, -143, 3.4);
  }
  g.lineStyle(4, dark);
  g.lineBetween(0, -153, 15, -148);
  g.lineBetween(34, -153, 19, -148);
  // A wide jaw with teeth
  box(g, c.mouth, dark, -4, -133, 34, 14, 5);
  g.fillStyle(c.teeth);
  for (const x of [-1, 6, 13, 20]) {
    g.fillTriangle(x, -132.5, x + 6, -132.5, x + 3, -126);
    g.fillTriangle(x + 2, -119.5, x + 8, -119.5, x + 5, -125.5);
  }
  // The arm in front, with its fist
  box(g, shade(fill, 0.08), dark, 34, -124, 24, 68, 11);
  g.fillStyle(dark);
  g.fillCircle(46, -52, 16);
  g.fillStyle(shade(fill, 0.08));
  g.fillCircle(46, -52, 14.4);
  g.lineStyle(1.6, dark, 0.8);
  for (const x of [40, 46, 52]) {
    g.lineBetween(x, -44, x, -39);
  }
  return g;
}

/**
 * A bat: a small dark body with pointed ears, red eyes and two fangs, between two
 * wings with scalloped edges. Its bottom middle is at (0, 0).
 */
function drawBatMonster(g: Graphics, def: BlockDef): Graphics {
  const { fill, dark, light, detail } = def.colors;
  for (const side of [-1, 1]) {
    shape(g, fill, dark, [
      [side * 5, -18],
      [side * 15, -25],
      [side * 24, -17],
      [side * 21, -9],
      [side * 16, -12],
      [side * 11, -7],
      [side * 5, -9],
    ]);
    shape(g, light, dark, [
      [side * 6, -19],
      [side * 4, -27],
      [side * 1, -20],
    ]);
  }
  g.fillStyle(dark);
  g.fillEllipse(0, -12, 16, 20);
  g.fillStyle(light);
  g.fillEllipse(0, -12, 13.5, 17.5);
  g.fillStyle(detail);
  g.fillCircle(-2.5, -15, 2);
  g.fillCircle(3.5, -15, 2);
  g.fillStyle(0xffffff);
  g.fillTriangle(-2, -10, 0, -10, -1, -6.5);
  g.fillTriangle(2, -10, 4, -10, 3, -6.5);
  return g;
}

/**
 * A flying saucer: a wide metal disc with lights along its edge, a glass dome on top
 * with a green alien looking out, and the hole in its belly where the laser comes out.
 * Its bottom middle is at (0, 0).
 */
function drawUfo(g: Graphics, def: BlockDef): Graphics {
  const { fill, dark, light, detail } = def.colors;
  // The dome and the alien in it
  g.fillStyle(dark);
  g.fillCircle(0, -20, 17);
  g.fillStyle(UFO_LOOK.glass, 0.85);
  g.fillCircle(0, -20, 15.5);
  g.fillStyle(detail);
  g.fillEllipse(0, -22, 15, 17);
  g.fillStyle(UFO_LOOK.eyes);
  g.fillEllipse(-3, -23, 4.5, 6.5);
  g.fillEllipse(4, -23, 4.5, 6.5);
  g.fillStyle(0xffffff, 0.5);
  g.fillEllipse(-6, -29, 8, 4);
  // The disc
  g.fillStyle(dark);
  g.fillEllipse(0, -11, def.halfWidth * 2, 20);
  g.fillStyle(fill);
  g.fillEllipse(0, -11.5, def.halfWidth * 2 - 3, 17);
  g.fillStyle(light, 0.8);
  g.fillEllipse(-8, -15, 60, 5);
  g.fillStyle(UFO_LOOK.lights);
  for (const x of [-32, -16, 0, 16, 32]) {
    g.fillCircle(x, -9.5 - Math.abs(x) / 16, 2.6);
  }
  // The belly
  g.fillStyle(dark);
  g.fillEllipse(0, -3.5, 30, 7);
  g.fillStyle(detail);
  g.fillEllipse(0, -3, 16, 4);
  return g;
}

/** The colors of a flying saucer that aren't its metal: the glass, the alien's eyes, the lights. */
const UFO_LOOK = { glass: 0xbfe9ff, eyes: 0x10201a, lights: 0xffeb3b };

type HeadDef = NonNullable<MonsterDef['head']>;

/**
 * The head that pops out of a monster, around (0, 0) and looking right. Its neck is
 * only so long that it doesn't stick out under the monster when the head is in.
 */
export function drawMonsterHead(g: Graphics, face: MonsterDef['face'], head: HeadDef): Graphics {
  const { radius } = head;
  const room = head.inUp / (head.scale ?? 1) - (radius - NECK.in);
  const neck = Math.max(0, Math.min(radius * NECK.long, room));
  return face === 'chomper' ? drawChomperHead(g, radius, neck) : drawSkibidiHead(g, radius, neck);
}

/** A neck starts this far inside the bottom of the head, and is at most this many head-radiuses long. */
const NECK = { in: 4, long: 2.4 };

/**
 * The head of the trash-can chomper: a green ball on a neck, with one big staring eye
 * and a mouth wide open, full of pointed fangs.
 */
function drawChomperHead(g: Graphics, radius: number, neck: number): Graphics {
  const c = CHOMPER;
  box(g, c.skin, c.dark, -5, radius - NECK.in, 10, neck, 3);
  g.fillStyle(c.dark);
  g.fillCircle(0, 0, radius);
  g.fillStyle(c.skin);
  g.fillCircle(0, 0, radius - OUTLINE);
  g.fillStyle(0xffffff, 0.25);
  g.fillEllipse(-3, -radius * 0.6, radius, radius * 0.45);
  // Two little horns
  for (const x of [-7, 6]) {
    shape(g, c.teeth, c.dark, [
      [x - 3, -radius + 3],
      [x + 3, -radius + 3],
      [x + 1, -radius - 6],
    ]);
  }
  // One big eye, looking the way it goes
  g.fillStyle(c.dark);
  g.fillCircle(2, -5, 6.4);
  g.fillStyle(c.eye);
  g.fillCircle(2, -5, 5.3);
  g.fillStyle(c.pupil);
  g.fillCircle(3.6, -5, 2.4);
  g.fillStyle(0xffffff);
  g.fillCircle(2.6, -6.4, 0.9);
  // The mouth: wide open, fangs along the top and the bottom
  box(g, c.mouth, c.dark, -9, 2, 20, 9, 3);
  g.fillStyle(c.teeth);
  for (const x of [-7, -2.5, 2, 6.5]) {
    g.fillTriangle(x, 2.6, x + 4, 2.6, x + 2, 6.4);
    g.fillTriangle(x, 10.4, x + 4, 10.4, x + 2, 7.2);
  }
  return g;
}

/**
 * A ghost: a white sheet with a round top and a wavy hem, two dark eyes, a wailing
 * mouth and two little arms held up. Its bottom middle is at (0, 0), and it looks right.
 */
function drawGhost(g: Graphics, def: BlockDef): Graphics {
  const { fill, dark, light, detail } = def.colors;
  const { halfWidth, height } = def;
  const top = -height;
  const dome = halfWidth - 2;
  const waves = 4;
  const outline: Point[] = [];
  // Over the top from the left side to the right, in small steps
  for (let i = 0; i <= 14; i++) {
    const angle = Math.PI + (i / 14) * Math.PI;
    outline.push([Math.cos(angle) * dome, top + dome + Math.sin(angle) * dome]);
  }
  // And back along the hem, which goes up and down in waves
  for (let i = 0; i <= waves * 2; i++) {
    const x = dome - (i / (waves * 2)) * dome * 2;
    outline.push([x, i % 2 === 0 ? -1 : -9]);
  }
  // The arms, behind the sheet
  box(g, fill, dark, dome - 5, top + dome + 4, 13, 8, 4);
  box(g, fill, dark, -dome - 8, top + dome + 8, 13, 8, 4);
  shape(g, fill, dark, outline);
  g.fillStyle(light);
  g.fillEllipse(-7, top + 12, dome * 0.8, 9);
  g.fillStyle(dark, 0.3);
  g.fillRect(dome - 7, top + dome, 5, height - dome - 12);
  // Eyes and a wailing mouth
  g.fillStyle(detail);
  g.fillEllipse(-3, top + 22, 8, 11);
  g.fillEllipse(11, top + 22, 8, 11);
  g.fillEllipse(5, top + 37, 9, 12);
  g.fillStyle(0xffffff);
  g.fillCircle(-2, top + 20, 1.4);
  g.fillCircle(12, top + 20, 1.4);
  return g;
}

/**
 * The head that pops out of a skibidi fridge, around (0, 0) and looking right: a
 * long neck, a bald head with a few hairs, wide staring eyes, eyebrows raised high
 * and a huge grin full of teeth. An own drawing, in the spirit of the meme.
 */
function drawSkibidiHead(g: Graphics, radius: number, neck: number): Graphics {
  const c = SKIBIDI;
  // Neck, long enough to reach down into the fridge
  box(g, c.skin, c.dark, -6, radius - NECK.in, 12, neck, 3);
  // Head
  g.fillStyle(c.dark);
  g.fillCircle(0, 0, radius);
  g.fillStyle(c.skin);
  g.fillCircle(0, 0, radius - OUTLINE);
  g.fillStyle(0xffffff, 0.3);
  g.fillEllipse(-3, -radius * 0.55, radius, radius * 0.5);
  // A few hairs on top
  g.lineStyle(1.4, c.hair);
  for (const x of [-5, -1, 3]) {
    g.lineBetween(x, -radius + 2, x + 3, -radius - 5);
  }
  // Wide, staring eyes with small red pupils, and eyebrows raised high above them
  for (const x of [-3, 8]) {
    g.fillStyle(c.dark);
    g.fillCircle(x, -c.eyes.up, 5.6);
    g.fillStyle(c.eye);
    g.fillCircle(x, -c.eyes.up, 4.6);
    g.fillStyle(c.pupil);
    g.fillCircle(x + 0.6, -c.eyes.up, 1.7);
    g.fillStyle(0xffffff);
    g.fillCircle(x - 1.2, -c.eyes.up - 1.6, 0.9);
  }
  g.lineStyle(1.8, c.hair);
  for (const x of [-3, 8]) {
    g.beginPath();
    g.arc(x, -c.eyes.up - 4.5, 5.5, Math.PI * 1.2, Math.PI * 1.8);
    g.strokePath();
  }
  // A big, wide grin from cheek to cheek, with a row of teeth along the top
  const smileY = 3.5;
  g.fillStyle(c.dark);
  g.beginPath();
  g.arc(2.5, smileY, 11.5, 0, Math.PI);
  g.closePath();
  g.fillPath();
  g.fillStyle(c.mouth);
  g.beginPath();
  g.arc(2.5, smileY + 0.6, 10, 0, Math.PI);
  g.closePath();
  g.fillPath();
  g.fillStyle(c.teeth);
  g.fillRect(-6.5, smileY + 0.6, 18, 3.6);
  g.lineStyle(1, c.dark, 0.7);
  for (const x of [-3, 0.5, 4, 7.5]) {
    g.lineBetween(x, smileY + 0.6, x, smileY + 4.2);
  }
  return g;
}
