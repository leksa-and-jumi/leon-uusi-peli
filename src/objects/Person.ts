import type Phaser from 'phaser';
import {
  ANGRY,
  DEPTH,
  FLOP,
  KNOCK,
  LIMP,
  PERSON,
  PERSON_ACTIONS,
  PHYSICS,
  PICK_PADDING,
  PUNCH_DAMAGE,
  TOSS,
  WALK,
  type ActionId,
  type GunDef,
  type PersonLook,
} from '../config';
import { clamp } from '../logic/bounds';
import { chaseStep, nearestIndex } from '../logic/chase';
import {
  dangleStep,
  hangingRest,
  swingPose,
  trail,
  wrapAngle,
  type Joint,
  type JointKey,
  type Swinger,
} from '../logic/dangle';
import { blockedX, overlaps, type Box } from '../logic/ground';
import { isDead, takeHit } from '../logic/health';
import { knockDone, knockTilt, settleWobble } from '../logic/knock';
import type { Spot } from '../logic/pick';
import type { PlaceArea } from '../logic/place';
import {
  blendPose,
  limpPose,
  poseFor,
  shakePose,
  STAND,
  STILL,
  type Pose,
  type PoseKind,
} from '../logic/pose';
import { canSee } from '../logic/shot';
import { walkStep, type Facing } from '../logic/walk';
import { Body, type BodyState } from './Body';
import type { Item } from './Item';
import { PersonFigure } from './personShape';
import type { World } from './World';

/** How loosely each joint of a limp doll swings. */
const LIMP_JOINTS: Record<JointKey, Joint> = {
  frontArm: LIMP.loose,
  backArm: LIMP.loose,
  frontElbow: LIMP.loose,
  backElbow: LIMP.loose,
  head: LIMP.loose,
  frontLeg: LIMP.heavy,
  backLeg: LIMP.heavy,
  frontKnee: LIMP.heavy,
  backKnee: LIMP.heavy,
  waist: LIMP.heavy,
};

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
  /** Sideways speed from being thrown or knocked, until it slides to a stop. */
  private vx = 0;
  /** Thrown, and not landed yet. */
  private tossed = false;
  /** How fast it is really moving sideways right now, smoothed (pixels per second). */
  private speedX = 0;
  private lastX: number;
  /** A limp doll's whole body: how far it has turned over, and how fast it is turning. */
  private tumble: Swinger = { angle: 0, speed: 0 };
  /** A limp doll's joints, and how fast each one is turning. */
  private limbs: Pose = STAND;
  private limbSpeeds: Pose = STILL;
  /** Where on its body it is held, seen from its feet before turning. */
  private grabSpot = { x: 0, y: 0 };
  /** Which way up a limp doll hangs while held: 0 is head up, π is head down. */
  private hangAngle = 0;
  /** Where it was last drawn: its feet, and how far it was turned. */
  private drawn = { x: 0, y: 0, rotation: 0 };
  private item: Item | null = null;

  constructor(scene: Phaser.Scene, look: PersonLook, x: number, feetY: number) {
    super(x, feetY);
    this.lastX = x;
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

  /** A doll lying on the ground is grabbed along its whole body, not just at its feet. */
  override get pickBox(): Box {
    const tipped = Math.sin(this.drawn.rotation);
    if (Math.abs(tipped) < 0.5) return super.pickBox;
    const headX = this.drawn.x + tipped * PERSON.height;
    return {
      left: Math.min(this.drawn.x, headX) - PICK_PADDING,
      right: Math.max(this.drawn.x, headX) + PICK_PADDING,
      top: this.drawn.y - PERSON.halfWidth * 2 - PICK_PADDING,
      bottom: this.drawn.y + PERSON.halfWidth,
    };
  }

  override grab(px: number, py: number): void {
    // Remember where on the body it is held, so a limp doll hangs from that spot
    const { x, y, rotation } = this.drawn;
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    this.grabSpot = {
      x: (px - x) * cos - (py - y) * sin,
      y: (px - x) * sin + (py - y) * cos,
    };
    this.hangAngle = -this.grabSpot.y < PERSON.height * LIMP.upsideDownBelow ? Math.PI : 0;
    this.tumble = { angle: wrapAngle(this.tumble.angle), speed: this.tumble.speed };
    super.grab(px, py);
    this.knockMs = null;
    this.downMs = -KNOCK.fallMs;
    this.slide = false;
    this.vx = 0;
    this.tossed = false;
  }

  /**
   * Let go while moving: the doll is thrown the way the mouse was going (speeds in
   * pixels per second). A slow let-go is just a drop.
   */
  throwWith(speedX: number, speedY: number, solids: readonly Box[]): void {
    const speed = Math.hypot(speedX, speedY);
    if (this.dead) {
      // A limp doll falls from where it was hanging, not from under the hand
      this.x = this.drawn.x;
      this.y = this.drawn.y;
    }
    if (speed < TOSS.minSpeed) {
      this.release(solids);
      return;
    }
    const scale = Math.min(1, TOSS.maxSpeed / speed);
    this.release(solids, speedY * scale);
    this.vx = speedX * scale;
    this.tossed = true;
    this.tumble = { angle: this.tumble.angle, speed: this.tumble.speed + this.vx * TOSS.spin };
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
    this.lieAngle = Math.PI / 2 - randomBetween(0, FLOP.lieSpread);
    if (this.dead) {
      // Already limp: the hit shoves it along and makes it flop into a new pose
      this.knockMs = null;
      this.vx = direction * pushSpeed * LIMP.corpsePush;
      this.tumble = { angle: this.tumble.angle, speed: this.tumble.speed + direction * 2 };
      return false;
    }
    this.lives = takeHit(this.lives, damage);
    if (!isDead(this.lives)) return false;
    this.out = true;
    // From here on it is a ragdoll: it tips over from how it stood, and slides away
    this.knockMs = null;
    this.limbs = this.figure.pose;
    this.limbSpeeds = STILL;
    this.tumble = { angle: 0, speed: direction * LIMP.deathSpin };
    this.vx = direction * pushSpeed;
    this.activity = 'idle';
    this.figure.setAngry(false);
    this.figure.setDead(true);
    this.dropItem(solids);
    return true;
  }

  update(deltaMs: number, world: World): void {
    this.clockMs += deltaMs;
    this.glide(deltaMs, world);
    const state = this.physics(deltaMs, world);
    this.measureSpeed(deltaMs);

    if (state === 'flying') {
      this.draw('held', this.spin);
    } else if (this.dead) {
      this.drawLimp(deltaMs, state, world.area);
    } else if (state !== 'resting') {
      this.draw('held', trail(this.vx, TOSS.lean, TOSS.leanMax));
    } else if (this.tossed) {
      // A thrown doll that lands tumbles over, but isn't hurt
      this.tossed = false;
      this.fallOver(this.vx < 0 ? -1 : 1);
      this.updateKnocked(deltaMs, world);
    } else if (this.knockMs !== null) {
      this.updateKnocked(deltaMs, world);
    } else {
      this.draw(this.act(deltaMs, world), 0);
    }
  }

  /** Fall over like after a hit, and get up again. */
  private fallOver(direction: Facing): void {
    this.knockMs = 0;
    this.downMs = -KNOCK.fallMs;
    this.slide = false;
    this.knockDir = direction;
    this.punchMs = 0;
    this.flop = limpPose();
    this.lieAngle = Math.PI / 2 - randomBetween(0, FLOP.lieSpread);
  }

  /**
   * Fly or slide sideways after a throw or a hard hit. A doll that is thrown fast
   * enough knocks over the standing dolls it runs into, without hurting them.
   */
  private glide(deltaMs: number, world: World): void {
    if (this.vx === 0 || this.state === 'held' || this.state === 'flying') return;
    const wanted = this.x + this.vx * (deltaMs / 1000);
    this.walkTo(wanted, world);
    if (this.x !== wanted) this.vx *= -TOSS.bounce;
    if (this.state === 'resting') this.vx *= Math.exp(-deltaMs / TOSS.slideMs);
    if (Math.abs(this.vx) < TOSS.stopSpeed) {
      this.vx = 0;
      if (this.dead) this.tossed = false;
    }
    if (!this.tossed || Math.abs(this.vx) < TOSS.knockSpeed) return;

    const direction: Facing = this.vx < 0 ? -1 : 1;
    for (const other of world.people) {
      if (other === this || !other.canBeHit || !overlaps(this.box, other.box)) continue;
      other.hit(direction, world.solidBoxes(other), 0, TOSS.pushSpeed);
      world.hitEffect(other.x, other.y - PERSON.height * 0.6, false);
      this.vx *= TOSS.keep;
    }
  }

  private measureSpeed(deltaMs: number): void {
    if (deltaMs <= 0) return;
    const now = (this.x - this.lastX) / (deltaMs / 1000);
    this.speedX += (now - this.speedX) * TOSS.smoothing;
    this.lastX = this.x;
  }

  /**
   * A doll with no lives left is a ragdoll. Held or in the air, it hangs from the
   * hand with arms and legs dangling behind the way it moves. On the ground it
   * flops down flat, on whichever side it was falling toward.
   */
  private drawLimp(deltaMs: number, state: BodyState, area: PlaceArea): void {
    const held = state === 'held';
    const { angle, speed } = this.tumble;
    if (held) {
      const upright = this.hangAngle === 0 ? 0 : angle < 0 ? -Math.PI : Math.PI;
      const rest = upright + trail(this.speedX, LIMP.bodyTrail, LIMP.bodyTrailMax);
      this.tumble = dangleStep(this.tumble, rest, LIMP.hangBody, deltaMs);
    } else if (state === 'falling') {
      this.tumble = { angle: angle + speed * (deltaMs / 1000), speed };
    } else {
      const turned = wrapAngle(angle);
      const tipped = Math.sin(turned);
      const side = Math.abs(tipped) > 0.05 ? Math.sign(tipped) : this.knockDir;
      const flat = side * this.lieAngle;
      this.tumble = dangleStep({ angle: turned, speed }, flat, LIMP.settle, deltaMs);
      this.scootInside(side, area, deltaMs);
    }

    const rotation = this.tumble.angle;
    const pulled = trail(this.speedX, LIMP.limbTrail, LIMP.limbTrailMax);
    const down = this.facing * wrapAngle(pulled - rotation);
    const rest = state === 'resting' ? this.flop : hangingRest(this.flop, down, LIMP.hang);
    const swung = swingPose(this.limbs, this.limbSpeeds, rest, LIMP_JOINTS, deltaMs);
    this.limbs = swung.pose;
    this.limbSpeeds = swung.speeds;
    this.figure.setPose(this.limbs);

    let x = this.x;
    let y = this.y - Math.abs(Math.sin(rotation)) * PERSON.lyingLift;
    if (held) {
      // Hang from the spot it is held by: that spot stays under the hand
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      x = this.x - this.grabOffset.x - (this.grabSpot.x * cos - this.grabSpot.y * sin);
      y = this.y - this.grabOffset.y - (this.grabSpot.x * sin + this.grabSpot.y * cos);
    }
    this.place(x, y, rotation);
  }

  bringToTop(): void {
    const { container } = this.figure;
    container.scene.children.bringToTop(container);
  }

  destroy(): void {
    this.figure.destroy();
  }

  /** Knocked over: slide, tip over, lie limp for a while, then get back up. */
  private updateKnocked(deltaMs: number, world: World): void {
    const elapsed = (this.knockMs ?? 0) + deltaMs;
    if (this.slide && elapsed < KNOCK.fallMs) {
      const pushed = this.x + this.knockDir * this.knockSpeed * (deltaMs / 1000);
      this.walkTo(pushed, world);
    }
    this.knockMs = knockDone(elapsed, KNOCK) ? null : elapsed;
    this.downMs = elapsed - KNOCK.fallMs;
    // Tip over slowly at first and then faster, like something heavy falling
    const tilt = knockTilt(elapsed, KNOCK) ** 2;
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
  /**
   * A limp doll lying by the edge of the area scoots in a little, so its whole body
   * stays where you can see it and grab it. `side` is the way its head points.
   */
  private scootInside(side: number, area: PlaceArea, deltaMs: number): void {
    const { halfWidth, height } = PERSON;
    const least = area.left + (side < 0 ? height : halfWidth);
    const most = area.right - (side > 0 ? height : halfWidth);
    const wanted = clamp(this.x, least, most);
    const step = LIMP.scootSpeed * (deltaMs / 1000);
    this.x += clamp(wanted - this.x, -step, step);
  }

  private draw(kind: PoseKind, rotation: number, extraLift = 0, limp = 0, wobble = 0): void {
    const loose = this.dead ? 1 : limp;
    const moving = poseFor(kind, this.clockMs);
    const pose = loose > 0 ? shakePose(blendPose(moving, this.flop, loose), wobble) : moving;
    this.figure.setPose(pose);
    this.place(this.x, this.y - pose.lift - extraLift, rotation + this.facing * pose.lean);
  }

  private place(x: number, y: number, rotation: number): void {
    const { container } = this.figure;
    container.setPosition(x, y);
    container.setScale(this.facing, 1);
    container.rotation = rotation;
    this.drawn = { x, y, rotation };
  }
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
