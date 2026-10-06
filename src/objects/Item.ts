import type Phaser from 'phaser';
import {
  BLAST,
  BOMB_ACTIONS,
  DEPTH,
  ITEM_COLORS,
  ITEMS,
  THING_ACTIONS,
  type ActionId,
  type ItemDef,
  type ItemKind,
} from '../config';
import type { Box } from '../logic/ground';
import { Body } from './Body';
import type { Person } from './Person';
import type { World } from './World';

/** Where the lit end of a bomb's fuse is, from the middle of the bomb. */
const FUSE_TIP = { x: 7, y: -21 };

/**
 * An item: a pistol, a sword, a bat or a bomb. It lies around until it is dragged
 * onto a doll, who then holds it.
 */
export class Item extends Body {
  readonly size: ItemDef;
  readonly actions: readonly ActionId[];
  readonly display: Phaser.GameObjects.Container;
  private readonly spark: Phaser.GameObjects.Graphics | null = null;
  private holder: Person | null = null;
  /** Time left until a lit bomb goes off, or `null` when it isn't lit. */
  private fuseMs: number | null = null;
  private exploded = false;
  private clockMs = 0;

  constructor(scene: Phaser.Scene, kind: ItemKind, x: number, y: number) {
    super(x, y);
    this.size = ITEMS[kind];
    this.actions = this.size.bomb ? BOMB_ACTIONS : THING_ACTIONS;
    const parts: Phaser.GameObjects.Graphics[] = [drawItem(scene.make.graphics({}, false), kind)];
    if (this.size.bomb) {
      this.spark = scene.make.graphics({}, false);
      this.spark.fillStyle(ITEM_COLORS.bomb.spark);
      this.spark.fillCircle(FUSE_TIP.x, FUSE_TIP.y, 5);
      this.spark.fillStyle(0xffffff);
      this.spark.fillCircle(FUSE_TIP.x, FUSE_TIP.y, 2);
      this.spark.setVisible(false);
      parts.push(this.spark);
    }
    this.display = scene.add.container(0, 0, parts).setDepth(DEPTH.item);
    this.lieAt(0);
  }

  /** Everything that makes this item what it is: gun, melee or bomb numbers. */
  get def(): ItemDef {
    return this.size;
  }

  override get canBePicked(): boolean {
    return super.canBePicked && this.holder === null;
  }

  override get gone(): boolean {
    return super.gone || this.exploded || (this.holder?.gone ?? false);
  }

  /** In a doll's hand right now? */
  get isHeld(): boolean {
    return this.holder !== null;
  }

  isOn(action: ActionId): boolean {
    return action === 'fuse' && this.fuseMs !== null;
  }

  /** Light the fuse of a bomb, or put it out again. */
  toggleFuse(): void {
    if (!this.size.bomb) return;
    this.fuseMs = this.fuseMs === null ? this.size.bomb.fuseMs : null;
    this.spark?.setVisible(this.fuseMs !== null);
  }

  /** A doll takes it. From now on it moves with the doll's hand. */
  takenBy(person: Person): void {
    this.holder = person;
    this.held = false;
  }

  /** The doll lets go: back into the area, and it drops from here. */
  droppedAt(x: number, y: number, solids: readonly Box[]): void {
    this.holder = null;
    this.x = x;
    this.y = y;
    this.display.setScale(1);
    this.release(solids);
    this.lieAt(0);
  }

  update(deltaMs: number, world: World): void {
    this.clockMs += deltaMs;
    if (this.holder) {
      const hand = this.holder.handSpot;
      this.x = hand.x;
      this.y = hand.y;
    } else {
      const state = this.physics(deltaMs, world);
      this.lieAt(state === 'flying' ? this.spin : 0);
    }

    if (this.fuseMs === null) return;
    this.fuseMs -= deltaMs;
    this.spark?.setVisible(Math.floor(this.clockMs / BLAST.blinkMs) % 2 === 0);
    if (this.fuseMs <= 0) {
      this.exploded = true;
      world.explode(this);
    }
  }

  bringToTop(): void {
    if (this.holder) return;
    this.display.scene.children.bringToTop(this.display);
  }

  destroy(): void {
    this.display.destroy();
  }

  private lieAt(rotation: number): void {
    this.display.setPosition(this.x + this.size.lie.x, this.y + this.size.lie.y);
    this.display.rotation = rotation;
  }
}

/** Draws an item with code. The grip (where a hand holds it) is at (0, 0), pointing right. */
export function drawItem(
  g: Phaser.GameObjects.Graphics,
  kind: ItemKind,
): Phaser.GameObjects.Graphics {
  switch (kind) {
    case 'pistol': {
      const c = ITEM_COLORS.pistol;
      g.fillStyle(c.dark);
      g.fillRoundedRect(-3, -1, 8, 13, 2);
      g.fillStyle(c.body);
      g.fillRoundedRect(-3, -5, 24, 8, 2);
      g.fillStyle(c.shine);
      g.fillRect(0, -4, 18, 1.5);
      g.lineStyle(1.5, c.dark);
      g.strokeRect(5, 3, 6, 4);
      break;
    }
    case 'sword': {
      const c = ITEM_COLORS.sword;
      g.fillStyle(c.handle);
      g.fillRoundedRect(-9, -2.5, 10, 5, 2);
      g.fillStyle(c.edge);
      g.fillTriangle(44, -4, 53, 0, 44, 4);
      g.fillRect(3, -4, 41, 8);
      g.fillStyle(c.blade);
      g.fillRect(3, -3, 41, 4);
      g.fillStyle(c.guard);
      g.fillRoundedRect(0, -7, 4, 14, 2);
      break;
    }
    case 'bat': {
      const c = ITEM_COLORS.bat;
      g.fillStyle(c.dark);
      g.fillRoundedRect(8, -5, 43, 10, 5);
      g.fillStyle(c.wood);
      g.fillRoundedRect(9, -4, 41, 6, 3);
      g.fillStyle(c.grip);
      g.fillRoundedRect(-11, -2.5, 22, 5, 2);
      g.fillCircle(-11, 0, 3.5);
      break;
    }
    case 'bomb': {
      const c = ITEM_COLORS.bomb;
      g.lineStyle(2.5, c.fuse);
      g.lineBetween(0, -14, FUSE_TIP.x, FUSE_TIP.y);
      g.fillStyle(c.cap);
      g.fillRect(-4, -16, 8, 5);
      g.fillStyle(c.body);
      g.fillCircle(0, 0, 12);
      g.fillStyle(c.shine, 0.8);
      g.fillCircle(-4, -5, 3.5);
      break;
    }
  }
  return g;
}
