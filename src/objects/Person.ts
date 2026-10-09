import type Phaser from 'phaser';
import {
  ANGRY,
  BLOOD,
  CRUSH,
  DEPTH,
  KNOCK,
  LIMP,
  PERSON,
  PERSON_ACTIONS,
  PHYSICS,
  PICK_PADDING,
  PUNCH_DAMAGE,
  STUCK,
  TOPPLE,
  TOSS,
  WALK,
  type ActionId,
  type GunDef,
  type PersonLook,
  type WoundKind,
} from '../config';
import { clamp } from '../logic/bounds';
import { chaseStep, nearestIndex } from '../logic/chase';
import {
  dangleStep,
  hangingRest,
  kickJoints,
  lyingRest,
  randomSag,
  swingPose,
  trail,
  wrapAngle,
  type Joint,
  type JointKey,
  type Swinger,
} from '../logic/dangle';
import {
  blockedX,
  boxAround,
  liftOut,
  lyingRoom,
  overlaps,
  pressingOn,
  tiltedBox,
  type Box,
} from '../logic/ground';
import { isDead, takeHit } from '../logic/health';
import type { Spot } from '../logic/pick';
import {
  blendPose,
  limpPose,
  poseFor,
  STAND,
  STILL,
  type Pose,
  type PoseKind,
} from '../logic/pose';
import { canSee } from '../logic/shot';
import { sameTeam } from '../logic/team';
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

/** On the ground every joint drops flat and settles quickly. */
const GROUND_JOINTS = Object.fromEntries(
  Object.keys(LIMP_JOINTS).map((key) => [key, LIMP.ground]),
) as Record<JointKey, Joint>;

/** What a doll keeps doing until it is switched off. */
export type Activity = 'idle' | 'walk' | 'dance' | 'angry';

/** Getting back up from the ground: from how it lay, to standing. */
interface Rise {
  fromPose: Pose;
  fromAngle: number;
  ms: number;
  totalMs: number;
}

/**
 * A doll in the area. It drops from where you put it, can walk, dance or get angry,
 * and can hold an item. Whenever it is knocked over, lifted or thrown it goes limp
 * like a ragdoll; a living doll then gets back up, one with no lives left stays limp.
 */
export class Person extends Body {
  readonly size = PERSON;
  readonly actions = PERSON_ACTIONS;
  /** Dolls don't break into pieces. */
  readonly crumbs: readonly number[] = [];
  /** A doll steps up onto low things, but a tall thing that lands on it squashes it. */
  protected override readonly climbsOnlyLow = true;
  /** Its colors. Dolls of the same color are on the same side. */
  readonly look: PersonLook;
  activity: Activity = 'idle';
  private readonly figure: PersonFigure;
  private facing: Facing = 1;
  private punchMs = 0;
  /** Time left before the next punch or shot. */
  private waitMs = 0;
  private inReach = false;
  /** Keeps counting, so the moves keep going. */
  private clockMs = 0;
  private lives: number;
  /** Drops that are about to spray out of a fresh wound. */
  private spray = 0;
  /** Time left of dripping from its wounds, and until the next drop. */
  private bleedMs = 0;
  private dripWaitMs = 0;
  /** Time left of jerking back from a bullet, and which way. */
  private flinchMs = 0;
  private flinchDir: Facing = 1;
  /** No lives left. */
  private out = false;

  /** Limp like a ragdoll right now: every joint swings loosely. */
  private ragdoll = false;
  /** Knocked or thrown down, so it has to lie on the ground for a while. */
  private floored = false;
  /** How long a living doll has been lying on the ground. */
  private downMs = 0;
  private rise: Rise | null = null;
  /** The way it was last knocked: it falls over that way. */
  private knockDir: Facing = 1;
  /** A loose pose that makes its limbs hang a little apart. A new one every time. */
  private flop: Pose = limpPose();
  /** How much each limb sags toward the floor when it lies down. A new one every time. */
  private sag: Pose = randomSag(LIMP.sag);
  /** How far it tips over when it lies down: a bit different every time. */
  private lieAngle = Math.PI / 2;
  /** Its whole body: how far it has turned over, and how fast it is turning. */
  private tumble: Swinger = { angle: 0, speed: 0 };
  /** Its joints, and how fast each one is turning. */
  private limbs: Pose = STAND;
  private limbSpeeds: Pose = STILL;
  /** Where on its body it is held, seen from its feet before turning. */
  private grabSpot = { x: 0, y: 0 };
  /** Which way up it hangs while held: 0 is head up, π is head down. */
  private hangAngle = 0;

  /** Sideways speed from being thrown or knocked, until it slides to a stop. */
  private vx = 0;
  /** Thrown, and still on its way: it knocks over the dolls it hits. */
  private tossed = false;
  /** How fast it is really moving right now, smoothed (pixels per second). */
  private speed = { x: 0, y: 0 };
  private last: Spot;
  /** Where it was last drawn: its feet, and how far it was turned. */
  private drawn = { x: 0, y: 0, rotation: 0 };
  private item: Item | null = null;
  /** The weapons stuck in its body, and where each one sits (from its feet, before turning). */
  private readonly stuck = new Map<Item, Spot>();

  constructor(scene: Phaser.Scene, look: PersonLook, x: number, feetY: number) {
    super(x, feetY);
    this.look = look;
    this.lives = look.lives ?? PERSON.lives;
    this.last = { x, y: feetY };
    this.figure = new PersonFigure(scene, look);
    this.figure.container.setDepth(DEPTH.person);
    if (look.angry) {
      this.activity = 'angry';
      this.figure.setAngry(true);
    }
    this.draw('held', 0);
  }

  /** No lives left: stays limp and does nothing any more. */
  get dead(): boolean {
    return this.out;
  }

  /** Lying or tipping over on the ground: building pieces land on it and stay there. */
  get isDown(): boolean {
    return this.ragdoll && this.state === 'resting' && this.rise === null;
  }

  /** Standing on the ground, so it can be punched or shot. */
  get canBeHit(): boolean {
    return !this.dead && this.state === 'resting' && !this.ragdoll;
  }

  /** Roughly where the front hand is: a held item counts as being here. */
  get handSpot(): Spot {
    return { x: this.x + this.facing * PERSON.hand.x, y: this.y - PERSON.hand.y };
  }

  /** The weapons that are stuck in its body. */
  get stuckItems(): Item[] {
    return [...this.stuck.keys()];
  }

  /** The item in the hand, or `null` when empty-handed. */
  get holding(): Item | null {
    return this.item;
  }

  /** The space its body really takes up, however it is turned: upright, lying or hanging. */
  get hitBox(): Box {
    const { x, y, rotation } = this.drawn;
    return tiltedBox(x, y, rotation, PERSON.halfWidth, PERSON.height);
  }

  /** A doll is grabbed along its whole body, also when it lies on the ground. */
  override get pickBox(): Box {
    const box = this.hitBox;
    return {
      left: box.left - PICK_PADDING,
      right: box.right + PICK_PADDING,
      top: box.top - PICK_PADDING,
      bottom: box.bottom,
    };
  }

  isOn(action: ActionId): boolean {
    return this.activity === action;
  }

  /** Switch walking, dancing or angry mode on, or off if it's already on. */
  toggle(activity: Exclude<Activity, 'idle'>): void {
    // A doll that is always angry can't be made to do anything else
    if (this.dead || this.look.angry) return;
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

  /** Picked up: the doll goes limp and hangs from the spot it is held by. */
  override grab(px: number, py: number): void {
    const { x, y, rotation } = this.drawn;
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);
    this.grabSpot = {
      x: (px - x) * cos - (py - y) * sin,
      y: (px - x) * sin + (py - y) * cos,
    };
    this.hangAngle = -this.grabSpot.y < PERSON.height * LIMP.upsideDownBelow ? Math.PI : 0;
    this.goLimp();
    this.tumble = { angle: wrapAngle(this.tumble.angle), speed: this.tumble.speed };
    super.grab(px, py);
    this.floored = false;
    this.downMs = 0;
    this.vx = 0;
    this.endToss();
  }

  /**
   * Let go. While the mouse is moving, the doll is thrown the way the mouse was
   * going (speeds in pixels per second); a slow let-go is just a drop.
   */
  throwWith(speedX: number, speedY: number, solids: readonly Box[]): void {
    // It falls from where it was hanging, not from under the hand
    this.x = this.drawn.x;
    this.y = this.drawn.y;
    const speed = Math.hypot(speedX, speedY);
    if (speed < TOSS.minSpeed) {
      this.release(solids);
      return;
    }
    const scale = Math.min(TOSS.power, TOSS.maxSpeed / speed);
    this.release(solids, speedY * scale);
    this.vx = speedX * scale;
    this.gravityScale = TOSS.gravityScale;
    this.tossed = true;
    this.floored = true;
    this.knockDir = this.vx < 0 ? -1 : 1;
    this.tumble = { angle: this.tumble.angle, speed: this.tumble.speed + this.vx * TOSS.spin };
  }

  /**
   * A weapon coming from the side sinks into the body at the height it hit, and
   * stays there. `direction` is the way it was moving and `atY` how high up it was.
   */
  impale(item: Item, direction: Facing, atY: number, out: number): void {
    const height = clamp(this.drawn.y - atY, STUCK.lowest, STUCK.highest);
    // Seen from the doll itself, which may be facing either way
    const pointing = direction * this.facing;
    const spot = { x: -pointing * out, y: -height };
    this.stuck.set(item, spot);
    const tilt = randomBetween(-STUCK.tilt, STUCK.tilt);
    this.figure.embed(item.display, spot.x, spot.y, pointing, tilt);
    this.spray += STUCK.spray;
  }

  /** Where the grip of a weapon stuck in the body is right now, in the area. */
  stuckSpot(item: Item): Spot {
    const spot = this.stuck.get(item) ?? { x: 0, y: 0 };
    const { x, y, rotation } = this.drawn;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const sideways = spot.x * this.facing;
    return { x: x + sideways * cos - spot.y * sin, y: y + sideways * sin + spot.y * cos };
  }

  /** A weapon is pulled out of the body: back into the area, with a spray of blood. */
  pullOut(item: Item): void {
    if (!this.stuck.delete(item)) return;
    this.figure.pullOut(item.display);
    this.spray += STUCK.spray;
  }

  /** Let go inside something solid, a doll ends up standing on top of it. */
  override release(solids: readonly Box[], speedY = 0): void {
    this.y = liftOut(this.box, solids);
    super.release(solids, speedY);
  }

  /**
   * Hit by a fist, a weapon, a blast or a thrown doll: lose lives, go limp, get
   * shoved away and fall over. With no lives left the doll never gets up again.
   * Says whether this hit was the last one.
   */
  hit(
    direction: Facing,
    solids: readonly Box[],
    damage: number = PUNCH_DAMAGE,
    pushSpeed: number = KNOCK.pushSpeed,
    wound: WoundKind = 'bruise',
  ): boolean {
    this.knockOver(direction, pushSpeed);
    return this.lose(damage, solids, wound);
  }

  /**
   * Hit by a bullet: lose lives, but stay on your feet. Only the last bullet makes
   * the doll fall. Says whether this bullet was the last one.
   */
  shot(direction: Facing, solids: readonly Box[], damage: number): boolean {
    if (this.dead) return false;
    this.flinchMs = PERSON.flinch.ms;
    this.flinchDir = direction;
    const deadly = this.lose(damage, solids, 'hole');
    if (deadly) this.knockOver(direction, KNOCK.pushSpeed);
    return deadly;
  }

  /** Go limp, get shoved away and fall over. */
  private knockOver(direction: Facing, pushSpeed: number): void {
    this.goLimp();
    this.floored = true;
    this.downMs = 0;
    this.punchMs = 0;
    this.knockDir = direction;
    this.flop = limpPose();
    this.sag = randomSag(LIMP.sag);
    this.lieAngle = Math.PI / 2 - randomBetween(0, LIMP.lieSpread);
    this.limbSpeeds = kickJoints(this.limbSpeeds, LIMP.hitKick);
    this.tumble = {
      angle: this.tumble.angle,
      speed: this.tumble.speed + direction * LIMP.knockSpin,
    };
    this.vx = direction * pushSpeed * (this.dead ? LIMP.corpsePush : 1);
  }

  /** Lose lives, and get the mark of what did it. Says whether that was the last life. */
  private lose(damage: number, solids: readonly Box[], wound: WoundKind): boolean {
    if (this.dead) return false;
    if (damage > 0) {
      // Every hit that hurts leaves its own kind of mark, which sprays and then drips
      const bleeding = BLOOD.byWound[wound];
      this.figure.addWound(wound);
      this.spray += bleeding.burst;
      this.bleedMs = Math.max(this.bleedMs, bleeding.bleedMs);
    }
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
    this.flinchMs = Math.max(0, this.flinchMs - deltaMs);
    const wasFalling = this.state === 'falling';
    const fallSpeed = this.speed.y;
    this.glide(deltaMs, world);
    const state = this.physics(deltaMs, world);
    this.measureSpeed(deltaMs);
    this.bleed(deltaMs, world);
    this.feelWeight(state, world);

    // A doll swung around in the hand knocks over the dolls it is swung into
    if (state === 'held' && Math.hypot(this.speed.x, this.speed.y) >= TOSS.swingKnockSpeed) {
      this.bump(this.speed.x, world);
      world.shove(this.hitBox, this.speed.x < 0 ? -1 : 1);
    }

    if (state === 'flying') {
      this.draw('held', this.spin);
    } else if (this.rise) {
      this.getUp(this.rise, deltaMs);
    } else if (this.ragdoll) {
      if (wasFalling && state === 'resting') this.land(fallSpeed, world);
      this.flopAbout(deltaMs, state, world);
      this.maybeGetUp(deltaMs, state, world);
    } else if (state !== 'resting') {
      this.draw('held', 0);
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

  /**
   * Something solid has landed on a doll that was on its feet: the weight bends its
   * head and its back forward and it goes down under the thing. It isn't hurt.
   */
  private feelWeight(state: BodyState, world: World): void {
    if (this.ragdoll || state === 'held' || state === 'flying') return;
    const { halfWidth, height } = PERSON;
    const body = boxAround(this.x, this.y, halfWidth - 2, height);
    const weight = pressingOn(body, world.solidBoxes(this), PHYSICS.stepUp);
    if (!weight) return;
    const middle = (weight.left + weight.right) / 2;
    const under: Facing = this.x === middle ? this.facing : this.x < middle ? 1 : -1;
    this.knockOver(under, 0);
    this.vx = -under * CRUSH.push;
    this.limbSpeeds = {
      ...this.limbSpeeds,
      head: this.limbSpeeds.head + CRUSH.headKick,
      waist: this.limbSpeeds.waist + CRUSH.waistKick,
    };
    world.hitEffect(this.x, this.y - height, false, 'punch');
  }

  /** Go limp, starting from exactly how the doll is standing or moving right now. */
  private goLimp(): void {
    this.rise = null;
    if (this.ragdoll) return;
    this.ragdoll = true;
    this.limbs = this.figure.pose;
    this.limbSpeeds = STILL;
    this.tumble = { angle: this.drawn.rotation, speed: 0 };
  }

  /**
   * Hitting the ground makes every joint flop, harder after a longer fall. A doll
   * that was thrown hard bounces back up once or twice.
   */
  private land(fallSpeed: number, world: World): void {
    const kick = Math.min(Math.max(fallSpeed, 0) * LIMP.landKick, LIMP.landKickMax);
    this.limbSpeeds = kickJoints(this.limbSpeeds, kick);
    world.landed(fallSpeed);
    if (this.tossed && fallSpeed >= TOSS.bounceMinSpeed) {
      this.hop(fallSpeed * TOSS.floorBounce);
    }
  }

  /**
   * A living doll on the ground gets back up: at once when it was put down gently
   * and nearly upright, otherwise after lying there for a while.
   */
  private maybeGetUp(deltaMs: number, state: BodyState, world: World): void {
    if (this.dead || state !== 'resting') {
      this.downMs = 0;
      return;
    }
    // With something lying on it, it stays down until that is taken away
    if (world.pinned(this)) {
      this.downMs = Math.max(this.downMs, 1);
      return;
    }
    const upright = Math.abs(wrapAngle(this.tumble.angle)) < LIMP.standWithin;
    const gently = !this.floored && this.downMs === 0 && upright;
    this.downMs += deltaMs;
    if (!gently && this.downMs < KNOCK.lieMs) return;
    this.rise = {
      fromPose: this.limbs,
      fromAngle: wrapAngle(this.tumble.angle),
      ms: 0,
      totalMs: gently ? LIMP.quickRiseMs : KNOCK.riseMs,
    };
  }

  private getUp(rise: Rise, deltaMs: number): void {
    rise.ms += deltaMs;
    const part = Math.min(rise.ms / rise.totalMs, 1);
    // Start and end softly
    const eased = part * part * (3 - 2 * part);
    const rotation = rise.fromAngle * (1 - eased);
    this.figure.setPose(blendPose(rise.fromPose, STAND, eased));
    this.place(this.x, this.y - Math.abs(Math.sin(rotation)) * PERSON.lyingLift, rotation);
    if (part < 1) return;
    this.rise = null;
    this.ragdoll = false;
    this.floored = false;
    this.downMs = 0;
    this.tumble = { angle: 0, speed: 0 };
  }

  /**
   * Fly or slide sideways after a throw or a hit. A doll that is thrown fast enough
   * knocks over the standing dolls it runs into, without hurting them.
   */
  private glide(deltaMs: number, world: World): void {
    if (this.state === 'held' || this.state === 'flying') return;
    if (this.vx === 0) {
      if (this.state === 'resting') this.endToss();
      return;
    }
    const wanted = this.x + this.vx * (deltaMs / 1000);
    this.walkTo(wanted, world);
    if (this.x !== wanted) {
      // Thrown hard into a tall piece, it knocks the piece over
      if (Math.abs(this.vx) >= TOPPLE.minSpeed) world.shove(this.box, this.vx < 0 ? -1 : 1);
      // It stops at the wall and drops down, with its full weight again
      this.vx *= -TOSS.bounce;
      this.gravityScale = 1;
    }
    if (this.state === 'resting') this.vx *= Math.exp(-deltaMs / TOSS.slideMs);
    if (Math.abs(this.vx) < TOSS.stopSpeed) this.vx = 0;
    if (!this.tossed || Math.abs(this.vx) < TOSS.knockSpeed) return;

    if (this.bump(this.vx, world)) this.vx *= TOSS.keep;
  }

  /**
   * Moving sideways at `speedX`, knock over every standing doll this one runs into.
   * They aren't hurt. Says whether it hit anybody.
   */
  private bump(speedX: number, world: World): boolean {
    const direction: Facing = speedX < 0 ? -1 : 1;
    const body = this.hitBox;
    let hitSomeone = false;
    for (const other of world.people) {
      if (other === this || !other.canBeHit || !overlaps(body, other.box)) continue;
      const push = Math.max(TOSS.pushSpeed, Math.abs(speedX) * TOSS.pushShare);
      other.hit(direction, world.solidBoxes(other), 0, push);
      world.hitEffect(other.x, other.y - PERSON.height * 0.6, false, 'punch');
      hitSomeone = true;
    }
    return hitSomeone;
  }

  /** Spray and drip blood from where the wounds are. */
  private bleed(deltaMs: number, world: World): void {
    // A weapon left in the body keeps the wound open
    if (this.stuck.size > 0) this.bleedMs = Math.max(this.bleedMs, BLOOD.dripEveryMs * 2);
    if (this.spray === 0 && this.bleedMs <= 0) return;
    const { x, y, rotation } = this.drawn;
    const up = PERSON.height * BLOOD.woundHeight;
    const woundX = x + Math.sin(rotation) * up;
    const woundY = y - Math.cos(rotation) * up;
    const color = this.look.blood ?? BLOOD.color;
    if (this.spray > 0) {
      world.bleed(woundX, woundY, this.spray, color, true);
      this.spray = 0;
    }
    if (this.bleedMs <= 0) return;
    this.bleedMs -= deltaMs;
    this.dripWaitMs -= deltaMs;
    if (this.dripWaitMs > 0) return;
    this.dripWaitMs = BLOOD.dripEveryMs;
    world.bleed(woundX, woundY, 1, color, false);
  }

  /** The throw is over: from now on it falls like everything else. */
  private endToss(): void {
    this.tossed = false;
    this.gravityScale = 1;
  }

  private measureSpeed(deltaMs: number): void {
    if (deltaMs <= 0) return;
    const seconds = deltaMs / 1000;
    this.speed.x += ((this.x - this.last.x) / seconds - this.speed.x) * TOSS.smoothing;
    this.speed.y += ((this.y - this.last.y) / seconds - this.speed.y) * TOSS.smoothing;
    this.last = { x: this.x, y: this.y };
  }

  /**
   * One frame of being a ragdoll. Held, the body swings from the hand; in the air it
   * spins freely; on the ground it flops down flat, on whichever side it was falling
   * toward. All the while the arms, legs and head swing loosely behind the way it moves.
   */
  private flopAbout(deltaMs: number, state: BodyState, world: World): void {
    const held = state === 'held';
    const { angle, speed } = this.tumble;
    if (held) {
      const upright = this.hangAngle === 0 ? 0 : angle < 0 ? -Math.PI : Math.PI;
      const rest = upright + trail(this.speed.x, LIMP.bodyTrail, LIMP.bodyTrailMax);
      this.tumble = dangleStep(this.tumble, rest, LIMP.hangBody, deltaMs);
    } else if (state === 'falling') {
      this.tumble = { angle: angle + speed * (deltaMs / 1000), speed };
    } else {
      const turned = wrapAngle(angle);
      const tipped = Math.sin(turned);
      const side = Math.abs(tipped) > 0.05 ? Math.sign(tipped) : this.knockDir;
      const flat = side * this.lieAngle;
      this.tumble = dangleStep({ angle: turned, speed }, flat, LIMP.settle, deltaMs);
      this.scootClear(side, world, deltaMs);
    }

    const rotation = this.tumble.angle;
    const pulled = trail(this.speed.x, LIMP.limbTrail, LIMP.limbTrailMax);
    const down = this.facing * wrapAngle(pulled - rotation);
    const float = Math.max(0, trail(this.speed.y, LIMP.floatTrail, 1));
    const hanging = hangingRest(this.flop, down, LIMP.hang, float, this.limbs);
    // The further it has tipped over on the ground, the more its limbs lie down flat
    const flatness =
      state === 'resting' ? clamp((Math.abs(Math.sin(rotation)) - 0.4) / 0.4, 0, 1) : 0;
    const lying = lyingRest(this.limbs, rotation, this.facing, this.sag, LIMP.hang);
    const limbRest = flatness > 0 ? blendPose(hanging, lying, flatness) : hanging;
    const joints = flatness > 0.5 ? GROUND_JOINTS : LIMP_JOINTS;
    const swung = swingPose(this.limbs, this.limbSpeeds, limbRest, joints, deltaMs);
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

  /**
   * A limp doll scoots a little along the ground until its whole body lies clear:
   * inside the area, where you can see and grab it, and beside the building pieces
   * instead of through them. `side` is the way its head points.
   */
  private scootClear(side: number, world: World, deltaMs: number): void {
    const { halfWidth, height } = PERSON;
    const { left, right } = world.area;
    const inside = {
      least: left + (side < 0 ? height : halfWidth),
      most: right - (side > 0 ? height : halfWidth),
    };
    const solids = world.solidBoxes(this);
    const room = lyingRoom(this.x, this.y, side, halfWidth, height, solids, inside, PHYSICS.stepUp);
    // Squeezed in from both sides, there is nowhere better to lie
    if (room.least > room.most) return;
    const wanted = clamp(this.x, room.least, room.most);
    const step = LIMP.scootSpeed * (deltaMs / 1000);
    this.x += clamp(wanted - this.x, -step, step);
  }

  /** Do the thing that's switched on, and say which pose it needs. */
  private act(deltaMs: number, world: World): PoseKind {
    if (this.activity === 'walk') {
      const edge = PERSON.halfWidth;
      const walker = walkStep(
        { x: this.x, facing: this.facing },
        WALK.speed * this.pace,
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
   * Angry mode: go for the closest standing doll of another color. Punch it, hit it with the
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
    const chase = chaseStep(this.x, this.facing, target.x, reach, ANGRY.speed * this.pace, deltaMs);
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
      (weapon?.melee?.damage ?? PUNCH_DAMAGE) + (this.look.punch ?? PUNCH_DAMAGE) - PUNCH_DAMAGE,
      weapon?.melee?.pushSpeed,
      weapon?.melee?.wound,
    );
    const sound = weapon?.melee ? 'clang' : 'punch';
    world.hitEffect(target.x, target.y - PERSON.height * 0.75, deadly, sound);
    this.waitMs = ANGRY.restMs;
    this.inReach = false;
    return 'punch';
  }

  /** The closest standing doll of another color, first of all one on the same level. */
  private pickTarget(world: World): Person | undefined {
    const standing = world.people.filter(
      (other) => other !== this && other.canBeHit && !sameTeam(other.look, this.look),
    );
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

  /** How much faster or slower than usual this kind of doll moves. */
  private get pace(): number {
    return this.look.speed ?? 1;
  }

  /** Draw the doll in a pose (a limp doll keeps the pose its joints are in). */
  private draw(kind: PoseKind, rotation: number): void {
    const pose = this.ragdoll ? this.limbs : this.standingPose(kind);
    this.figure.setPose(pose);
    // A bullet makes it jerk back for a moment
    const flinch = this.flinchMs > 0 ? this.flinchDir * PERSON.flinch.lean : 0;
    this.place(this.x, this.y - pose.lift, rotation + this.facing * pose.lean + flinch);
  }

  private standingPose(kind: PoseKind): Pose {
    const pose = poseFor(kind, this.clockMs);
    const moving = kind === 'walk' || kind === 'run';
    if (!this.look.armsForward || !moving) return pose;
    // A zombie shuffles along with both arms stretched out in front
    return { ...pose, frontArm: -1.5, backArm: -1.3, frontElbow: 0, backElbow: -0.1 };
  }

  private place(x: number, y: number, rotation: number): void {
    const { container } = this.figure;
    container.setPosition(x, y);
    container.setScale(this.facing, 1);
    container.rotation = rotation;
    // Lying flat on the ground, it is drawn behind the building pieces: it lies under them
    const flat = this.isDown && Math.abs(Math.sin(rotation)) > 0.7;
    container.setDepth(flat ? DEPTH.downDoll : DEPTH.person);
    this.drawn = { x, y, rotation };
  }
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
