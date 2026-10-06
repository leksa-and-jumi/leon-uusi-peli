import type Phaser from 'phaser';
import { BLOCKS, DEPTH, THING_ACTIONS, type BlockDef, type BlockKind } from '../config';
import { Body } from './Body';
import type { World } from './World';

/** A building piece: a crate, a wall or a plank. They stack, and dolls can stand on them. */
export class Block extends Body {
  override readonly solid = true;
  readonly size: BlockDef;
  readonly actions = THING_ACTIONS;
  readonly breakable: boolean;
  private readonly display: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, kind: BlockKind, x: number, y: number) {
    super(x, y);
    this.size = BLOCKS[kind];
    this.breakable = this.size.breakable;
    this.display = drawBlock(scene.add.graphics(), kind).setDepth(DEPTH.block);
    this.display.setPosition(x, y);
  }

  isOn(): boolean {
    return false;
  }

  update(deltaMs: number, world: World): void {
    const state = this.physics(deltaMs, world);
    this.display.setPosition(this.x, this.y);
    this.display.rotation = state === 'flying' ? this.spin : 0;
  }

  bringToTop(): void {
    this.display.scene.children.bringToTop(this.display);
  }

  destroy(): void {
    this.display.destroy();
  }
}

/** Draws a building piece with code. The middle of its bottom edge is at (0, 0). */
export function drawBlock(
  g: Phaser.GameObjects.Graphics,
  kind: BlockKind,
): Phaser.GameObjects.Graphics {
  const { halfWidth, height, colors } = BLOCKS[kind];
  const width = halfWidth * 2;
  const left = -halfWidth;
  const top = -height;

  g.fillStyle(colors.dark);
  g.fillRect(left, top, width, height);
  g.fillStyle(colors.fill);
  g.fillRect(left + 2, top + 2, width - 4, height - 4);
  // A bright top edge and a dark bottom edge make it look like a solid box
  g.fillStyle(colors.light);
  g.fillRect(left + 2, top + 2, width - 4, 3);

  g.lineStyle(2, colors.dark);
  if (kind === 'crate') {
    g.strokeRect(left + 7, top + 7, width - 14, height - 14);
    g.lineBetween(left + 7, top + 7, halfWidth - 7, -7);
    g.lineBetween(left + 7, -7, halfWidth - 7, top + 7);
  } else if (kind === 'wall') {
    const brick = 16;
    for (let y = top + brick; y < -2; y += brick) {
      g.lineBetween(left + 2, y, halfWidth - 2, y);
    }
    for (let row = 0, y = top; y < -2; row++, y += brick) {
      const x = row % 2 === 0 ? 0 : -halfWidth / 2;
      g.lineBetween(x, y + 2, x, Math.min(y + brick, -2));
      if (row % 2 === 1) g.lineBetween(-x, y + 2, -x, Math.min(y + brick, -2));
    }
  } else {
    for (let x = left + 35; x < halfWidth - 5; x += 35) {
      g.lineBetween(x, top + 3, x, -3);
    }
  }
  return g;
}
