import type Phaser from 'phaser';
import {
  BLAST,
  BOMB_ACTIONS,
  DEPTH,
  GUN_ACTIONS,
  ITEM_COLORS,
  ITEMS,
  PICKUP_WAIT_MS,
  THING_ACTIONS,
  type ActionId,
  type ItemDef,
  type ItemKind,
} from '../config';
import type { Box } from '../logic/ground';
import type { Facing } from '../logic/walk';
import { Body } from './Body';
import { drawItem, FUSE_TIP } from './itemShapes';
import type { Person } from './Person';
import type { World } from './World';

/**
 * An item: a gun, something to hit with, or a bomb. It lies around until a doll
 * takes it. A gun can also be set to fire nonstop on its own.
 */
export class Item extends Body {
  readonly size: ItemDef;
  readonly actions: readonly ActionId[];
  readonly display: Phaser.GameObjects.Container;
  private readonly spark: Phaser.GameObjects.Graphics | null = null;
  private holder: Person | null = null;
  /** Which way it points when it lies around. */
  private facing: Facing = 1;
  /** A gun set to fire nonstop, and the time left until its next shot. */
  private firing = false;
  private fireWaitMs = 0;
  /** Time left until a lit bomb goes off, or `null` when it isn't lit. */
  private fuseMs: number | null = null;
  private exploded = false;
  /** Time left before a doll may grab it again after one has let go of it. */
  private noPickupMs = 0;
  /** The doll that let go of it. That doll doesn't take it back while it still lies by its feet. */
  private dropper: Person | null = null;
  private clockMs = 0;

  constructor(scene: Phaser.Scene, kind: ItemKind, x: number, y: number) {
    super(x, y);
    this.size = ITEMS[kind];
    this.actions = this.size.bomb ? BOMB_ACTIONS : this.size.gun ? GUN_ACTIONS : THING_ACTIONS;
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

  /** Lying or falling free, so a doll that touches it can take it. */
  get canBeTaken(): boolean {
    return this.canBePicked && !this.held && !this.exploded && this.noPickupMs <= 0;
  }

  /** The doll that let go of it and hasn't moved away from it since, if any. */
  get droppedBy(): Person | null {
    return this.dropper;
  }

  /** It was moved, or the doll that let go of it walked away: anyone may take it again. */
  forgetDropper(): void {
    this.dropper = null;
  }

  override grab(px: number, py: number): void {
    super.grab(px, py);
    this.dropper = null;
  }

  isOn(action: ActionId): boolean {
    if (action === 'fuse') return this.fuseMs !== null;
    if (action === 'fire') return this.firing;
    return false;
  }

  /** Light the fuse of a bomb, or put it out again. */
  toggleFuse(): void {
    if (!this.size.bomb) return;
    this.fuseMs = this.fuseMs === null ? this.size.bomb.fuseMs : null;
    this.spark?.setVisible(this.fuseMs !== null);
  }

  /** Caught in another blast: a bomb goes off at most `ms` from now. */
  setOff(ms: number): void {
    if (!this.size.bomb || this.exploded) return;
    this.fuseMs = Math.min(this.fuseMs ?? ms, ms);
  }

  /** Make a gun fire nonstop by itself, or stop it again. */
  toggleFire(): void {
    if (!this.size.gun) return;
    this.firing = !this.firing;
    this.fireWaitMs = 0;
  }

  /** Point the other way. */
  turn(): void {
    this.facing = this.facing === 1 ? -1 : 1;
  }

  /** A doll takes it. From now on it moves with the doll's hand. */
  takenBy(person: Person): void {
    this.holder = person;
    this.held = false;
    this.firing = false;
    this.display.setScale(1);
  }

  /** The doll lets go: back into the area, and it drops from here. */
  droppedAt(x: number, y: number, solids: readonly Box[]): void {
    this.dropper = this.holder;
    this.holder = null;
    this.x = x;
    this.y = y;
    this.noPickupMs = PICKUP_WAIT_MS;
    this.release(solids);
    this.lieAt(0);
  }

  update(deltaMs: number, world: World): void {
    this.clockMs += deltaMs;
    this.noPickupMs = Math.max(0, this.noPickupMs - deltaMs);
    if (this.holder) {
      const hand = this.holder.handSpot;
      this.x = hand.x;
      this.y = hand.y;
    } else {
      const state = this.physics(deltaMs, world);
      this.lieAt(state === 'flying' ? this.spin : 0);
      if (state !== 'flying') this.fire(deltaMs, world);
    }

    if (this.fuseMs === null) return;
    this.fuseMs -= deltaMs;
    this.spark?.setVisible(Math.floor(this.clockMs / BLAST.blinkMs) % 2 === 0);
    if (this.fuseMs <= 0 && this.size.bomb) {
      this.exploded = true;
      world.explode(this, this.size.bomb);
    }
  }

  bringToTop(): void {
    if (this.holder) return;
    this.display.scene.children.bringToTop(this.display);
  }

  destroy(): void {
    this.display.destroy();
  }

  /** A gun set to fire nonstop shoots the way it points, wherever it is. */
  private fire(deltaMs: number, world: World): void {
    const gun = this.size.gun;
    if (!gun || !this.firing) return;
    this.fireWaitMs -= deltaMs;
    if (this.fireWaitMs > 0) return;
    this.fireWaitMs = gun.autoMs;
    const muzzleX = this.x + this.facing * (this.size.halfWidth + 2);
    world.shoot(null, muzzleX, this.y - gun.barrelUp, this.facing, gun);
  }

  private lieAt(rotation: number): void {
    this.display.setPosition(this.x + this.facing * this.size.lie.x, this.y + this.size.lie.y);
    this.display.setScale(this.facing, 1);
    this.display.rotation = rotation;
  }
}
