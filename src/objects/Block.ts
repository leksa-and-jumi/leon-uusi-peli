import type Phaser from 'phaser';
import {
  BARREL_ACTIONS,
  BLAST,
  BLOCK_LOOK,
  BLOCKS,
  DEPTH,
  PHYSICS,
  THING_ACTIONS,
  TOPPLE,
  type ActionId,
  type BlockDef,
  type BlockKind,
} from '../config';
import { isTall, leaning, supportSpan, toppled, topplePose } from '../logic/balance';
import { clamp } from '../logic/bounds';
import { shade } from '../logic/color';
import { blockedX, liftOut } from '../logic/ground';
import type { PersonSize } from '../logic/place';
import type { Facing } from '../logic/walk';
import { Body, type BodyState } from './Body';
import { drawJunk } from './junkShapes';
import { drawTvProgram } from './tvScreen';
import type { World } from './World';

/**
 * Something solid: a building piece (crate, wall, plank, stone, steel beam, barrel) or
 * a piece of junk (toilet, TV, fridge and so on). They stack, and dolls can stand on
 * them. They have to balance: a piece whose middle isn't over what holds it up slides
 * off, and a tall one falls over onto its side. A barrel explodes when a bullet or a
 * blast hits it.
 */
export class Block extends Body {
  override readonly solid = true;
  readonly def: BlockDef;
  readonly actions: readonly ActionId[];
  readonly crumbs: readonly number[];
  private readonly display: Phaser.GameObjects.Container;
  /** The moving picture on the screen of a TV, or `null` for everything else. */
  private readonly screen: Phaser.GameObjects.Graphics | null = null;
  private clockMs = 0;
  /** Time left until a barrel that has been set off explodes, or `null`. */
  private fuseMs: number | null = null;
  private exploded = false;
  /** How wide and tall it is right now: a piece that has fallen over lies on its side. */
  private shape: PersonSize;
  /** Which way it has fallen over: 0 is standing, 1 onto its right side, -1 onto its left. */
  private fallen: Facing | 0 = 0;
  /** Falling over right now: where it stood, and for how long it has been going. */
  private tipping: { fromX: number; fromY: number; ms: number } | null = null;
  /** Sliding off what it stands on: how fast, and how far it leans meanwhile. */
  private slideSpeed = 0;
  private lean = 0;

  constructor(scene: Phaser.Scene, kind: BlockKind, x: number, y: number) {
    super(x, y);
    this.def = BLOCKS[kind];
    this.shape = { halfWidth: this.def.halfWidth, height: this.def.height };
    this.actions = this.def.blast ? BARREL_ACTIONS : THING_ACTIONS;
    const { fill, dark, light } = this.def.colors;
    this.crumbs = [fill, dark, light];
    const parts = [drawBlock(scene.make.graphics({}, false), kind)];
    if (kind === 'tv') {
      this.screen = scene.make.graphics({}, false);
      parts.push(this.screen);
    }
    this.display = scene.add.container(x, y, parts).setDepth(DEPTH.block);
  }

  get size(): PersonSize {
    return this.shape;
  }

  override get gone(): boolean {
    return super.gone || this.exploded;
  }

  /** Does it go off with a blast when it is hit? */
  get explosive(): boolean {
    return this.def.blast !== undefined;
  }

  /** Standing up, staying put, and tall enough to fall over onto its side. */
  get canTopple(): boolean {
    const { halfWidth, height } = this.def;
    return this.fallen === 0 && this.carries && isTall(halfWidth, height, TOPPLE.tallRatio);
  }

  /** A barrel that has been set off glows on its 🔥 bubble until it goes off. */
  isOn(action: ActionId): boolean {
    return action === 'fuse' && this.fuseMs !== null;
  }

  /** Set a barrel off, or stop it again while its fuse still burns. */
  toggleFuse(): void {
    if (!this.def.blast || this.exploded) return;
    this.fuseMs = this.fuseMs === null ? this.def.blast.fuseMs : null;
    this.display.setAlpha(1);
  }

  /** Hit by a bullet or caught in a blast: a barrel explodes at most `ms` from now. */
  setOff(ms: number): void {
    if (!this.explosive || this.exploded) return;
    this.fuseMs = Math.min(this.fuseMs ?? ms, ms);
  }

  override grab(px: number, py: number): void {
    super.grab(px, py);
    this.tipping = null;
    this.slideSpeed = 0;
  }

  /**
   * Fall over onto one side, around the bottom corner on that side. From now on it
   * lies there, as wide as it was tall. Whatever tall piece it falls onto goes over
   * too, like dominoes.
   */
  topple(direction: Facing, world: World): void {
    if (!this.canTopple) return;
    const lying = toppled({ x: this.x, ...this.shape }, direction);
    this.tipping = { fromX: this.x, fromY: this.y, ms: 0 };
    this.fallen = direction;
    this.shape = { halfWidth: lying.halfWidth, height: lying.height };
    const { left, right } = world.area;
    this.x = clamp(lying.x, left + lying.halfWidth, right - lying.halfWidth);
    this.slideSpeed = 0;
    world.shove(this.box, direction);
    this.y = liftOut(this.box, world.solidBoxes(this));
  }

  update(deltaMs: number, world: World): void {
    this.clockMs += deltaMs;
    const state = this.physics(deltaMs, world);
    const tip = state === 'resting' && !this.tipping ? this.keepBalance(deltaMs, world) : 0;
    if (tip === 0) this.slideSpeed = 0;
    this.lean += (tip * TOPPLE.lean - this.lean) * Math.min(1, deltaMs / TOPPLE.leanMs);
    this.draw(state, deltaMs);
    if (this.screen) drawTvProgram(this.screen, this.clockMs);

    if (this.fuseMs === null || !this.def.blast) return;
    this.fuseMs -= deltaMs;
    // It blinks while its fuse burns
    this.display.setAlpha(Math.floor(this.fuseMs / BLAST.blinkMs) % 2 === 0 ? 1 : 0.55);
    if (this.fuseMs <= 0) {
      this.exploded = true;
      world.explode(this, this.def.blast);
    }
  }

  bringToTop(): void {
    this.display.scene.children.bringToTop(this.display);
  }

  destroy(): void {
    this.display.destroy();
  }

  /**
   * Gravity: its heavy middle has to be over what holds it up. If it isn't, a tall
   * piece falls over that way, and any other piece slides off that way, faster and
   * faster. Says which way it is going: -1 left, 1 right, 0 when it is balanced.
   */
  private keepBalance(deltaMs: number, world: World): Facing | 0 {
    const solids = world.solidBoxes(this);
    const span = supportSpan(this.box, solids, world.area.floorY, PHYSICS.groundSlack);
    const tip = span === 'floor' || span === null ? 0 : leaning(this.x, span, TOPPLE.give);
    if (tip === 0) return 0;
    if (this.canTopple) {
      this.topple(tip, world);
      return 0;
    }
    const seconds = deltaMs / 1000;
    const { halfWidth, height } = this.shape;
    this.slideSpeed += TOPPLE.slideAccel * seconds;
    const wanted = clamp(
      this.x + tip * this.slideSpeed * seconds,
      world.area.left + halfWidth,
      world.area.right - halfWidth,
    );
    this.x = blockedX(this.x, wanted, halfWidth, this.y, height, solids, 0);
    return tip;
  }

  private draw(state: BodyState, deltaMs: number): void {
    if (this.tipping && state !== 'held' && state !== 'flying') {
      this.tipping.ms += deltaMs;
      const part = this.tipping.ms / TOPPLE.ms;
      if (part < 1 && this.fallen !== 0) {
        // It starts slowly and comes down faster, like something heavy
        const { fromX, fromY } = this.tipping;
        const pose = topplePose(fromX, fromY, this.y, this.def.halfWidth, this.fallen, part ** 2);
        this.display.setPosition(pose.x, pose.y);
        this.display.rotation = pose.rotation;
        return;
      }
      this.tipping = null;
    }
    // A piece lying on its side is drawn turned, around the bottom edge it stood on
    const turned = this.fallen * (Math.PI / 2);
    this.display.setPosition(
      this.x - this.fallen * (this.def.height / 2),
      this.fallen === 0 ? this.y : this.y - this.def.halfWidth,
    );
    this.display.rotation = turned + (state === 'flying' ? this.spin : this.lean);
  }
}

type Graphics = Phaser.GameObjects.Graphics;

/** Draws a building piece with code. The middle of its bottom edge is at (0, 0). */
export function drawBlock(g: Graphics, kind: BlockKind): Graphics {
  switch (kind) {
    case 'crate':
      return drawCrate(g, BLOCKS.crate);
    case 'wall':
      return drawWall(g, BLOCKS.wall);
    case 'plank':
      return drawPlank(g, BLOCKS.plank);
    case 'stone':
      return drawStone(g, BLOCKS.stone);
    case 'girder':
      return drawGirder(g, BLOCKS.girder);
    case 'barrel':
      return drawBarrel(g, BLOCKS.barrel);
    default:
      return drawJunk(g, kind);
  }
}

/** A little lighter or darker shade of a color, always the same for the same `index`. */
function tone(color: number, index: number): number {
  const { tones } = BLOCK_LOOK;
  return shade(color, tones[index % tones.length] ?? 0);
}

/** A bright top edge and a dark bottom edge make a flat shape look like a solid thing. */
function bevel(g: Graphics, x: number, y: number, width: number, height: number, def: BlockDef) {
  g.fillStyle(def.colors.light, 0.75);
  g.fillRect(x, y, width, 2);
  g.fillStyle(def.colors.dark, 0.55);
  g.fillRect(x, y + height - 2, width, 2);
}

/** A wooden crate: upright boards, a frame around them, a slanted brace and nails. */
function drawCrate(g: Graphics, def: BlockDef): Graphics {
  const { halfWidth, height, colors } = def;
  const { boards, frame, brace, nail } = BLOCK_LOOK.crate;
  const width = halfWidth * 2;
  const left = -halfWidth;
  const top = -height;

  g.fillStyle(colors.dark);
  g.fillRect(left, top, width, height);

  // The boards in the middle, each its own shade, with a streak of grain
  const boardWidth = (width - 4) / boards;
  for (let i = 0; i < boards; i++) {
    const x = left + 2 + i * boardWidth;
    g.fillStyle(tone(colors.fill, i * 3 + 1));
    g.fillRect(x + 0.5, top + 2, boardWidth - 1, height - 4);
    g.lineStyle(1, colors.dark, 0.35);
    g.lineBetween(x + boardWidth * 0.4, top + 12 + i * 5, x + boardWidth * 0.4, -16 - i * 3);
  }

  // The slanted brace across them
  g.lineStyle(brace + 3, colors.dark);
  g.lineBetween(left + frame, -frame, halfWidth - frame, top + frame);
  g.lineStyle(brace, shade(colors.fill, 0.1));
  g.lineBetween(left + frame, -frame, halfWidth - frame, top + frame);

  // The frame: four boards around the edge
  const frameColor = shade(colors.fill, 0.16);
  const sides: [number, number, number, number][] = [
    [left + 2, top + 2, width - 4, frame],
    [left + 2, -frame - 2, width - 4, frame],
    [left + 2, top + 2, frame, height - 4],
    [halfWidth - frame - 2, top + 2, frame, height - 4],
  ];
  for (const [x, y, w, h] of sides) {
    g.fillStyle(frameColor);
    g.fillRect(x, y, w, h);
  }
  g.lineStyle(1.5, colors.dark, 0.8);
  g.strokeRect(left + frame + 2, top + frame + 2, width - frame * 2 - 4, height - frame * 2 - 4);
  bevel(g, left + 2, top + 2, width - 4, height - 4, def);

  // A nail in every corner
  g.fillStyle(colors.detail);
  const inset = 2 + frame / 2;
  for (const x of [left + inset, halfWidth - inset]) {
    for (const y of [top + inset, -inset]) {
      g.fillCircle(x, y, nail);
    }
  }
  return g;
}

/** A brick wall: rows of bricks with mortar between them, every other row shifted. */
function drawWall(g: Graphics, def: BlockDef): Graphics {
  const { halfWidth, height, colors } = def;
  const { brickHeight, brickWidth, mortar } = BLOCK_LOOK.wall;
  const left = -halfWidth;
  const top = -height;

  g.fillStyle(colors.detail);
  g.fillRect(left, top, halfWidth * 2, height);

  for (let row = 0; top + row * brickHeight < 0; row++) {
    const y = top + row * brickHeight;
    const rowHeight = Math.min(brickHeight, -y);
    const shift = row % 2 === 0 ? 0 : -brickWidth / 2;
    for (let i = 0, x = left + shift; x < halfWidth; i++, x += brickWidth) {
      // Bricks at the ends of a shifted row are cut off at the edge of the wall
      const from = Math.max(x, left) + mortar / 2;
      const to = Math.min(x + brickWidth, halfWidth) - mortar / 2;
      const brickTop = y + mortar / 2;
      const tall = rowHeight - mortar;
      if (to - from < 1 || tall < 1) continue;
      g.fillStyle(tone(colors.fill, row * 3 + i * 5));
      g.fillRect(from, brickTop, to - from, tall);
      g.fillStyle(colors.light, 0.45);
      g.fillRect(from, brickTop, to - from, 2);
      g.fillStyle(colors.dark, 0.45);
      g.fillRect(from, brickTop + tall - 2, to - from, 2);
    }
  }

  g.lineStyle(1.5, colors.dark);
  g.strokeRect(left, top, halfWidth * 2, height);
  return g;
}

/** A wooden plank: wood grain, a knot, and two nails at each end. */
function drawPlank(g: Graphics, def: BlockDef): Graphics {
  const { halfWidth, height, colors } = def;
  const width = halfWidth * 2;
  const left = -halfWidth;
  const top = -height;

  g.fillStyle(colors.dark);
  g.fillRect(left, top, width, height);
  g.fillStyle(colors.fill);
  g.fillRect(left + 1.5, top + 1.5, width - 3, height - 3);

  // Wood grain: a few long streaks, and a knot
  g.lineStyle(1, colors.dark, 0.35);
  g.lineBetween(left + 16, top + 6, left + 74, top + 6);
  g.lineBetween(left + 40, top + 10, halfWidth - 22, top + 10);
  g.lineBetween(left + 20, top + 13.5, left + 60, top + 13.5);
  g.fillStyle(colors.dark, 0.45);
  g.fillEllipse(halfWidth - 44, top + 7, 9, 4);
  bevel(g, left + 1.5, top + 1.5, width - 3, height - 3, def);

  g.fillStyle(colors.detail);
  for (const x of [left + 6, halfWidth - 6]) {
    g.fillCircle(x, top + 5.5, BLOCK_LOOK.plank.nail);
    g.fillCircle(x, top + 12.5, BLOCK_LOOK.plank.nail);
  }
  return g;
}

/** A block of stone: rough and gray, with a few cracks. */
function drawStone(g: Graphics, def: BlockDef): Graphics {
  const { halfWidth, height, colors } = def;
  const width = halfWidth * 2;
  const left = -halfWidth;
  const top = -height;

  g.fillStyle(colors.dark);
  g.fillRoundedRect(left, top, width, height, 4);
  g.fillStyle(colors.fill);
  g.fillRoundedRect(left + 2, top + 2, width - 4, height - 4, 3);
  // Lighter and darker patches make it look rough
  g.fillStyle(colors.light, 0.5);
  g.fillRoundedRect(left + 5, top + 4, width * 0.45, height * 0.3, 3);
  g.fillStyle(colors.detail, 0.45);
  g.fillRoundedRect(left + width * 0.5, top + height * 0.55, width * 0.4, height * 0.3, 3);
  g.lineStyle(1.3, colors.dark, 0.8);
  g.lineBetween(left + 12, top + 3, left + 18, top + 12);
  g.lineBetween(left + 18, top + 12, left + 14, top + 19);
  g.lineBetween(halfWidth - 10, -3, halfWidth - 17, -11);
  bevel(g, left + 3, top + 2, width - 6, height - 4, def);
  return g;
}

/** A steel beam seen from the side: two thick edges, a thinner middle, and rivets. */
function drawGirder(g: Graphics, def: BlockDef): Graphics {
  const { halfWidth, height, colors } = def;
  const { flange, rivetEvery, rivet } = BLOCK_LOOK.girder;
  const width = halfWidth * 2;
  const left = -halfWidth;
  const top = -height;

  g.fillStyle(colors.dark);
  g.fillRect(left, top, width, height);
  g.fillStyle(shade(colors.fill, -0.18));
  g.fillRect(left + 1.5, top + flange, width - 3, height - flange * 2);
  g.fillStyle(colors.fill);
  g.fillRect(left + 1.5, top + 1, width - 3, flange);
  g.fillRect(left + 1.5, -flange - 1, width - 3, flange);
  g.fillStyle(colors.light, 0.8);
  g.fillRect(left + 1.5, top + 1, width - 3, 1.2);
  g.fillStyle(colors.detail);
  for (let x = left + rivetEvery / 2; x < halfWidth; x += rivetEvery) {
    g.fillCircle(x, top + height / 2, rivet);
  }
  return g;
}

/** A red barrel with two bands and a yellow warning sign: it explodes. */
function drawBarrel(g: Graphics, def: BlockDef): Graphics {
  const { halfWidth, height, colors } = def;
  const { round, band, sign } = BLOCK_LOOK.barrel;
  const width = halfWidth * 2;
  const left = -halfWidth;
  const top = -height;

  g.fillStyle(colors.dark);
  g.fillRoundedRect(left, top, width, height, round);
  g.fillStyle(colors.fill);
  g.fillRoundedRect(left + 2, top + 2, width - 4, height - 4, round - 2);
  // A bright stripe down the side makes it look round
  g.fillStyle(colors.light, 0.55);
  g.fillRoundedRect(left + 6, top + 4, 6, height - 8, 3);
  g.fillStyle(colors.dark, 0.85);
  g.fillRect(left + 1, top + height * 0.22, width - 2, band);
  g.fillRect(left + 1, top + height * 0.78 - band, width - 2, band);

  // The sign: a yellow circle with an exclamation mark
  const signY = top + height / 2;
  g.fillStyle(colors.dark);
  g.fillCircle(0, signY, sign + 1.5);
  g.fillStyle(colors.detail);
  g.fillCircle(0, signY, sign);
  g.fillStyle(colors.dark);
  g.fillRoundedRect(-1.4, signY - 5.5, 2.8, 7, 1);
  g.fillCircle(0, signY + 4.2, 1.5);
  return g;
}
