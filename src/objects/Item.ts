import type Phaser from 'phaser';
import {
  BLAST,
  BOMB_ACTIONS,
  DEPTH,
  GUN_ACTIONS,
  ITEM_COLORS,
  ITEM_TOSS,
  ITEMS,
  PICKUP_WAIT_MS,
  THING_ACTIONS,
  TOPPLE,
  TOSS,
  type ActionId,
  type ItemDef,
  type ItemKind,
} from '../config';
import { clamp } from '../logic/bounds';
import { blockedX, overlaps, type Box } from '../logic/ground';
import type { PlaceArea } from '../logic/place';
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
  readonly crumbs: readonly number[];
  readonly display: Phaser.GameObjects.Container;
  private readonly spark: Phaser.GameObjects.Graphics | null = null;
  private holder: Person | null = null;
  /** The doll it is stuck in, after being thrown or swung into it. */
  private stuckIn: Person | null = null;
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
  /** Sideways speed from being thrown, until it slides to a stop. */
  private vx = 0;
  /** Thrown, and still on its way: it hurts the doll it hits. */
  private tossed = false;
  /** Thrown, and not come to rest yet: only then can it break on what it hits. */
  private thrown = false;
  /** Smashed to pieces. */
  private broken = false;
  /** The doll that let go of it. That doll doesn't take it back while it still lies by its feet. */
  private dropper: Person | null = null;
  private clockMs = 0;

  constructor(scene: Phaser.Scene, kind: ItemKind, x: number, y: number) {
    super(x, y);
    this.size = ITEMS[kind];
    this.crumbs = this.size.crumbs;
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
    const owner = this.holder ?? this.stuckIn;
    return super.gone || this.exploded || this.broken || (owner?.gone ?? false);
  }

  /** In a doll's hand, or stuck in a doll, right now? */
  get isHeld(): boolean {
    return this.holder !== null || this.stuckIn !== null;
  }

  /** Lying or falling free, so a doll that touches it can take it. */
  get canBeTaken(): boolean {
    return (
      this.canBePicked &&
      this.stuckIn === null &&
      !this.held &&
      !this.tossed &&
      !this.exploded &&
      !this.broken &&
      this.noPickupMs <= 0
    );
  }

  /** Dragged along the floor, does it wipe stains away? */
  get wipes(): boolean {
    return this.size.wipes === true;
  }

  /** The doll that let go of it and hasn't moved away from it since, if any. */
  get droppedBy(): Person | null {
    return this.dropper;
  }

  /** It was moved, or the doll that let go of it walked away: anyone may take it again. */
  forgetDropper(): void {
    this.dropper = null;
  }

  /** Grabbing a weapon that is stuck in a doll pulls it out. */
  override grab(px: number, py: number): void {
    this.unstick();
    super.grab(px, py);
    this.dropper = null;
    this.vx = 0;
    this.tossed = false;
    this.thrown = false;
  }

  /**
   * Let go. While the mouse is moving, the item is thrown the way the mouse was
   * going (speeds in pixels per second); a slow let-go is just a drop.
   */
  throwWith(speedX: number, speedY: number, solids: readonly Box[]): void {
    const speed = Math.hypot(speedX, speedY);
    if (speed < TOSS.minSpeed) {
      this.release(solids);
      return;
    }
    const scale = Math.min(TOSS.power, TOSS.maxSpeed / speed);
    this.release(solids, speedY * scale);
    this.vx = speedX * scale;
    this.tossed = true;
    this.thrown = true;
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

  override throwAway(area: PlaceArea): void {
    this.unstick();
    super.throwAway(area);
  }

  /**
   * Sink into a doll and stay there. `direction` is the way it was moving. From now
   * on it moves with the doll, until it is grabbed and pulled out.
   */
  stickInto(person: Person, direction: Facing): void {
    const stick = this.size.stick;
    if (!stick) return;
    this.stuckIn = person;
    this.held = false;
    this.vx = 0;
    this.tossed = false;
    this.thrown = false;
    person.impale(this, direction, this.y - this.size.height / 2, stick.out);
  }

  private unstick(): void {
    const person = this.stuckIn;
    if (!person) return;
    this.stuckIn = null;
    person.pullOut(this);
    this.lieAt(0);
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
    } else if (this.stuckIn) {
      // Its grip is where the doll's body carries it
      const grip = this.stuckIn.stuckSpot(this);
      this.x = grip.x;
      this.y = grip.y + this.size.height / 2;
    } else {
      const wasFalling = this.state === 'falling';
      this.glide(deltaMs, world);
      const state = this.physics(deltaMs, world);
      if (wasFalling && state === 'resting') this.strike(this.lastImpact, world);
      if (state === 'resting' && this.vx === 0) this.thrown = false;
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

  /**
   * Fly or slide sideways after a throw. It bounces off walls, and a thrown thing
   * to hit with hurts the first standing doll it flies into.
   */
  private glide(deltaMs: number, world: World): void {
    if (this.vx === 0 || this.state === 'held' || this.state === 'flying') return;
    const { halfWidth, height } = this.size;
    const wanted = this.x + this.vx * (deltaMs / 1000);
    const inside = clamp(wanted, world.area.left + halfWidth, world.area.right - halfWidth);
    this.x = blockedX(this.x, inside, halfWidth, this.y, height, world.solidBoxes(this), 0);
    if (this.x !== wanted) this.bounceBack(world);
    if (this.state === 'resting') this.vx *= Math.exp(-deltaMs / ITEM_TOSS.slideMs);
    if (Math.abs(this.vx) < ITEM_TOSS.stopSpeed) {
      this.vx = 0;
      this.tossed = false;
    }

    const melee = this.size.melee;
    if (!this.tossed || !melee || Math.abs(this.vx) < ITEM_TOSS.hitSpeed) return;
    const victim = world.people.find((person) => person.canBeHit && overlaps(this.box, person.box));
    if (!victim) return;
    const direction = this.vx < 0 ? -1 : 1;
    const solids = world.solidBoxes(victim);
    const deadly = victim.hit(direction, solids, melee.damage, melee.pushSpeed, melee.wound);
    world.hitEffect(victim.feet.x, this.y - height / 2, deadly, 'clang');
    this.tossed = false;
    if (this.size.stick) {
      this.stickInto(victim, direction);
    } else {
      this.bounceBack(world);
    }
  }

  /** Bounce back off whatever it ran into, and maybe break on it. */
  private bounceBack(world: World): void {
    const speed = Math.abs(this.vx);
    // Thrown hard into a tall piece, it knocks the piece over
    if (speed >= TOPPLE.minSpeed) world.shove(this.box, this.vx < 0 ? -1 : 1);
    this.vx *= -ITEM_TOSS.bounce;
    this.strike(speed, world);
  }

  /**
   * It hit something at this speed: a fragile thing that was thrown smashes to pieces,
   * and a thunder hammer thrown down hard enough calls down lightning.
   */
  private strike(speed: number, world: World): void {
    const thunder = this.size.thunder;
    if (thunder && this.thrown && speed >= thunder.minSpeed) world.thunder(this);
    const breaksAt = this.size.breaksAt;
    if (this.broken || !this.thrown || breaksAt === undefined || speed < breaksAt) return;
    this.broken = true;
    world.breakApart(this, this.vx * 0.5, -160);
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
