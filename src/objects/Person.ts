import type Phaser from 'phaser';
import {
  ANGRY,
  DEPTH,
  FLOP,
  KNOCK,
  PERSON,
  PERSON_ACTIONS,
  PHYSICS,
  PUNCH_DAMAGE,
  WALK,
  type ActionId,
  type GunDef,
  type PersonLook,
} from '../config';
import { clamp } from '../logic/bounds';
import { chaseStep, nearestIndex } from '../logic/chase';
import { blockedX, type Box } from '../logic/ground';
import { isDead, takeHit } from '../logic/health';
import { knockDone, knockTilt, settleWobble } from '../logic/knock';
import type { Spot } from '../logic/pick';
import type { PlaceArea } from '../logic/place';
import { blendPose, limpPose, poseFor, shakePose, type Pose, type PoseKind } from '../logic/pose';
import { canSee } from '../logic/shot';
import { walkStep, type Facing } from '../logic/walk';
import { Body } from './Body';
import type { Item } from './Item';
import { PersonFigure } from './personShape';
import type { World } from './World';

/** What a doll keeps doing until it is switched off. */
export type Activity = 'idle' | 'walk' | 'dance' | 'angry';

/**
 * A doll in the area. It drops from where you put it, can be dragged, can walk,
 * dance or get angry, can hold an item, and is out when its lives run out.
 */
export class Person extends Body {
  readonly size = PERSON;
  readonly actions = PERSON_ACTIONS;
  activity: Activity = 'idle';
  private readonly figure: PersonFigure;
  private facing: Facing = 1;
  /** Time since being knocked over, or `null` when not knocked. */
  private knockMs: number | null = null;
  /** Slide away while tipping over (after a hit, but not after being dropped). */
  private slide = false;
  private knockDir: Facing = 1;
  private knockSpeed: number = KNOCK.pushSpeed;
  /** Time since hitting the floor after being knocked over (for the wobble). */
  private downMs = 0;
  private punchMs = 0;
  /** Time left before the next punch or shot. */
  private waitMs = 0;
  private inReach = false;
  /** Keeps counting, so the moves keep going. */
  private clockMs = 0;
  private lives: number = PERSON.lives;
  /** No lives left. */
  private out = false;
  /** The loose pose the doll flops into when it is knocked over. A new one every time. */
  private flop: Pose = limpPose();
  /** How far it tips over when it lies down: a bit different every time. */
  private lieAngle = Math.PI / 2;
  private item: Item | null = null;

  constructor(scene: Phaser.Scene, look: PersonLook, x: number, feetY: number) {
    super(x, feetY);
    this.figure = new PersonFigure(scene, look);
    this.figure.container.setDepth(DEPTH.person);
    this.draw('held', 0);
  }

  /** No lives left: lies limp and does nothing any more. */
  get dead(): boolean {
    return this.out;
  }

  /** Standing on the ground, so it can be punched or shot. */
  get canBeHit(): boolean {
    return !this.dead && this.state === 'resting' && this.knockMs === null;
  }

  /** Roughly where the front hand is: a held item counts as being here. */
  get handSpot(): Spot {
    return { x: this.x + this.facing * PERSON.hand.x, y: this.y - PERSON.hand.y };
  }

  /** The item in the hand, or `null` when empty-handed. */
  get holding(): Item | null {
    return this.item;
  }

  isOn(action: ActionId): boolean {
    return this.activity === action;
  }

  /** Switch walking, dancing or angry mode on, or off if it's already on. */
  toggle(activity: Exclude<Activity, 'idle'>): void {
    if (this.dead) return;
    this.activity = this.activity === activity ? 'idle' : activity;
    this.figure.setAngry(this.activity === 'angry');
    this.punchMs = 0;
  }

  turn(): void {
    this.facing = this.facing === 1 ? -1 : 1;
  }

  /** Take an item into the hand. Whatever was there before is dropped. */
  hold(item: Item, solids: readonly Box[]): void {
    this.dropItem(solids);
    this.item = item;
    item.takenBy(this);
    this.figure.holdInHand(item.display, item.def.hand.rotation, item.def.hand.along);
  }

  /** Let go of the item in the hand, if there is one. */
  dropItem(solids: readonly Box[]): void {
    const item = this.item;
    if (!item) return;
    this.item = null;
    this.figure.letGoOf(item.display);
    const hand = this.handSpot;
    item.droppedAt(hand.x, hand.y, solids);
  }

  override grab(px: number, py: number): void {
    super.grab(px, py);
    this.knockMs = null;
    this.downMs = -KNOCK.fallMs;
    this.slide = false;
  }

  override throwAway(area: PlaceArea): void {
    super.throwAway(area);
    this.knockMs = null;
  }

  /**
   * Hit: lose lives, slide away from the hit and fall over. With no lives left the
   * doll stays down. Says whether this hit was the last one.
   */
  hit(
    direction: Facing,
    solids: readonly Box[],
    damage: number = PUNCH_DAMAGE,
    pushSpeed: number = KNOCK.pushSpeed,
  ): boolean {
    this.knockMs = 0;
    this.downMs = -KNOCK.fallMs;
    this.slide = true;
    this.knockDir = direction;
    this.knockSpeed = pushSpeed;
    this.punchMs = 0;
    this.flop = limpPose();
    this.lieAngle = Math.PI / 2 + randomBetween(-FLOP.lieSpread, FLOP.lieSpread);
    if (this.dead) return false;
    this.lives = takeHit(this.lives, damage);
    if (!isDead(this.lives)) return false;
    this.out = true;
    this.activity = 'idle';
    this.figure.setAngry(false);
    this.figure.setDead(true);
    this.dropItem(solids);
    return true;
  }

  update(deltaMs: number, world: World): void {
    this.clockMs += deltaMs;
    const state = this.physics(deltaMs, world);
    if (state === 'flying') {
      this.draw('held', this.spin);
    } else if (state !== 'resting') {
      this.draw('held', 0);
    } else if (this.knockMs !== null || this.dead) {
      this.updateKnocked(deltaMs, world);
    } else {
      this.draw(this.act(deltaMs, world), 0);
    }
  }

  bringToTop(): void {
    const { container } = this.figure;
    container.scene.children.bringToTop(container);
  }

  destroy(): void {
    this.figure.destroy();
  }

  private updateKnocked(deltaMs: number, world: World): void {
    const elapsed = (this.knockMs ?? 0) + deltaMs;
    if (this.slide && elapsed < KNOCK.fallMs) {
      const pushed = this.x + this.knockDir * this.knockSpeed * (deltaMs / 1000);
      this.walkTo(pushed, world);
    }
    // A doll with no lives left tips over like the others, but never gets back up
    const stayDown = this.dead && elapsed >= KNOCK.fallMs;
    this.knockMs = stayDown ? KNOCK.fallMs : knockDone(elapsed, KNOCK) ? null : elapsed;
    this.downMs = stayDown ? this.downMs + deltaMs : elapsed - KNOCK.fallMs;
    // Tip over slowly at first and then faster, like something heavy falling
    const tilt = (stayDown ? 1 : knockTilt(elapsed, KNOCK)) ** 2;
    const wobble = settleWobble(this.downMs, FLOP.wobble);
    const rotation = this.knockDir * (tilt * this.lieAngle + wobble * FLOP.bodyWobble);
    this.draw('stand', rotation, tilt * PERSON.lyingLift, tilt, wobble);
  }

  /** Do the thing that's switched on, and say which pose it needs. */
  private act(deltaMs: number, world: World): PoseKind {
    if (this.activity === 'walk') {
      const edge = PERSON.halfWidth;
      const walker = walkStep(
        { x: this.x, facing: this.facing },
        WALK.speed,
        deltaMs,
        world.area.left + edge,
        world.area.right - edge,
      );
      const blocked = this.walkTo(walker.x, world);
      // Turn around at a wall, just like at the edge of the area
      this.facing = blocked ? (this.facing === 1 ? -1 : 1) : walker.facing;
      return 'walk';
    }
    if (this.activity === 'dance') return 'dance';
    if (this.activity === 'angry') return this.rage(deltaMs, world);
    return 'stand';
  }

  /**
   * Angry mode: go for the closest doll that is standing. Punch it, hit it with the
   * sword or bat in the hand, or shoot it with the pistol from far away.
   */
  private rage(deltaMs: number, world: World): PoseKind {
    this.waitMs = Math.max(0, this.waitMs - deltaMs);
    if (this.punchMs > 0) {
      this.punchMs -= deltaMs;
      return 'punch';
    }

    const target = this.pickTarget(world);
    if (!target) {
      this.inReach = false;
      return 'stand';
    }

    const solids = world.solidBoxes(this);
    const weapon = this.item?.def;
    const gun = weapon?.gun;
    const canShoot = gun !== undefined && this.clearShot(target, gun, solids);
    const reach = canShoot ? gun.range : (weapon?.melee?.reach ?? ANGRY.reach);
    const chase = chaseStep(this.x, this.facing, target.x, reach, ANGRY.speed, deltaMs);
    const blocked = this.walkTo(chase.x, world);
    this.facing = chase.facing;

    const close = Math.abs(target.x - this.x) <= reach + 1;
    const sameLevel = Math.abs(target.y - this.y) <= ANGRY.levelSlack;
    if (!close || !(canShoot || sameLevel)) {
      this.inReach = false;
      return close || blocked ? 'stand' : 'run';
    }

    if (!this.inReach) {
      // Just got close: wind up for a short, random moment first
      this.inReach = true;
      this.waitMs = Math.max(this.waitMs, randomBetween(ANGRY.windupMs.min, ANGRY.windupMs.max));
    }
    if (this.waitMs > 0) return canShoot ? 'punch' : 'stand';

    this.punchMs = ANGRY.punchMs;
    if (canShoot) {
      const { muzzle } = gun;
      world.shoot(this, this.x + this.facing * muzzle.x, this.y - muzzle.y, this.facing, gun);
      this.waitMs = gun.everyMs;
      return 'punch';
    }

    const deadly = target.hit(
      this.facing,
      world.solidBoxes(target),
      weapon?.melee?.damage,
      weapon?.melee?.pushSpeed,
    );
    world.hitEffect(target.x, target.y - PERSON.height * 0.75, deadly);
    this.waitMs = ANGRY.restMs;
    this.inReach = false;
    return 'punch';
  }

  /** The closest standing doll, first of all one on the same level. */
  private pickTarget(world: World): Person | undefined {
    const standing = world.people.filter((other) => other !== this && other.canBeHit);
    const level = standing.filter((other) => Math.abs(other.y - this.y) <= ANGRY.levelSlack);
    const targets = level.length > 0 ? level : standing;
    const nearest = nearestIndex(
      this.x,
      targets.map((other) => other.x),
    );
    return nearest === null ? undefined : targets[nearest];
  }

  /** Would a bullet from the gun fly straight into the target, with nothing in the way? */
  private clearShot(target: Person, gun: GunDef, solids: readonly Box[]): boolean {
    const bulletY = this.y - gun.muzzle.y;
    const box = target.box;
    if (bulletY < box.top || bulletY > box.bottom) return false;
    if (Math.abs(target.x - this.x) > gun.range) return false;
    return canSee(this.x, target.x, bulletY, solids);
  }

  /**
   * Move toward `x`, but not out of the area and not through anything solid.
   * Says whether something solid was in the way.
   */
  private walkTo(x: number, world: World): boolean {
    const { halfWidth, height } = PERSON;
    const wanted = clamp(x, world.area.left + halfWidth, world.area.right - halfWidth);
    const solids = world.solidBoxes(this);
    this.x = blockedX(this.x, wanted, halfWidth, this.y, height, solids, PHYSICS.stepUp);
    return this.x !== wanted;
  }

  /**
   * Draw the doll in a pose. `limp` is how much of the loose flop pose is mixed in
   * (a doll with no lives left is always fully limp), `wobble` shakes the limbs.
   */
  private draw(kind: PoseKind, rotation: number, extraLift = 0, limp = 0, wobble = 0): void {
    const loose = this.dead ? 1 : limp;
    const moving = poseFor(kind, this.clockMs);
    const pose = loose > 0 ? shakePose(blendPose(moving, this.flop, loose), wobble) : moving;
    this.figure.setPose(pose);
    const { container } = this.figure;
    container.setPosition(this.x, this.y - pose.lift - extraLift);
    container.setScale(this.facing, 1);
    container.rotation = rotation + this.facing * pose.lean;
  }
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
