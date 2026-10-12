import type Phaser from 'phaser';
import {
  ASHEN,
  ANGRY,
  BLOOD,
  CLING,
  JET,
  JET_ACTIONS,
  PORTAL,
  POWER,
  type PowerDef,
  type PowerKind,
  GEAR,
  ITEMS,
  type GearDef,
  type GearKind,
  type GearSlot,
  CRUSH,
  DEPTH,
  JUMP,
  KNOCK,
  LIMP,
  LOB,
  PERSON,
  PERSON_ACTIONS,
  WRECK_ACTIONS,
  PHYSICS,
  PUNCH_DAMAGE,
  SEAT_GUN,
  SHORT_CIRCUIT,
  STUCK,
  TOPPLE,
  THUNDER,
  TOSS,
  WALK,
  WATER,
  DROWN,
  MELT,
  type ActionId,
  type GunDef,
  type PersonLook,
  type WoundKind,
} from '../config';
import { clamp } from '../logic/bounds';
import { gearHit } from '../logic/gear';
import { lobSpeed } from '../logic/toss';
import { shade } from '../logic/color';
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
  hurdle,
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
import { aimAt, canSee, segmentHit } from '../logic/shot';
import { sameTeam } from '../logic/team';
import { walkStep, type Facing } from '../logic/walk';
import type { Block } from './Block';
import { Body, type BodyState } from './Body';
import type { Item } from './Item';
import { BODY_PARTS, PersonFigure, type BodyPart } from './personShape';
import { pressActivity, type Activity } from '../logic/activity';
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
export type { Activity };

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
  /** A doll with no lives left can't do anything any more: it can only be thrown away. */
  get actions(): readonly ActionId[] {
    if (this.dead) return WRECK_ACTIONS;
    return this.powerSlot((gear) => gear.jet === true) ? JET_ACTIONS : PERSON_ACTIONS;
  }

  /** Dolls don't break into pieces. */
  readonly crumbs: readonly number[];
  /** A doll steps up onto low things, but a tall thing that lands on it squashes it. */
  protected override readonly climbsOnlyLow = true;
  protected override readonly lively = true;

  /**
   * A doll floats: upright with its head out of the water, or flat on top when it is
   * limp. A knight in its heavy armor doesn't: it sinks to the bottom.
   */
  protected override get floatDepth(): number | null {
    if (this.look.heavy) return null;
    if (this.ragdoll) return WATER.lieDepth;
    return this.strokes ? WATER.swimDepth : WATER.standDepth;
  }

  /** Its colors. Dolls of the same color are on the same side. */
  readonly look: PersonLook;
  activity: Activity = 'idle';
  private readonly figure: PersonFigure;
  private facing: Facing = 1;
  private punchMs = 0;
  /** Time left crouching after slamming the thunder hammer into the floor. */
  private slamMs = 0;
  /** How long it has been pushing out a stream of fire without a rest. */
  private streamMs = 0;
  /** Time left of choking on a stink cloud: it is down on its knees and can do nothing else. */
  private gagMs = 0;
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
  /** Hopping onto something in its way: how fast it goes sideways, and where it took off. */
  private jumpVx = 0;
  private jumpFromX = 0;
  /** Time left before it tries another jump, after one that got it nowhere. */
  private noJumpMs = 0;
  /**
   * A robot that lightning has run through: time left until it blows up, and until its
   * next spark and its next twitch. `blown` once it has gone off; `ashPending` when
   * fire has finished it off and it burns up on its next turn.
   */
  private shortMs = 0;
  private sparkWaitMs = 0;
  private twitchWaitMs = 0;
  private blown = false;
  private ashPending = false;
  /**
   * A laser has turned it to ash: time left until the wind has blown it all away, and
   * the time saved up toward its next flake. `blownAway` once nothing is left.
   */
  private ashMs = 0;
  private blownAway = false;
  /**
   * The gear it has on, and how many more hits each piece takes. And the hits its
   * gear has just taken for it, which clang (or burst to pieces) on its next turn.
   */
  private readonly gear = new Map<GearSlot, { kind: GearKind; left: number }>();
  private gearHits: { x: number; y: number; colors: readonly number[]; broke: boolean }[] = [];
  /** Where hits have just bounced off gear with the power to stop them: a spark flies there. */
  private bounces: Spot[] = [];
  /**
   * Its superpower, if it has one. The time left until it can teleport again, the time
   * saved up toward the next life it heals, and the sparkles it has yet to show.
   */
  private power: { kind: PowerKind; def: PowerDef } | null = null;
  private castMs = 0;
  private healMs = 0;
  /**
   * On its way through a portal: where it set out from and where it comes out, how
   * long it has been on its way, and whether it has got to the other side yet.
   */
  private warp: { fromX: number; toX: number; toY: number; ms: number; across: boolean } | null =
    null;
  private sparkles = 0;
  /** Its jetpack is switched on, and the time left until the next puff of smoke from it. */
  private jetOn = false;
  private jetSmokeMs = 0;
  /** Stuck to the ceiling by its magnet boots, head down. */
  private onCeiling = false;
  /**
   * Frozen solid by a freeze ray: time left until it thaws, and how it stood when the
   * frost got it (where its picture was from its feet, and how far it was turned).
   */
  private frozenMs = 0;
  private stiffAt = { dx: 0, dy: 0, rotation: 0 };
  /** Melting away in lava: time left until nothing of it is left, or `null`. */
  private meltMs: number | null = null;
  /** How far it has to sink to be under altogether. */
  private meltDrop = 0;
  /** How long a heavy doll has had its head under water since it last lost a life, and in all. */
  private drownMs = 0;
  private underMs = 0;
  /** Its head is under water right now. */
  private submerged = false;
  /** Swimming along right now (and not just floating): it lies higher in the water. */
  private strokes = false;
  /**
   * A blade has just gone right through it: a part comes off on its next turn. A sword
   * takes `'any'` part; a saw takes everything above the waist.
   */
  private cutPending: BodyPart | 'any' | null = null;

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
  /** The vehicle it sits in, driving it. */
  private seat: Block | null = null;
  /** The weapons stuck in its body, and where each one sits (from its feet, before turning). */
  private readonly stuck = new Map<Item, Spot>();

  constructor(scene: Phaser.Scene, look: PersonLook, x: number, feetY: number) {
    super(x, feetY);
    this.look = look;
    // Only a robot is made of pieces that fly off when it blows up
    this.crumbs = look.machine ? [look.body, look.joint, shade(look.body, 0.3)] : [];
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

  /** A robot that has blown up is gone. */
  override get gone(): boolean {
    // A robot leaves nothing in lava; of anything else, a skeleton stays on the bottom
    return super.gone || this.blown || this.blownAway || (this.meltMs === 0 && this.machine);
  }

  /**
   * Lava has got it: it is out at once and sinks in, feet first. Once it is under,
   * all that is left of it is a thin burnt skeleton on the bottom. Says whether it
   * has only just started to sink.
   */
  melt(solids: readonly Box[]): boolean {
    if (this.meltMs !== null) return false;
    this.meltMs = MELT.ms;
    const body = this.hitBox;
    this.meltDrop = body.bottom - body.top + MELT.extra;
    this.leaveSeat();
    this.lose(this.lives, solids, null);
    this.spray = 0;
    this.bleedMs = 0;
    this.shortMs = 0;
    return true;
  }

  /** A robot and a knight in armor are made of metal: a magnet pulls them. */
  override get metal(): boolean {
    return this.look.machine === true || this.look.heavy === true;
  }

  /**
   * A puff of frost has hit it: it is frozen solid in a block of ice, just as it
   * stood, and can't do anything until it thaws or something breaks the ice.
   */
  freeze(ms: number): void {
    if (this.dead || this.seat) return;
    if (this.frozenMs <= 0) {
      const { x, y, rotation } = this.drawn;
      this.stiffAt = { dx: x - this.x, dy: y - this.y, rotation };
      this.figure.setIce(true);
    }
    this.frozenMs = ms;
  }

  /** The ice is gone: it thawed, or a hit broke it. */
  private thaw(): void {
    if (this.frozenMs <= 0) return;
    this.frozenMs = 0;
    this.figure.setIce(false);
  }

  /** The way it faces. */
  get pointing(): Facing {
    return this.facing;
  }

  /** Could it put on a piece of gear that goes in this place? Only a living doll, with that place free. */
  canWear(slot: GearSlot): boolean {
    return !this.dead && !this.gear.has(slot);
  }

  /** Put a piece of gear on. From now on it takes the hits, until it breaks. */
  wear(kind: GearKind): void {
    const gear = ITEMS[kind].gear;
    if (!gear) return;
    this.gear.set(gear.slot, { kind, left: gear.hits });
    this.figure.wear(kind, gear.slot);
  }

  /** Take off the outermost piece of gear it has on. Says which it was, or `null`. */
  takeOffGear(): GearKind | null {
    const slot = GEAR.order.find((one) => this.gear.has(one));
    const piece = slot && this.gear.get(slot);
    if (!slot || !piece) return null;
    this.gear.delete(slot);
    this.figure.takeOff(slot);
    return piece.kind;
  }

  /** Could it take this superpower? Only a living doll that doesn't have that very power already. */
  canLearn(kind: PowerKind): boolean {
    return !this.dead && this.canBePicked && this.power?.kind !== kind;
  }

  /** Take a superpower, in place of the one it had: it glows in the power's color from now on. */
  learn(kind: PowerKind): void {
    const def = ITEMS[kind].power;
    if (!def) return;
    this.power = { kind, def };
    this.figure.setAura(def.color);
    this.sparkles += 1;
  }

  /** Give up its superpower. Says which it was, or `null`. */
  forgetPower(): PowerKind | null {
    const had = this.power?.kind ?? null;
    this.power = null;
    this.figure.setAura(null);
    return had;
  }

  /**
   * What a superpower does all by itself: a healing power gives back a life every now
   * and then. A doll that is out has no power any more.
   */
  private usePower(deltaMs: number, world: World): void {
    const power = this.power;
    if (!power) return;
    if (this.dead) {
      this.forgetPower();
      return;
    }
    const middle = this.y - PERSON.height / 2;
    for (; this.sparkles > 0; this.sparkles--) world.sparkle(this.x, middle, power.def.color);
    const heal = power.def.heal;
    if (!heal || this.lives >= (this.look.lives ?? PERSON.lives)) {
      this.healMs = 0;
      return;
    }
    this.healMs += deltaMs;
    if (this.healMs < heal.everyMs) return;
    this.healMs = 0;
    this.lives += 1;
    world.sparkle(this.x, middle, power.def.color);
  }

  /**
   * An angry doll uses its superpower on the one it is after. With the power to
   * teleport, it is suddenly right next to it. With lightning or laser eyes, it
   * strikes from where it stands, if it is close enough and no wall is in the way.
   * Gives the pose for it, or `null` when it has no such power or can't use it now.
   */
  private cast(target: Person | Block, world: World): PoseKind | null {
    const power = this.power?.def;
    if (!power) return null;
    const at = target.feet;
    const toward: Facing = at.x < this.x ? -1 : 1;
    const middle = PERSON.height / 2;
    const hop = power.teleport;
    if (hop && this.castMs <= 0 && Math.abs(at.x - this.x) > hop.from) {
      // A portal opens in front of it, and another one a step before the spot it is going to
      const gap = ANGRY.reach * 0.8 + (target instanceof Person ? 0 : target.def.halfWidth);
      const edge = PERSON.halfWidth;
      const toX = clamp(at.x - toward * gap, world.area.left + edge, world.area.right - edge);
      const toY = Math.min(at.y, world.area.floorY);
      this.facing = toward;
      world.portal(this.x + toward * PORTAL.step, this.heightAt(middle));
      world.portal(toX - toward * PORTAL.step, toY - middle);
      world.sparkle(this.x + toward * PORTAL.step, this.heightAt(middle), power.color);
      // It lets go of the ceiling to step through
      this.onCeiling = false;
      this.warp = { fromX: this.x, toX, toY, ms: 0, across: false };
      this.castMs = hop.everyMs + PORTAL.ms;
      return 'walk';
    }
    const zap = power.zap;
    if (!zap) return null;
    const box = target.box;
    const to = { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 };
    const eyes = { x: this.x + toward * POWER.eyes.x, y: this.heightAt(POWER.eyes.up) };
    const hand = { x: this.x + toward * PERSON.hand.x, y: this.heightAt(PERSON.hand.y) };
    const from = zap.from === 'eyes' ? eyes : hand;
    if (Math.hypot(to.x - from.x, to.y - from.y) > zap.range) return null;
    // Not through a wall. A monster is a wall itself, so there is no telling with those
    const walled =
      target instanceof Person &&
      segmentHit(from.x, from.y, to.x, to.y, world.pieces(this)) !== null;
    if (walled) return null;
    this.facing = toward;
    if (this.waitMs > 0) return 'stand';
    if (target instanceof Person) {
      world.zap(from.x, from.y, target, zap.damage, zap.pushSpeed, zap.spark);
    } else {
      world.flash(from.x, from.y, to.x, to.y, zap.spark);
      target.shot(to.x, to.y, world, Math.min(zap.damage, ANGRY.monsterHits));
    }
    this.waitMs = zap.everyMs;
    this.punchMs = ANGRY.punchMs;
    this.inReach = false;
    return 'punch';
  }

  /** Does it wear gear with the power to stop hits that leave this mark? */
  immuneTo(wound: WoundKind): boolean {
    return this.powerSlot((gear) => gear.stops?.includes(wound) === true) !== null;
  }

  /** Does it wear gear to breathe through? A robot needs no air at all. */
  get breathes(): boolean {
    return this.machine || this.powerSlot((gear) => gear.air === true) !== null;
  }

  /** Where it wears a piece of gear with a certain power, or `null`. */
  private powerSlot(has: (gear: GearDef) => boolean): GearSlot | null {
    for (const [slot, { kind }] of this.gear) {
      const gear = ITEMS[kind].gear;
      if (gear && has(gear)) return slot;
    }
    return null;
  }

  /**
   * It is in a stink cloud. With nothing to breathe through it starts to choke, and
   * goes on choking for `ms` after this. Says whether it is choking.
   */
  gag(ms: number): boolean {
    if (this.dead || this.breathes) return false;
    this.gagMs = ms;
    return true;
  }

  /**
   * Something foul to breathe: a doll with nothing to breathe through loses a life,
   * and the last one makes it fall over. Says whether it choked.
   */
  choke(solids: readonly Box[]): boolean {
    if (this.dead || this.breathes) return false;
    if (this.lose(1, solids, null)) this.knockOver(this.facing, 0);
    return true;
  }

  /**
   * A hit lands on its gear, if it has any on: the outermost piece takes the whole hit
   * and gets a crack, or breaks when it can take no more. Says whether gear took the hit.
   */
  private blockWithGear(damage: number): boolean {
    const worn = [...this.gear].map(([slot, { left }]) => ({ slot, left }));
    const hit = gearHit(worn, GEAR.order, damage);
    const piece = hit && this.gear.get(hit.slot);
    if (!hit || !piece) return false;
    const spot = this.figure.gearSpot(hit.slot) ?? { x: this.x, y: this.y - PERSON.height / 2 };
    const broke = hit.left === 0;
    this.gearHits.push({ ...spot, colors: ITEMS[piece.kind].crumbs, broke });
    if (broke) {
      this.gear.delete(hit.slot);
      this.figure.takeOff(hit.slot);
    } else {
      piece.left = hit.left;
      this.figure.crackGear(hit.slot);
    }
    return true;
  }

  /** Is it a machine (a robot)? Lightning doesn't just knock those out. */
  get machine(): boolean {
    return this.look.machine === true;
  }

  /**
   * Lightning runs through a robot: it falls over and short-circuits, and after a
   * few seconds of twitching and sparking it blows up.
   */
  shortCircuit(direction: Facing): void {
    if (!this.machine || this.shortMs > 0 || this.blown) return;
    const { min, max } = SHORT_CIRCUIT.ms;
    this.shortMs = randomBetween(min, max);
    this.activity = 'idle';
    this.figure.setAngry(false);
    this.knockOver(direction, SHORT_CIRCUIT.skid.min);
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
    return !this.dead && this.state === 'resting' && !this.ragdoll && this.seat === null;
  }

  /** Sitting in a vehicle right now? */
  get seated(): boolean {
    return this.seat !== null;
  }

  /** A doll sitting in a vehicle moves with its seat, not as something standing on the roof. */
  override get riding(): boolean {
    return this.seat === null && super.riding;
  }

  /** Get into a vehicle and sit down. The vehicle drives off. */
  sitIn(vehicle: Block): void {
    this.seat = vehicle;
    // Inside a car or a truck the legs are down in the footwell, out of sight
    this.figure.showLegs(vehicle.seatInFront);
    this.held = false;
    this.ragdoll = false;
    this.rise = null;
    this.floored = false;
    this.downMs = 0;
    this.vx = 0;
    this.endToss();
    this.tumble = { angle: 0, speed: 0 };
    vehicle.takeDriver(this);
  }

  /** Get out of the vehicle (or get thrown out of it): the vehicle stops. */
  leaveSeat(): void {
    const vehicle = this.seat;
    if (!vehicle) return;
    this.seat = null;
    this.figure.showLegs(true);
    vehicle.dropDriver();
    this.release([]);
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
      left: box.left - Body.pickPadding,
      right: box.right + Body.pickPadding,
      top: box.top - Body.pickPadding,
      bottom: box.bottom,
    };
  }

  isOn(action: ActionId): boolean {
    return action === 'jet' ? this.jetOn : this.activity === action;
  }

  /** Switch its jetpack on, or off again. */
  toggleJet(): void {
    this.jetOn = !this.jetOn && !this.dead && this.powerSlot((gear) => gear.jet === true) !== null;
  }

  /** Fire gets at a doll with no lives left: it burns down to a black skeleton, and bleeds no more. */
  scorch(): void {
    // Ash has nothing left in it to burn
    if (!this.dead || this.ashMs > 0) return;
    if (this.machine) {
      // A robot has no bones to leave: it burns up completely
      this.ashPending = true;
      return;
    }
    this.figure.burnToBones();
    this.spray = 0;
    this.bleedMs = 0;
  }

  /** Switch walking, dancing or angry mode on, or off if it's already on. */
  toggle(activity: Exclude<Activity, 'idle'>): void {
    if (this.dead) return;
    this.activity = pressActivity(this.activity, activity, this.look.angry === true);
    this.figure.setAngry(this.activity === 'angry');
    this.punchMs = 0;
    this.slamMs = 0;
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

  /** The item in its hand is gone: it went off, or was taken out of the game. The hand is empty. */
  lost(item: Item): void {
    if (this.item !== item) return;
    this.item = null;
    this.figure.letGoOf(item.display);
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
    // Grabbing a doll that sits in a vehicle pulls it out
    this.leaveSeat();
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
    this.thaw();
    // The laser that finishes a doll off doesn't knock it over: it turns to ash as it stands
    const toAsh = wound === 'laser' && !this.dead && isDead(takeHit(this.lives, damage));
    // With gear on to take the hit, the doll stays on its feet
    const guarded = !this.dead && damage > 0 && this.gear.size > 0;
    if (toAsh) this.knockDir = direction;
    else if (!guarded) this.knockOver(direction, pushSpeed);
    return this.lose(damage, solids, wound);
  }

  /**
   * Hit by a bullet: lose lives, but stay on your feet. Only the last bullet makes
   * the doll fall. Says whether this bullet was the last one.
   */
  shot(
    direction: Facing,
    solids: readonly Box[],
    damage: number,
    wound: WoundKind = 'hole',
  ): boolean {
    if (this.dead) return false;
    this.thaw();
    this.flinchMs = PERSON.flinch.ms;
    this.flinchDir = direction;
    // A laser's wind blows the way the ray went
    if (wound === 'laser') this.knockDir = direction;
    const deadly = this.lose(damage, solids, wound);
    // What a laser finishes off doesn't fall: it turns to ash as it stands
    if (deadly && wound !== 'laser') this.knockOver(direction, KNOCK.pushSpeed);
    return deadly;
  }

  /** Go limp, get shoved away and fall over. */
  private knockOver(direction: Facing, pushSpeed: number): void {
    this.goLimp();
    this.floored = true;
    this.downMs = 0;
    this.punchMs = 0;
    this.slamMs = 0;
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
  private lose(damage: number, solids: readonly Box[], wound: WoundKind | null): boolean {
    if (this.dead) return false;
    if (damage > 0 && wound) {
      // Gear with the power to stop this kind of hit: nothing happens at all
      const stopper = this.powerSlot((gear) => gear.stops?.includes(wound) === true);
      if (stopper) {
        const spot = this.figure.gearSpot(stopper);
        if (spot) this.bounces.push(spot);
        return false;
      }
      // Gear takes the hit for the doll. Not what gets at all of it at once: lava, or water
      if (this.blockWithGear(damage)) return false;
    }
    if (damage > 0 && wound === 'cut') this.cutPending = 'any';
    if (damage > 0 && wound === 'saw') this.cutPending = 'upperBody';
    if (damage > 0 && wound) {
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
    // Fire, a blast, a laser or lightning finished it off: only charred bones are left
    if (wound === 'burn') this.scorch();
    // A monster's laser turns it to ash, which the wind soon blows away
    if (wound === 'laser') this.turnToAsh();
    // Lightning leaves it whole but singed black. A robot has no bones for a blast to bare.
    if (wound === 'shock' || (wound === 'blast' && this.machine)) this.figure.singe();
    // A blast bares the bones on the side it came from: it pushed the doll the other way
    else if (wound === 'blast') this.figure.burnSide(this.knockDir !== this.facing);
    this.dropItem(solids);
    return true;
  }

  update(deltaMs: number, world: World): void {
    this.clockMs += deltaMs;
    this.flinchMs = Math.max(0, this.flinchMs - deltaMs);
    this.gagMs = Math.max(0, this.gagMs - deltaMs);
    if (this.seat) {
      this.sitStill(this.seat, deltaMs, world);
      this.bleed(deltaMs, world);
      return;
    }
    if (this.meltMs !== null && this.meltMs > 0) {
      this.meltMs = Math.max(0, this.meltMs - deltaMs);
      if (this.meltMs === 0) this.leaveBones(world);
    }
    if (this.ashMs > 0) {
      // All ash: it stays just as it was, falls if nothing holds it up, and can be carried
      this.physics(deltaMs, world);
      this.place(this.x + this.stiffAt.dx, this.y + this.stiffAt.dy, this.stiffAt.rotation);
      this.blowAway(deltaMs, world);
      return;
    }
    if (this.frozenMs > 0) {
      // Frozen solid: it only falls and can be carried, stiff as it is
      this.frozenMs -= deltaMs;
      if (this.frozenMs > 0 && this.meltMs === null) {
        this.physics(deltaMs, world);
        this.place(this.x + this.stiffAt.dx, this.y + this.stiffAt.dy, this.stiffAt.rotation);
        return;
      }
      this.figure.setIce(false);
      this.frozenMs = 0;
    }
    if (this.travel(deltaMs, world)) return;
    if (this.hang(deltaMs, world)) return;
    this.carryUp(deltaMs, world);
    this.fly(deltaMs, world);
    const wasFalling = this.state === 'falling';
    const fallSpeed = this.speed.y;
    this.wade(deltaMs, world);
    this.noJumpMs = Math.max(0, this.noJumpMs - deltaMs);
    this.glide(deltaMs, world);
    this.leap(deltaMs, world);
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
      // Under water everything is slow: a doll tips over and settles in slow motion
      this.flopAbout(deltaMs * (this.submerged ? WATER.drag : 1), state, world);
      this.maybeGetUp(deltaMs, state, world);
    } else if (this.jetOn && this.hovering) {
      // Flying with a jetpack: it does what it is doing in the air, leaning forward when it flies along
      const pose = this.act(deltaMs, world);
      const along = pose === 'walk' || pose === 'run';
      this.draw(along ? 'stand' : pose, along ? this.facing * JET.lean : 0);
    } else if (this.hovering) {
      // Hanging from a balloon, swaying a little
      const lifts = this.item?.def.lifts;
      const sway = lifts ? lifts.sway * Math.sin((this.clockMs / lifts.swayMs) * Math.PI * 2) : 0;
      this.draw('held', sway);
    } else if (state !== 'resting') {
      this.draw(this.jumpVx === 0 ? 'held' : 'run', 0);
    } else if (this.gagMs > 0 && !this.dead) {
      // Choking: down on its knees, hands at its throat. It can't walk, dance or fight now
      this.draw('choke', 0);
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

  /** Sitting in a vehicle: stay in the seat, facing the way the vehicle points. */
  private sitStill(vehicle: Block, deltaMs: number, world: World): void {
    const hips = vehicle.seatSpot();
    this.facing = vehicle.pointing;
    this.x = hips.x;
    // The figure is placed by its feet, which are this far below its hips when standing
    this.y = hips.y + PERSON.hipHeight;
    this.last = { x: this.x, y: this.y };
    this.speed = { x: 0, y: 0 };
    // On a motorbike the legs hang down; inside a car they are stretched out, out of sight
    const pose = poseFor(vehicle.seatInFront ? 'sit' : 'drive', this.clockMs);
    const aim = this.shootFromSeat(vehicle, hips, deltaMs, world);
    // The arm with the gun points where it shoots
    const armed = aim
      ? { ...pose, frontArm: Math.atan2(-aim.x * this.facing, aim.y), frontElbow: 0 }
      : pose;
    this.figure.setPose(armed);
    this.place(this.x, this.y, 0);
  }

  /**
   * With a gun in its hand, a doll in a vehicle shoots at the closest standing doll
   * of another color in front of it, aiming straight at it. Gives the way it aims,
   * or `null` when there is nobody to shoot at.
   */
  private shootFromSeat(vehicle: Block, hips: Spot, deltaMs: number, world: World): Spot | null {
    this.waitMs = Math.max(0, this.waitMs - deltaMs);
    const gun = this.item?.def.gun;
    if (!gun) return null;
    const fromX = hips.x + this.facing * SEAT_GUN.forward;
    const fromY = hips.y - SEAT_GUN.up;
    const ahead = world.people.filter(
      (other) =>
        other !== this &&
        other.canBeHit &&
        !sameTeam(other.look, this.look) &&
        (other.x - fromX) * this.facing > 0 &&
        Math.hypot(other.x - fromX, other.y - fromY) <= gun.range,
    );
    const nearest = nearestIndex(
      fromX,
      ahead.map((other) => other.x),
    );
    const target = nearest === null ? undefined : ahead[nearest];
    if (!target) return null;
    const atY = target.y - PERSON.height * SEAT_GUN.aimHeight;
    const aim = aimAt(fromX, fromY, target.x, atY, this.facing);
    if (this.waitMs === 0) {
      world.shoot(this, fromX, fromY, this.facing, gun, aim, vehicle);
      this.waitMs = gun.everyMs;
    }
    return aim;
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

  /**
   * With its jetpack switched on, a doll flies: up to its flying height, or to the
   * height of the one it is after when it is angry. A doll that is limp, or held, or
   * has lost its jetpack doesn't fly.
   */
  private fly(deltaMs: number, world: World): void {
    const has = !this.dead && this.powerSlot((gear) => gear.jet === true) !== null;
    if (!has) this.jetOn = false;
    const flying = this.jetOn && !this.ragdoll && !this.held;
    this.figure.jetFlame(this.jetOn && !this.ragdoll);
    if (!flying) return;
    this.hovering = true;
    const prey = this.activity === 'angry' ? this.pickTarget(world) : undefined;
    const wanted = prey ? prey.feet.y : world.area.floorY - JET.height;
    const step = JET.climb * (deltaMs / 1000);
    const next = this.y + clamp(wanted - this.y, -step, step);
    this.y = clamp(next, world.area.top + PERSON.height, world.area.floorY);
    this.jetSmokeMs -= deltaMs;
    if (this.jetSmokeMs > 0) return;
    this.jetSmokeMs = JET.smokeEveryMs;
    world.smoke(this.x - this.facing * JET.smoke.back, this.y - JET.smoke.up);
  }

  /**
   * How high a spot of the doll is in the area: `height` above its feet. A doll on the
   * ceiling is upside down, so there its feet are at the top and the spot is below them.
   */
  private heightAt(height: number): number {
    return this.onCeiling ? this.y - PERSON.height + height : this.y - height;
  }

  /**
   * On its way through a portal: it steps into the one in front of it, getting
   * thinner and fainter, and then out of the other one, where it is going. Says
   * whether it is on its way.
   */
  private travel(deltaMs: number, world: World): boolean {
    const warp = this.warp;
    if (!warp) return false;
    const { container } = this.figure;
    if (this.dead || this.held) {
      this.warp = null;
      container.setAlpha(1);
      return false;
    }
    warp.ms += deltaMs;
    const half = PORTAL.ms / 2;
    if (warp.ms >= half && !warp.across) {
      warp.across = true;
      this.y = warp.toY;
    }
    // How far it is into a portal: more and more in the first one, less and less in the second
    const part = warp.across ? 2 - warp.ms / half : warp.ms / half;
    const inside = clamp(part, 0, 1);
    const from = warp.across ? warp.toX : warp.fromX;
    const way = warp.across ? -this.facing : this.facing;
    this.x = from + way * PORTAL.step * inside;
    this.hovering = true;
    this.physics(deltaMs, world);
    this.figure.setPose(this.standingPose('walk'));
    this.place(this.x, this.y, 0);
    const { wide, tall } = PORTAL.squeeze;
    container.setScale(container.scaleX * (1 - wide * inside), 1 - tall * inside);
    container.setAlpha(1 - inside);
    if (warp.ms >= PORTAL.ms) {
      this.warp = null;
      this.x = warp.toX;
      container.setAlpha(1);
    }
    this.bleed(deltaMs, world);
    return true;
  }

  /**
   * With magnet boots on, a doll whose head gets to the ceiling sticks to it, feet
   * first: it stands there head down, and walks and dances there. It comes off when
   * it is grabbed, or dies, or loses its boots. Says whether it is on the ceiling.
   */
  private hang(deltaMs: number, world: World): boolean {
    const clings =
      !this.dead && !this.held && this.powerSlot((gear) => gear.clings === true) !== null;
    const top = world.area.top;
    const reached = this.y - PERSON.height <= top + CLING.snap && this.state !== 'flying';
    if (!clings || !(this.onCeiling || reached)) {
      this.onCeiling = false;
      return false;
    }
    if (!this.onCeiling) {
      this.onCeiling = true;
      this.rise = null;
      this.ragdoll = false;
      this.floored = false;
      this.downMs = 0;
    }
    this.hovering = true;
    this.y = top + PERSON.height;
    this.physics(deltaMs, world);
    // It fights up there too: with the others on the ceiling, hand to hand
    let pose: PoseKind = 'stand';
    if (this.activity === 'dance') pose = 'dance';
    if (this.activity === 'angry') pose = this.rage(deltaMs, world);
    if (this.activity === 'walk') {
      const edge = PERSON.halfWidth;
      const walker = walkStep(
        { x: this.x, facing: this.facing },
        WALK.speed * this.pace,
        deltaMs,
        world.area.left + edge,
        world.area.right - edge,
      );
      this.x = walker.x;
      this.facing = walker.facing;
      pose = 'walk';
    }
    this.figure.setPose(this.standingPose(pose));
    // Head down: turned right around its feet, which are on the ceiling
    this.place(this.x, top, Math.PI);
    // Turned around like that it would look the other way: flip it back
    this.figure.container.setScale(-this.facing * this.figure.thinness, 1);
    this.measureSpeed(deltaMs);
    this.bleed(deltaMs, world);
    return true;
  }

  /** A doll with a balloon in its hand is carried up, until it hangs just under the ceiling. */
  private carryUp(deltaMs: number, world: World): void {
    const balloon = this.item;
    const lifts = balloon?.def.lifts;
    this.hovering = lifts !== undefined && !this.dead && !this.ragdoll && !this.held;
    if (!balloon || !lifts || !this.hovering) return;
    // The balloon is above the doll's raised hand, and it has to fit under the ceiling too
    const room = balloon.size.halfWidth * 2 + PERSON.height * lifts.armShare;
    const top = world.area.top + PERSON.height + lifts.below + room;
    this.y = Math.max(top, this.y - lifts.speed * (deltaMs / 1000));
  }

  /**
   * In water: a robot short-circuits as soon as it gets wet, and a heavy doll whose
   * head is under water loses a life again and again until it has drowned.
   */
  private wade(deltaMs: number, world: World): void {
    const surface = world.floatLine(this.x, 0);
    const body = this.hitBox;
    const wet = surface !== null && body.bottom > surface && this.state !== 'held';
    this.submerged = wet && body.top > surface;
    // Rubber boots keep the electricity in a robot where it belongs
    if (wet && this.machine && !this.immuneTo('shock')) this.shortCircuit(this.facing);
    // With air to breathe, even a heavy doll is fine on the bottom
    if (!this.submerged || !this.look.heavy || surface === null || this.breathes) {
      this.drownMs = 0;
      this.underMs = 0;
      return;
    }
    // A heavy doll on the bottom can't stay on its feet for long, and doesn't get up again
    this.underMs += deltaMs;
    if (this.ragdoll) this.downMs = 0;
    else if (this.underMs >= DROWN.fallAfterMs && this.state === 'resting') this.tipOver();
    if (this.dead) return;
    this.drownMs += deltaMs;
    if (this.drownMs < DROWN.everyMs) return;
    this.drownMs = 0;
    if (!this.lose(1, world.solidBoxes(this), null)) return;
    this.knockOver(this.facing, 0);
    world.hitEffect(this.x, surface, true, 'none');
  }

  /**
   * It has sunk into the lava altogether. What comes to lie on the bottom is a very
   * thin, burnt skeleton: it lies down flat at once, where the lava hides it.
   */
  private leaveBones(world: World): void {
    if (this.machine) return;
    this.figure.burnToBones(true);
    this.knockOver(this.facing, 0);
    const frameMs = 16;
    for (let ms = 0; ms < MELT.settleMs; ms += frameMs) {
      this.flopAbout(frameMs, 'resting', world);
    }
  }

  /** Go limp and tip over on the spot, gently: nothing has hit it. */
  private tipOver(): void {
    const before = this.tumble.speed;
    this.knockOver(this.facing, 0);
    this.tumble = {
      angle: this.tumble.angle,
      speed: before + this.facing * LIMP.knockSpin * DROWN.tip,
    };
  }

  /**
   * A short-circuiting robot can't get up. Sparks fly off it, and again and again its
   * joints are kicked about and it skids or hops. When its time is up, it blows up.
   */
  private fizzle(deltaMs: number, world: World): void {
    if (this.shortMs <= 0 || this.blown) return;
    const short = SHORT_CIRCUIT;
    this.shortMs -= deltaMs;
    this.sparkWaitMs -= deltaMs;
    this.twitchWaitMs -= deltaMs;
    const body = this.hitBox;
    if (this.sparkWaitMs <= 0) {
      this.sparkWaitMs = short.sparkEveryMs;
      world.spark(randomBetween(body.left, body.right), randomBetween(body.top, body.bottom));
    }
    const loose = this.state !== 'held' && this.state !== 'flying' && this.seat === null;
    if (this.twitchWaitMs <= 0 && loose) {
      this.twitchWaitMs = short.twitchEveryMs;
      if (!this.ragdoll) this.knockOver(this.facing, 0);
      this.downMs = 0;
      this.limbSpeeds = kickJoints(this.limbSpeeds, short.kick);
      const side = Math.random() < 0.5 ? -1 : 1;
      this.vx = side * randomBetween(short.skid.min, short.skid.max);
      if (this.state === 'resting' && Math.random() < short.hopChance) this.hop(short.hop);
    }
    if (this.shortMs > 0) return;
    this.leaveSeat();
    this.blown = true;
    world.explode(this, short.blast);
  }

  /** A part comes off, a different one every time, and flies away. Blood sprays from the cut. */
  private comeApart(wanted: BodyPart | 'any', world: World): void {
    const any = BODY_PARTS[Math.floor(Math.random() * BODY_PARTS.length)] ?? 'head';
    const loose = this.figure.cutOff(wanted === 'any' ? any : wanted);
    if (!loose) return;
    world.bleed(loose.x, loose.y, BLOOD.cutSpray, this.look.blood ?? BLOOD.color, true);
    // A saw doesn't fling the part off: the doll just comes apart as it falls over
    const { picture, lift, reach } = loose;
    world.sever(picture, lift, reach, this.knockDir, wanted !== 'any');
  }

  /**
   * All ash now: black, with crosses for eyes, and no blood left in it. It doesn't
   * fall over: it stays stiff, just as it was when the laser got it.
   */
  private turnToAsh(): void {
    this.figure.turnToAsh();
    this.spray = 0;
    this.bleedMs = 0;
    this.ashMs = ASHEN.standMs + ASHEN.blowMs;
    const { x, y, rotation } = this.drawn;
    this.stiffAt = { dx: x - this.x, dy: y - this.y, rotation };
  }

  /**
   * A doll of ash stays as it is for a moment. Then the wind gets up, blowing the way
   * the laser went: it takes the doll apart, one little square of ash after another,
   * and the flakes fly off, until nothing is left.
   */
  private blowAway(deltaMs: number, world: World): void {
    if (this.ashMs <= 0) return;
    const starting = this.ashMs > ASHEN.blowMs;
    this.ashMs = Math.max(0, this.ashMs - deltaMs);
    if (this.ashMs > ASHEN.blowMs) return;
    if (starting) this.figure.crumble(this.knockDir);
    const loose = this.figure.blowOff(this.ashMs / ASHEN.blowMs);
    // Some of the squares fly off in the wind, and a few fall down into a pile on the floor
    const flying: Spot[] = [];
    for (const spot of loose) {
      const chance = Math.random();
      if (chance < ASHEN.flying) flying.push(spot);
      else if (chance < ASHEN.flying + ASHEN.falling)
        world.bleed(spot.x, spot.y, 1, ASHEN.pile, false);
    }
    world.blowAsh(flying, this.knockDir, starting);
    if (this.ashMs === 0) this.blownAway = true;
  }

  /** Spray and drip blood from where the wounds are. */
  private bleed(deltaMs: number, world: World): void {
    for (const { x, y, colors, broke } of this.gearHits) world.gearHit(x, y, colors, broke);
    this.gearHits = [];
    this.usePower(deltaMs, world);
    for (const { x, y } of this.bounces) world.spark(x, y);
    this.bounces = [];
    this.fizzle(deltaMs, world);
    this.blowAway(deltaMs, world);
    if (this.ashPending) {
      this.ashPending = false;
      world.burn(this);
    }
    if (this.cutPending) {
      const part = this.cutPending;
      this.cutPending = null;
      this.comeApart(part, world);
    }
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
    // A heavy doll on the bottom of the water can't walk, dance or fight down there
    if (this.submerged && this.look.heavy) return 'stand';
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
      // Hop onto something low in the way, and turn around at a wall, just like at the edge
      if (blocked && this.jumpOnto(this.facing, world)) return 'walk';
      this.facing = blocked ? (this.facing === 1 ? -1 : 1) : walker.facing;
      return 'walk';
    }
    if (this.activity === 'dance') return 'dance';
    if (this.activity === 'angry') return this.rage(deltaMs, world);
    return 'stand';
  }

  /**
   * Angry mode: go for the closest standing doll of another color, or the closest monster.
   * Punch it, hit it with the sword or bat in the hand, or shoot it with the pistol from
   * far away.
   */
  private rage(deltaMs: number, world: World): PoseKind {
    this.waitMs = Math.max(0, this.waitMs - deltaMs);
    this.castMs = Math.max(0, this.castMs - deltaMs);
    if (this.punchMs > 0) {
      this.punchMs -= deltaMs;
      return 'punch';
    }

    if (this.slamMs > 0) {
      this.slamMs -= deltaMs;
      return 'slam';
    }

    const target = this.pickTarget(world);
    if (!target) {
      this.inReach = false;
      return 'stand';
    }

    // With the thunder hammer there is no need to run anywhere: it crouches and slams
    // the hammer into the floor, and the lightning gets everybody but itself
    const hammer = this.item;
    if (hammer?.def.thunder) {
      this.facing = target.feet.x < this.x ? -1 : 1;
      if (this.waitMs > 0) return 'stand';
      this.slamMs = THUNDER.slamMs;
      this.waitMs = THUNDER.restMs;
      world.thunder(hammer, this);
      return 'slam';
    }

    const cast = this.cast(target, world);
    if (cast) return cast;
    const solids = world.solidBoxes(this);
    const lobbed = this.lobBomb(target, deltaMs, world);
    if (lobbed) return lobbed;
    const hurled = target instanceof Person ? this.hurlWeapon(target, world) : null;
    if (hurled) return hurled;
    const weapon = this.item?.def;
    // A wizard needs no gun: with an empty hand it casts its spell
    // And so does a doll with a superpower that is a spell
    const spell = this.power?.def.spell ?? this.look.spell;
    const gun = weapon?.gun ?? (weapon ? undefined : spell);
    const canShoot = gun !== undefined && this.clearShot(target, gun, solids);
    // A monster is big: it is hit on its side, which is that much closer than its middle
    const girth = target instanceof Person ? 0 : target.def.halfWidth;
    const reach = canShoot ? gun.range : (weapon?.melee?.reach ?? ANGRY.reach) + girth;
    const chase = chaseStep(
      this.x,
      this.facing,
      target.feet.x,
      reach,
      ANGRY.speed * this.pace,
      deltaMs,
    );
    const blocked = this.walkTo(chase.x, world);
    this.facing = chase.facing;
    const close = Math.abs(target.feet.x - this.x) <= reach + 1;
    // Right up against the monster it is after, there is nothing to hop onto
    const atMonster = close && !(target instanceof Person);
    if (blocked && !atMonster && this.jumpOnto(this.facing, world)) return 'run';

    const sameLevel = Math.abs(target.feet.y - this.y) <= ANGRY.levelSlack;
    if (!close || !(canShoot || sameLevel)) {
      this.inReach = false;
      return close || blocked ? 'stand' : 'run';
    }

    if (!this.inReach) {
      // Just got close: wind up for a short, random moment first
      this.inReach = true;
      this.waitMs = Math.max(this.waitMs, randomBetween(ANGRY.windupMs.min, ANGRY.windupMs.max));
    }
    // Fire comes in a stream, one puff right after the other. A spell of fire is pushed
    // out with both hands
    const streams = canShoot && gun.flame !== undefined;
    const pushes = streams && !weapon;
    const aiming: PoseKind = pushes ? 'push' : 'punch';
    if (this.waitMs > 0) {
      // Between two bursts of fire it lets its arms down
      const resting = pushes && this.waitMs > gun.everyMs * 2;
      return canShoot && !resting ? aiming : 'stand';
    }

    this.punchMs = streams ? 0 : ANGRY.punchMs;
    if (canShoot) {
      const { muzzle } = gun;
      world.shoot(this, this.x + this.facing * muzzle.x, this.heightAt(muzzle.y), this.facing, gun);
      this.waitMs = gun.everyMs;
      const burst = gun.flame?.burst;
      if (burst) {
        this.streamMs += gun.everyMs;
        if (this.streamMs >= burst.ms) {
          this.streamMs = 0;
          this.waitMs = burst.restMs;
        }
      }
      return aiming;
    }

    // Super strength is in the bare fists: they take more lives, and send the other flying
    const strong = weapon ? undefined : this.power?.def.punch;
    const damage =
      (weapon?.melee?.damage ?? PUNCH_DAMAGE) +
      (this.look.punch ?? PUNCH_DAMAGE) -
      PUNCH_DAMAGE +
      (strong?.damage ?? 0);
    const sound = weapon?.melee ? (weapon.melee.sound ?? 'clang') : 'punch';
    if (target instanceof Person) {
      const deadly = target.hit(
        this.facing,
        world.solidBoxes(target),
        damage,
        weapon?.melee?.pushSpeed ?? strong?.pushSpeed,
        weapon?.melee?.wound,
      );
      world.hitEffect(target.feet.x, target.feet.y - PERSON.height * 0.75, deadly, sound);
    } else {
      // A hit on a monster counts like bullets: one for every life it would have taken
      const box = target.box;
      const side = this.facing === 1 ? box.left : box.right;
      const high = clamp(this.y - PERSON.height * 0.6, box.top, box.bottom);
      target.shot(side, high, world, Math.min(damage, ANGRY.monsterHits));
      world.hitEffect(side, high, false, sound);
    }
    this.waitMs = ANGRY.restMs;
    this.inReach = false;
    return 'punch';
  }

  /**
   * A weapon that is made for throwing (a trident) is thrown at the one the doll is
   * after, hard and almost straight. Gives the pose for it, or `null` when it holds
   * nothing to throw or the other doll is too close or too far.
   */
  private hurlWeapon(target: Person, world: World): PoseKind | null {
    const weapon = this.item;
    const hurl = weapon?.def.hurl;
    if (!weapon || !hurl) return null;
    const gap = Math.abs(target.feet.x - this.x);
    if (gap < hurl.tooClose || gap > hurl.range) return null;
    this.facing = target.feet.x < this.x ? -1 : 1;
    if (this.waitMs > 0) return 'stand';
    const solids = world.solidBoxes(this);
    this.dropItem(solids);
    const from = weapon.feet;
    const chest = target.feet.y - PERSON.height * 0.6;
    const speed = lobSpeed(
      from.x,
      from.y,
      target.feet.x,
      chest,
      PHYSICS.gravity,
      hurl.flightMs / 1000,
    );
    weapon.fling(speed.x, speed.y, solids);
    this.punchMs = ANGRY.punchMs;
    this.waitMs = ANGRY.restMs;
    return 'punch';
  }

  /**
   * With a bomb in its hand, an angry doll throws it at the one it is after, in a high
   * arc, and the bomb goes off where it comes down. Too close for that, it backs off
   * first. Gives the pose for it, or `null` when there is nothing to throw or the
   * other doll is too far away.
   */
  private lobBomb(target: Person | Block, deltaMs: number, world: World): PoseKind | null {
    const bomb = this.item;
    const blast = bomb?.def.bomb;
    if (!bomb || !blast) return null;
    const gap = Math.abs(target.feet.x - this.x);
    if (gap > LOB.range) return null;
    const toward: Facing = target.feet.x < this.x ? -1 : 1;
    if (gap < blast.radius + LOB.margin) {
      // Too close: the blast would get it too. It backs off, if it can.
      const step = ANGRY.speed * this.pace * (deltaMs / 1000);
      const blocked = this.walkTo(this.x - toward * step, world);
      this.facing = toward;
      return blocked ? null : 'run';
    }
    this.facing = toward;
    if (this.waitMs > 0) return 'stand';
    const solids = world.solidBoxes(this);
    this.dropItem(solids);
    const from = bomb.feet;
    const seconds = LOB.flightMs / 1000;
    const speedX = (target.feet.x - from.x) / seconds;
    const speedY =
      (target.feet.y - PERSON.height / 2 - from.y) / seconds - (PHYSICS.gravity * seconds) / 2;
    bomb.lob(speedX, speedY, solids, LOB.fuseMs);
    this.punchMs = ANGRY.punchMs;
    this.waitMs = ANGRY.restMs;
    return 'punch';
  }

  /**
   * The closest standing doll of another color, or the closest monster: first of all
   * one on the same level.
   */
  private pickTarget(world: World): Person | Block | undefined {
    const dolls = world.people.filter(
      (other) => other !== this && other.canBeHit && !sameTeam(other.look, this.look),
    );
    const standing = [...dolls, ...world.monsters()];
    const level = standing.filter((other) => Math.abs(other.feet.y - this.y) <= ANGRY.levelSlack);
    const targets = level.length > 0 ? level : standing;
    const nearest = nearestIndex(
      this.x,
      targets.map((other) => other.feet.x),
    );
    return nearest === null ? undefined : targets[nearest];
  }

  /** Would a bullet from the gun fly straight into the target, with nothing in the way? */
  private clearShot(target: Person | Block, gun: GunDef, solids: readonly Box[]): boolean {
    const bulletY = this.heightAt(gun.muzzle.y);
    const box = target.box;
    if (bulletY < box.top || bulletY > box.bottom) return false;
    if (Math.abs(target.feet.x - this.x) > gun.range) return false;
    if (target instanceof Person) return canSee(this.x, target.feet.x, bulletY, solids);
    // Up to the near side of a monster: a monster isn't in its own way
    return canSee(this.x, this.x < target.feet.x ? box.left - 1 : box.right + 1, bulletY, solids);
  }

  /**
   * Something solid is in the way: hop onto it, if it is low enough. Says whether it jumped.
   */
  private jumpOnto(direction: Facing, world: World): boolean {
    // In the air there is nothing to hop from
    if (this.noJumpMs > 0 || this.hovering) return false;
    const { halfWidth, height } = PERSON;
    const solids = world.solidBoxes(this);
    const rise = hurdle(
      this.x,
      this.y,
      direction,
      halfWidth,
      height,
      solids,
      PHYSICS.stepUp,
      JUMP.height,
    );
    if (rise === null) return false;
    this.jumpVx = direction * JUMP.speed;
    this.jumpFromX = this.x;
    this.hop(Math.sqrt(2 * PHYSICS.gravity * (rise + JUMP.clear)));
    return true;
  }

  /**
   * In the middle of a hop: go forward as soon as the feet are high enough. Back on
   * the ground the hop is over, and if it got nowhere the doll gives up for a while.
   */
  private leap(deltaMs: number, world: World): void {
    if (this.jumpVx === 0) return;
    if (this.state === 'falling' && !this.ragdoll) {
      this.walkTo(this.x + this.jumpVx * (deltaMs / 1000), world);
      return;
    }
    if (Math.abs(this.x - this.jumpFromX) < JUMP.least) this.noJumpMs = JUMP.restMs;
    this.jumpVx = 0;
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
    return (this.look.speed ?? 1) * (this.swimming ? WATER.swimSpeed : 1);
  }

  /** Draw the doll in a pose (a limp doll keeps the pose its joints are in). */
  private draw(kind: PoseKind, rotation: number): void {
    // In water, walking and running is swimming
    const moving = kind === 'walk' || kind === 'run';
    this.strokes = this.swimming && moving && !this.ragdoll;
    const pose = this.ragdoll ? this.limbs : this.standingPose(this.strokes ? 'swim' : kind);
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
    container.setScale(this.facing * this.figure.thinness, 1);
    container.rotation = rotation;
    // Lying flat on the ground, it is drawn behind the building pieces: it lies under them
    const flat = this.isDown && Math.abs(Math.sin(rotation)) > 0.7;
    // Sitting inside a vehicle it is behind it and shows through the windows;
    // sitting on a motorbike it is in front
    const sitting = this.seat?.seatInFront ? DEPTH.rider : DEPTH.driver;
    container.setDepth(this.seat ? sitting : flat ? DEPTH.downDoll : DEPTH.person);
    // What lava has left is so thin that, lying down, it lies right on the floor
    const thin = this.figure.thinness;
    if (thin < 1) container.y += (1 - thin) * PERSON.halfWidth * Math.abs(Math.sin(rotation));
    if (this.meltMs !== null && this.meltMs > 0) {
      // Sinking into lava, feet first: the floor hides what has gone under
      container.y += (1 - this.meltMs / MELT.ms) * this.meltDrop;
    }
    this.drawn = { x, y, rotation };
  }
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}
