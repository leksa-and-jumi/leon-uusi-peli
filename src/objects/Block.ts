import type Phaser from 'phaser';
import { BLOCK_LOOK, BLOCKS, DEPTH, THING_ACTIONS, type BlockDef, type BlockKind } from '../config';
import { shade } from '../logic/color';
import { Body } from './Body';
import type { World } from './World';

/**
 * A building piece: a crate, a wall, a plank, a stone, a steel beam or a barrel. They
 * stack, and dolls can stand on them. A barrel explodes when a bullet or a blast hits it.
 */
export class Block extends Body {
  override readonly solid = true;
  readonly size: BlockDef;
  readonly actions = THING_ACTIONS;
  private readonly display: Phaser.GameObjects.Graphics;
  /** Time left until a barrel that has been set off explodes, or `null`. */
  private fuseMs: number | null = null;
  private exploded = false;

  constructor(scene: Phaser.Scene, kind: BlockKind, x: number, y: number) {
    super(x, y);
    this.size = BLOCKS[kind];
    this.display = drawBlock(scene.add.graphics(), kind).setDepth(DEPTH.block);
    this.display.setPosition(x, y);
  }

  override get gone(): boolean {
    return super.gone || this.exploded;
  }

  /** Does it go off with a blast when it is hit? */
  get explosive(): boolean {
    return this.size.blast !== undefined;
  }

  isOn(): boolean {
    return false;
  }

  /** Hit by a bullet or caught in a blast: a barrel explodes at most `ms` from now. */
  setOff(ms: number): void {
    if (!this.explosive || this.exploded) return;
    this.fuseMs = Math.min(this.fuseMs ?? ms, ms);
  }

  update(deltaMs: number, world: World): void {
    const state = this.physics(deltaMs, world);
    this.display.setPosition(this.x, this.y);
    this.display.rotation = state === 'flying' ? this.spin : 0;

    if (this.fuseMs === null || !this.size.blast) return;
    this.fuseMs -= deltaMs;
    if (this.fuseMs <= 0) {
      this.exploded = true;
      world.explode(this, this.size.blast);
    }
  }

  bringToTop(): void {
    this.display.scene.children.bringToTop(this.display);
  }

  destroy(): void {
    this.display.destroy();
  }
}

type Graphics = Phaser.GameObjects.Graphics;

/** Draws a building piece with code. The middle of its bottom edge is at (0, 0). */
export function drawBlock(g: Graphics, kind: BlockKind): Graphics {
  if (kind === 'crate') return drawCrate(g, BLOCKS.crate);
  if (kind === 'wall') return drawWall(g, BLOCKS.wall);
  if (kind === 'plank') return drawPlank(g, BLOCKS.plank);
  if (kind === 'stone') return drawStone(g, BLOCKS.stone);
  if (kind === 'girder') return drawGirder(g, BLOCKS.girder);
  return drawBarrel(g, BLOCKS.barrel);
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
