import type Phaser from 'phaser';
import {
  BARREL_ACTIONS,
  BLAST,
  BLOCK_LOOK,
  BLOCKS,
  BOING,
  BOSS_BAR,
  BULLET_HOLE,
  LAVA,
  CHOMPER,
  DEPTH,
  PERSON,
  ROTOR,
  PHYSICS,
  SKIBIDI,
  TESLA,
  THUNDER,
  THING_ACTIONS,
  TOPPLE,
  VEHICLE_ACTIONS,
  VEHICLE_HULL,
  WATER,
  WRECK_ACTIONS,
  type ActionId,
  type BlastDef,
  type BlockDef,
  type BlockKind,
  type ElementKind,
  type TrapKind,
  type VehicleKind,
} from '../config';
import {
  isTall,
  leanAngle,
  leaning,
  leaningShape,
  overhang,
  rampSteps,
  supportSpan,
  toppled,
  topplePose,
} from '../logic/balance';
import { clamp } from '../logic/bounds';
import { floatStep } from '../logic/chase';
import { shade } from '../logic/color';
import { blockedX, boxAround, liftOut, overlaps, type Box } from '../logic/ground';
import { aimAt, segmentHit } from '../logic/shot';
import type { Spot } from '../logic/pick';
import type { PersonSize, PlaceArea } from '../logic/place';
import type { Facing } from '../logic/walk';
import { Body, type BodyState } from './Body';
import type { Person } from './Person';
import { drawElement, drawLiquid, drawSwirl } from './elementShapes';
import { drawJunk, drawMonsterHead } from './junkShapes';
import { drawFlames, drawSawBlade, drawTrap } from './trapShapes';
import { drawTvHaywire, drawTvProgram } from './tvScreen';
import { drawParkedVehicle, drawRotor, drawVehicle, drawWheel } from './vehicleShapes';
import type { World } from './World';

/**
 * Something solid: a building piece (crate, wall, plank, stone, steel beam, barrel) or
 * a piece of junk (toilet, TV, fridge and so on). They stack, and dolls can stand on
 * them. They have to balance: a piece whose middle isn't over what holds it up slides
 * off, and a tall one falls over onto its side. A barrel explodes when a bullet or a
 * blast hits it. A ghost is the one piece that isn't solid: it floats through everything.
 */
export class Block extends Body {
  override readonly solid: boolean;
  readonly def: BlockDef;
  private readonly usualActions: readonly ActionId[];
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
  /** A vehicle: which way it points, whether it is driving, and its turning wheels. */
  private facing: Facing = 1;
  private driving = false;
  private readonly wheels: Phaser.GameObjects.Graphics[] = [];
  /** The rotor of a helicopter or the propeller of a plane. */
  private readonly rotor: Phaser.GameObjects.Graphics | null = null;
  /** How many more bullets a vehicle takes, and the holes they have left in it. */
  private hull: number = VEHICLE_HULL;
  private readonly holes: Phaser.GameObjects.Graphics | null = null;
  /** The doll sitting in a vehicle, driving it. */
  private driver: Person | null = null;
  /** A monster: its head, how far out it is (0 to 1), and the time left until its next attack. */
  private readonly head: Phaser.GameObjects.Graphics | null = null;
  private headOut = 0;
  private zapWaitMs = 0;
  /** A trap: the blade that turns or the flames that flicker, and when it last hurt each doll. */
  private readonly blade: Phaser.GameObjects.Graphics | null = null;
  private readonly flames: Phaser.GameObjects.Graphics | null = null;
  private readonly lastHurt = new WeakMap<Person, number>();
  /** An electric thing hit by lightning: time left of going haywire, and until its next spark. */
  private haywireMs = 0;
  private sparkWaitMs = 0;
  /**
   * Fallen onto something and leaning on it: the bottom corner it turned on, and how
   * far over it is (0 standing, a quarter turn flat).
   */
  private prop: { pivotX: number; angle: number } | null = null;
  /** How far over a fallen piece is drawn right now: the picture eases to where the piece is. */
  private tiltShown = Math.PI / 2;
  /** A vehicle fried by lightning: it smokes and never drives again. Some blow up later. */
  private fried = false;
  private smokeWaitMs = 0;
  private burnOutMs: number | null = null;
  /** A pool: its picture, drawn again every frame. A black hole: its rings, which turn. */
  private readonly waves: Phaser.GameObjects.Graphics | null = null;
  private readonly swirl: Phaser.GameObjects.Graphics | null = null;
  /** A trampoline that has just thrown something up: time left of being squashed. */
  private boingMs = 0;
  /** A tank: time left until its cannon can fire again. */
  private cannonWaitMs = 0;
  /** A boss: the bar that shows how much more it takes, and the waits between its moves. */
  private readonly bar: Phaser.GameObjects.Graphics | null = null;
  private stompWaitMs = 0;
  private smashWaitMs = 0;
  private hopMs = 0;

  constructor(scene: Phaser.Scene, kind: BlockKind, x: number, y: number) {
    super(x, y);
    this.def = BLOCKS[kind];
    const ghost = this.def.monster?.ghost;
    const { liquid, hole } = this.def;
    // A ghost, a pool and a black hole aren't solid: things go right into them
    this.solid = !ghost && !liquid && !hole;
    // A ghost, a flying saucer and a black hole hold themselves up in the air
    this.hovering = Boolean(ghost ?? this.def.monster?.saucer ?? hole);
    this.shape = { halfWidth: this.def.halfWidth, height: this.def.height };
    const { blast, drive } = this.def;
    this.usualActions = blast ? BARREL_ACTIONS : drive ? VEHICLE_ACTIONS : THING_ACTIONS;
    const { fill, dark, light } = this.def.colors;
    this.crumbs = [fill, dark, light];
    const blank = (): Phaser.GameObjects.Graphics => scene.make.graphics({}, false);
    const { monster } = this.def;
    const parts = [isVehicle(kind) ? drawVehicle(blank(), kind) : drawJunkOrPiece(blank(), kind)];
    const { hazard } = this.def;
    if (hazard?.blade) {
      // The blade goes behind its box, so that only the top of it sticks out
      this.blade = drawSawBlade(blank(), hazard.blade.radius).setPosition(0, -hazard.blade.up);
      parts.unshift(this.blade);
    }
    if (hazard?.flames) {
      this.flames = blank();
      parts.unshift(this.flames);
    }
    this.hull = drive?.hull ?? monster?.boss?.hull ?? VEHICLE_HULL;
    if (monster?.boss) {
      this.bar = blank().setPosition(0, -this.def.height - BOSS_BAR.up);
      parts.push(this.bar);
    }
    if (monster && !monster.head && !monster.ghost) {
      this.holes = blank();
      parts.push(this.holes);
    }
    if (monster?.head) {
      // The head goes behind the fridge, so that it comes up out of its top
      this.head = drawMonsterHead(blank(), monster.face, monster.head);
      this.head.setPosition(monster.head.x, -monster.head.inUp);
      this.head.setScale(monster.head.scale ?? 1);
      parts.unshift(this.head);
      this.holes = blank();
      parts.push(this.holes);
    }
    if (drive) {
      // The wheels are their own pictures, so that they can turn
      for (const x of drive.wheels.xs) {
        const wheel = drawWheel(blank(), drive.wheels.radius);
        this.wheels.push(wheel.setPosition(x, -drive.wheels.up));
      }
      this.holes = blank();
      parts.push(...this.wheels, this.holes);
      if (drive.rotor) {
        this.rotor = drawRotor(blank(), drive.rotor).setPosition(drive.rotor.x, -drive.rotor.up);
        parts.push(this.rotor);
      }
    }
    if (kind === 'tv' || monster?.body === 'tv') {
      this.screen = scene.make.graphics({}, false);
      parts.push(this.screen);
    }
    // A vehicle is drawn small and then made as big as it really is
    const picture = scene.make.container({ x: 0, y: 0 }, false).add(parts);
    picture.setScale(drive?.scale ?? 1);
    this.display = scene.add.container(x, y, [picture]).setDepth(DEPTH.block);
    if (ghost) this.display.setAlpha(ghost.alpha).setDepth(DEPTH.ghost);
    if (liquid) {
      this.waves = blank();
      picture.add(this.waves);
      this.display.setAlpha(liquid === 'water' ? WATER.alpha : LAVA.alpha).setDepth(DEPTH.liquid);
    }
    if (hole) {
      this.swirl = drawSwirl(blank(), this.def).setPosition(0, -this.def.height / 2);
      picture.add(this.swirl);
    }
    this.showHull();
  }

  get size(): PersonSize {
    return this.shape;
  }

  /** A vehicle that lightning has fried can't drive any more: it can only be thrown away. */
  get actions(): readonly ActionId[] {
    return this.fried ? WRECK_ACTIONS : this.usualActions;
  }

  override get gone(): boolean {
    return super.gone || this.exploded;
  }

  /** Does it go off with a blast when it is hit? */
  get explosive(): boolean {
    return this.blast !== undefined;
  }

  /**
   * The boxes others stand on and bump into: the one around it, or a flight of steps
   * up its slope when it leans on something.
   */
  get solidParts(): Box[] {
    if (!this.prop || this.fallen === 0) return [this.box];
    const { halfWidth, height } = this.def;
    const { pivotX, angle } = this.prop;
    const { stepHeight, maxSteps } = TOPPLE;
    return rampSteps(pivotX, this.y, this.fallen, halfWidth, height, angle, stepHeight, maxSteps);
  }

  /** A vehicle with a seat that nobody sits in, standing where a doll can get in. */
  get seatFree(): boolean {
    return this.def.drive?.seat !== undefined && this.driver === null && this.carries;
  }

  /** The doll sitting in it, or `null`. */
  get rider(): Person | null {
    return this.driver;
  }

  /** A trampoline has thrown something up: it is squashed flat for a moment. */
  boing(): void {
    this.boingMs = BOING.ms;
  }

  /** Which way a vehicle points: 1 right, -1 left. */
  get pointing(): Facing {
    return this.facing;
  }

  /** Does the driver sit on it (a motorbike) and not inside it? */
  get seatInFront(): boolean {
    return this.def.drive?.seat?.inFront ?? false;
  }

  /** Where the hips of the doll that sits in it are right now. */
  seatSpot(): Spot {
    const drive = this.def.drive;
    const seat = drive?.seat ?? { x: 0, up: 0 };
    const scale = drive?.scale ?? 1;
    return { x: this.x + this.facing * seat.x * scale, y: this.y - seat.up * scale };
  }

  /** A doll sits down in it: the vehicle drives off. */
  takeDriver(person: Person): void {
    this.driver = person;
    if (!this.fried) this.setDriving(true);
  }

  /** The doll in it has left: the vehicle stops. */
  dropDriver(): void {
    this.driver = null;
    this.setDriving(false);
  }

  /**
   * Switch a vehicle on or off. One that flies holds itself up in the air while it
   * is on, and sinks down slowly once it is off.
   */
  private setDriving(on: boolean): void {
    const flies = this.def.drive?.flies;
    this.driving = on;
    this.hovering = on && flies !== undefined;
    this.gravityScale = flies ? flies.sink : 1;
  }

  /** Make the doll in it get out, when the vehicle blows up or is taken away. */
  ejectDriver(): void {
    this.driver?.leaveSeat();
  }

  /**
   * Hit by a bullet at this spot. A barrel goes off at once. A vehicle gets a hole,
   * and the last bullet it can take blows it up.
   */
  shot(px: number, py: number, world: World): void {
    const { drive, monster, fragile } = this.def;
    if (fragile) {
      this.shatter(world);
      return;
    }
    if (!drive && !monster) {
      this.setOff(0);
      return;
    }
    if (this.exploded) return;
    this.hull -= 1;
    this.showHull();
    // The hole goes where the bullet hit, measured on its own drawing
    const scale = drive?.scale ?? 1;
    const across = this.def.halfWidth / scale;
    const tall = this.def.height / scale;
    const x = clamp(((px - this.x) * this.facing) / scale, -across, across);
    const y = clamp((py - this.y) / scale, -tall, 0);
    this.holes?.fillStyle(BULLET_HOLE.rim).fillCircle(x, y, BULLET_HOLE.radius + 1);
    this.holes?.fillStyle(BULLET_HOLE.color).fillCircle(x, y, BULLET_HOLE.radius);
    if (this.hull > 0) return;
    this.ejectDriver();
    this.exploded = true;
    if (this.blast) {
      world.explode(this, this.blast);
    } else {
      world.breakApart(this, 0, -200);
    }
  }

  /** Draw the bar above a boss: how much of what it can take is left. */
  private showHull(): void {
    const boss = this.def.monster?.boss;
    if (!this.bar || !boss) return;
    const { width, height, back, full, low, lowShare } = BOSS_BAR;
    const left = Math.max(0, this.hull) / boss.hull;
    this.bar.clear();
    this.bar.fillStyle(back);
    this.bar.fillRoundedRect(-width / 2 - 2, -2, width + 4, height + 4, 3);
    this.bar.fillStyle(left < lowShare ? low : full);
    this.bar.fillRect(-width / 2, 0, width * left, height);
  }

  /** Glass breaks into pieces with a crash. */
  private shatter(world: World): void {
    if (this.exploded) return;
    this.exploded = true;
    world.breakApart(this, 0, -120);
  }

  override throwAway(area: PlaceArea): void {
    this.ejectDriver();
    super.throwAway(area);
  }

  /**
   * Lightning has run into a vehicle: it starts to smoke and never drives again, and
   * some of them blow up a while later.
   */
  fry(): void {
    if (!this.def.drive || this.fried || this.exploded) return;
    this.fried = true;
    this.setDriving(false);
    const { explodeChance, explodeAfterMs } = THUNDER.fried;
    if (!this.blast || Math.random() >= explodeChance) return;
    this.burnOutMs = explodeAfterMs.min + Math.random() * (explodeAfterMs.max - explodeAfterMs.min);
  }

  /** Lightning has run into it: an electric thing goes haywire for this long. */
  goHaywire(ms: number): void {
    if (this.def.electric) this.haywireMs = ms;
  }

  /** Standing up, staying put, and tall enough to fall over onto its side. */
  get canTopple(): boolean {
    const { halfWidth, height } = this.def;
    return this.fallen === 0 && this.carries && isTall(halfWidth, height, TOPPLE.tallRatio);
  }

  /** A barrel that has been set off, or a vehicle that is driving, glows on its bubble. */
  isOn(action: ActionId): boolean {
    if (action === 'drive') return this.driving;
    return action === 'fuse' && this.fuseMs !== null;
  }

  /** Make a vehicle drive, or stop it again. */
  toggleDrive(): void {
    if (!this.def.drive || this.fried) return;
    this.setDriving(!this.driving);
  }

  /** Point a vehicle the other way. */
  turn(): void {
    this.facing = this.facing === 1 ? -1 : 1;
  }

  /** The blast it goes off with: a barrel's own, or a vehicle's when it is shot to bits. */
  private get blast(): BlastDef | undefined {
    return this.def.blast ?? this.def.drive?.blast ?? this.def.monster?.blast;
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
    const boss = this.def.monster?.boss;
    if (boss) {
      // A boss doesn't go up in one blast: it only takes a few hits from it
      this.hull -= boss.blastHits;
      this.showHull();
      if (this.hull > 0) return;
    }
    this.fuseMs = Math.min(this.fuseMs ?? ms, ms);
  }

  override grab(px: number, py: number): void {
    // Picked up, a leaning piece is simply a piece lying on its side
    this.layFlat();
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
    // Glass doesn't survive falling over
    if (this.def.fragile) {
      this.shatter(world);
      return;
    }
    const lying = toppled({ x: this.x, ...this.shape }, direction);
    // What it falls onto: a block stops it half way, and it stays leaning there
    const pivotX = this.x + direction * this.def.halfWidth;
    const angle = leanAngle(pivotX, this.y, direction, this.def.height, this.inTheWay(world));
    if (angle < Math.PI / 2 - TOPPLE.flatSlack) {
      // On its way down already, so that what it knocks over doesn't knock it over in turn
      this.fallen = direction;
      world.shove(boxAround(lying.x, this.y, lying.halfWidth, lying.height), direction);
      if (angle < TOPPLE.minLean) {
        // Hardly any room to fall: it stays standing
        this.fallen = 0;
        return;
      }
      this.tiltShown = 0;
      this.slideSpeed = 0;
      this.leanAt(pivotX, angle);
      return;
    }
    this.tipping = { fromX: this.x, fromY: this.y, ms: 0 };
    this.tiltShown = Math.PI / 2;
    this.fallen = direction;
    this.shape = { halfWidth: lying.halfWidth, height: lying.height };
    const { left, right } = world.area;
    this.x = clamp(lying.x, left + lying.halfWidth, right - lying.halfWidth);
    this.slideSpeed = 0;
    world.shove(this.box, direction);
    this.y = liftOut(this.box, world.solidBoxes(this));
  }

  /** Everything a falling piece can come to lean on: the other pieces, and the sides of the area. */
  private inTheWay(world: World): Box[] {
    const { left, right, top, floorY } = world.area;
    const wall = { top: top - this.def.height, bottom: floorY };
    return [
      ...world.pieces(this),
      { ...wall, left: left - 1, right: left },
      { ...wall, left: right, right: right + 1 },
    ];
  }

  /** Lean this far over, around the corner at `pivotX`. */
  private leanAt(pivotX: number, angle: number): void {
    if (this.fallen === 0) return;
    const { halfWidth, height } = this.def;
    const shape = leaningShape(pivotX, this.fallen, halfWidth, height, angle);
    this.x = shape.x;
    this.shape = { halfWidth: shape.halfWidth, height: shape.height };
    this.prop = { pivotX, angle };
  }

  /** What it leaned on is gone, or it was picked up: from now on it lies flat on its side. */
  private layFlat(): void {
    if (!this.prop || this.fallen === 0) return;
    this.leanAt(this.prop.pivotX, Math.PI / 2);
    this.prop = null;
  }

  /**
   * A leaning piece stays where it is as long as it is held up. When what it leans
   * on moves away it comes down further, onto the next thing or flat onto the floor.
   */
  private holdLean(world: World, state: BodyState): void {
    if (!this.prop || this.fallen === 0) return;
    if (state !== 'resting') {
      this.layFlat();
      return;
    }
    const { pivotX, angle } = this.prop;
    const from = angle - TOPPLE.flatSlack;
    const now = leanAngle(pivotX, this.y, this.fallen, this.def.height, this.inTheWay(world), from);
    if (now >= Math.PI / 2 - TOPPLE.flatSlack) this.layFlat();
    else if (now !== angle) this.leanAt(pivotX, now);
  }

  /** A fried vehicle smokes, and maybe blows up in the end. */
  private smolder(deltaMs: number, world: World): void {
    if (!this.fried || this.exploded) return;
    this.smokeWaitMs -= deltaMs;
    if (this.smokeWaitMs <= 0) {
      this.smokeWaitMs = THUNDER.fried.smokeEveryMs;
      world.smoke(this.x + this.facing * this.shape.halfWidth * 0.45, this.y - this.shape.height);
    }
    if (this.burnOutMs === null || !this.blast) return;
    this.burnOutMs -= deltaMs;
    if (this.burnOutMs > 0) return;
    this.ejectDriver();
    this.exploded = true;
    world.explode(this, this.blast);
  }

  update(deltaMs: number, world: World): void {
    this.clockMs += deltaMs;
    const state = this.physics(deltaMs, world);
    this.holdLean(world, state);
    this.smolder(deltaMs, world);
    // A flying machine can be switched on in the air too, while it is sinking
    if (state === 'resting' || (state === 'falling' && this.def.drive?.flies)) {
      this.drive(deltaMs, world);
    }
    this.spinRotor();
    this.hunt(deltaMs, world, state);
    this.haunt(deltaMs, world, state);
    this.patrol(deltaMs, world, state);
    this.rampage(deltaMs, world, state);
    this.flow(deltaMs, world, state);
    this.trap(deltaMs, world, state);
    const steady = this.tipping !== null || this.prop !== null;
    const balancing = this.solid && !this.hovering && state === 'resting' && !steady;
    const tip = balancing ? this.keepBalance(deltaMs, world) : 0;
    if (tip === 0) this.slideSpeed = 0;
    this.lean += (tip * TOPPLE.lean - this.lean) * Math.min(1, deltaMs / TOPPLE.leanMs);
    this.draw(state, deltaMs);
    this.fizz(deltaMs, world);
    if (this.screen && this.haywireMs > 0) drawTvHaywire(this.screen, this.clockMs);
    else if (this.screen) drawTvProgram(this.screen, this.clockMs);

    if (this.fuseMs === null || !this.blast) return;
    this.fuseMs -= deltaMs;
    // It blinks while its fuse burns
    this.display.setAlpha(Math.floor(this.fuseMs / BLAST.blinkMs) % 2 === 0 ? 1 : 0.55);
    if (this.fuseMs <= 0) {
      this.ejectDriver();
      this.exploded = true;
      world.explode(this, this.blast);
    }
  }

  bringToTop(): void {
    this.display.scene.children.bringToTop(this.display);
  }

  destroy(): void {
    this.display.destroy();
  }

  /**
   * A vehicle that is switched on drives the way it points. It turns back at the
   * edge of the area and at anything solid (and knocks tall pieces over), carries
   * what stands on it, and knocks down the dolls it drives into.
   */
  private drive(deltaMs: number, world: World): void {
    const drive = this.def.drive;
    if (!drive || !this.driving) return;
    const { halfWidth, height } = this.shape;
    if (drive.flies) {
      // Climb to where it flies: its top a little under the ceiling
      this.hovering = true;
      const flyAt = world.area.top + drive.flies.below + height;
      const step = drive.flies.climb * (deltaMs / 1000);
      this.y += clamp(flyAt - this.y, -step, step);
    }
    const from = this.x;
    const wanted = from + this.facing * drive.speed * (deltaMs / 1000);
    const inside = clamp(wanted, world.area.left + halfWidth, world.area.right - halfWidth);
    this.x = blockedX(from, inside, halfWidth, this.y, height, world.pieces(this), 0);
    const moved = this.x - from;
    for (const wheel of this.wheels) {
      wheel.rotation += (moved * this.facing) / (drive.wheels.radius * drive.scale);
    }
    world.carry(this, moved);
    if (this.x !== wanted) {
      world.shove(this.box, this.facing);
      this.turn();
    }
    this.fireCannon(deltaMs, world);

    for (const person of world.people) {
      if (!person.canBeHit || !overlaps(this.box, person.box)) continue;
      const solids = world.solidBoxes(person);
      const deadly = person.hit(this.facing, solids, drive.damage, drive.pushSpeed, 'bruise');
      world.hitEffect(person.feet.x, person.feet.y - PERSON.height / 2, deadly, 'punch');
    }
  }

  /**
   * A tank's cannon fires at the closest doll in front of it: a shell that goes off
   * where it hits. It leaves the dolls of its driver's color alone.
   */
  private fireCannon(deltaMs: number, world: World): void {
    const drive = this.def.drive;
    const cannon = drive?.cannon;
    if (!drive || !cannon) return;
    this.cannonWaitMs = Math.max(0, this.cannonWaitMs - deltaMs);
    if (this.cannonWaitMs > 0) return;
    const fromX = this.x + this.facing * cannon.x * drive.scale;
    const fromY = this.y - cannon.up * drive.scale;
    let target: { x: number; y: number } | null = null;
    let closest: number = cannon.gun.range;
    for (const person of world.people) {
      if (person.dead || person.seated || !person.canBePicked) continue;
      const body = person.hitBox;
      const atX = (body.left + body.right) / 2;
      const ahead = (atX - this.x) * this.facing;
      if (ahead < cannon.tooClose + this.shape.halfWidth || ahead >= closest) continue;
      target = { x: atX, y: (body.top + body.bottom) / 2 };
      closest = ahead;
    }
    if (!target) return;
    this.cannonWaitMs = cannon.gun.everyMs;
    const aim = aimAt(fromX, fromY, target.x, target.y, this.facing);
    world.shoot(this.driver, fromX, fromY, this.facing, cannon.gun, aim, this);
  }

  /**
   * A boss goes for the closest living doll. It stomps every doll that is near it,
   * shoots its laser at the one it is after when nothing is in the way, and smashes
   * the things that are.
   */
  private rampage(deltaMs: number, world: World, state: BodyState): void {
    const monster = this.def.monster;
    const boss = monster?.boss;
    if (!monster || !boss) return;
    this.zapWaitMs = Math.max(0, this.zapWaitMs - deltaMs);
    this.stompWaitMs = Math.max(0, this.stompWaitMs - deltaMs);
    this.smashWaitMs = Math.max(0, this.smashWaitMs - deltaMs);
    this.hopMs = Math.max(0, this.hopMs - deltaMs);
    if (state !== 'resting') return;
    const eyesY = this.y - boss.eyes.up;
    const victim = this.closestDoll(world, eyesY, monster.range, null, false);
    if (!victim) return;

    const body = victim.hitBox;
    const atX = (body.left + body.right) / 2;
    const atY = (body.top + body.bottom) / 2;
    this.facing = atX < this.x ? -1 : 1;
    const { halfWidth, height } = this.shape;
    const pieces = world.pieces(this);
    const own = this.box;
    const near = {
      left: own.left - boss.reach,
      right: own.right + boss.reach,
      top: own.top,
      bottom: own.bottom + 2,
    };

    if (!overlaps(near, body)) {
      // Walk toward the doll, and smash what stands in the way
      const from = this.x;
      const wanted = from + this.facing * monster.speed * (deltaMs / 1000);
      const inside = clamp(wanted, world.area.left + halfWidth, world.area.right - halfWidth);
      this.x = blockedX(from, inside, halfWidth, this.y, height, pieces, PHYSICS.stepUp);
      world.carry(this, this.x - from);
      if (this.x !== inside && this.smashWaitMs <= 0) {
        const thing = world
          .things(this)
          .find(
            (other) => other instanceof Block && !other.def.monster && overlaps(near, other.box),
          );
        if (thing) {
          this.smashWaitMs = boss.smashEveryMs;
          this.hopMs = boss.stomp.hopMs;
          world.smash(thing, this.facing);
        }
      }
    }

    if (this.stompWaitMs <= 0) {
      const underFoot = world.people.filter(
        (person) =>
          !person.dead && !person.seated && person.canBePicked && overlaps(near, person.hitBox),
      );
      if (underFoot.length > 0) {
        this.stompWaitMs = boss.stomp.everyMs;
        this.hopMs = boss.stomp.hopMs;
        world.quake();
        for (const person of underFoot) {
          const away: Facing = person.feet.x < this.x ? -1 : 1;
          const solids = world.solidBoxes(person);
          const { damage, pushSpeed } = boss.stomp;
          const deadly = person.hit(away, solids, damage, pushSpeed, 'bruise');
          const box = person.hitBox;
          world.hitEffect((box.left + box.right) / 2, (box.top + box.bottom) / 2, deadly, 'punch');
        }
        return;
      }
    }

    const eyesX = this.x + this.facing * boss.eyes.x;
    if (this.zapWaitMs > 0 || segmentHit(eyesX, eyesY, atX, atY, pieces) !== null) return;
    this.zapWaitMs = monster.everyMs;
    world.zap(eyesX, eyesY, victim, monster.damage, monster.pushSpeed);
  }

  /**
   * The closest doll a monster can go after, or `null`. Nothing solid may hide it when
   * `sight` is given, and only one that bites goes after dolls that are dead already.
   */
  private closestDoll(
    world: World,
    fromY: number,
    range: number,
    sight: readonly Box[] | null,
    deadToo: boolean,
  ): Person | null {
    let victim: Person | null = null;
    let closest = range;
    for (const person of world.people) {
      if (person.seated || !person.canBePicked || (person.dead && !deadToo)) continue;
      const body = person.hitBox;
      const atX = (body.left + body.right) / 2;
      const atY = (body.top + body.bottom) / 2;
      const distance = Math.hypot(atX - this.x, atY - fromY);
      if (distance >= closest) continue;
      if (sight && segmentHit(this.x, fromY, atX, atY, sight) !== null) continue;
      victim = person;
      closest = distance;
    }
    return victim;
  }

  /**
   * A monster is always angry. It looks for the closest doll, pops its head out and
   * scoots toward the doll. One with a laser zaps the doll from its eyes as soon as it
   * sees it; one that bites runs all the way there and swallows the doll whole.
   * With nobody around its head bobs up and down, peeking.
   */
  private hunt(deltaMs: number, world: World, state: BodyState): void {
    const monster = this.def.monster;
    const head = monster?.head;
    if (!monster || !head || !this.head) return;
    this.zapWaitMs = Math.max(0, this.zapWaitMs - deltaMs);
    if (this.haywireMs > 0) {
      // Haywire: its head pops out and shakes wildly, and it can't do anything else
      const { sway, ms } = THUNDER.headShake;
      this.headOut += (1 - this.headOut) * Math.min(1, deltaMs / head.popMs);
      this.head.y = -(head.inUp + (head.outUp - head.inUp) * this.headOut);
      this.head.rotation = sway * Math.sin(this.clockMs / ms);
      return;
    }
    const bites = monster.attack === 'bite';
    const eyesUp = SKIBIDI.eyes.up * (head.scale ?? 1);
    const eyesY = this.y - head.outUp - eyesUp;
    const pieces = world.pieces(this);
    const awake = state === 'resting' && this.fallen === 0;
    // One that bites smells the dolls through walls, and eats the dead ones too
    const victim = awake
      ? this.closestDoll(world, eyesY, monster.range, bites ? null : pieces, bites)
      : null;

    const chewing = bites && this.zapWaitMs > 0;
    const peeking = 0.3 + 0.3 * Math.sin(this.clockMs / 420);
    const chew = 0.55 + 0.45 * Math.sin((this.clockMs / CHOMPER.chewMs) * Math.PI * 2);
    const wanted = chewing ? chew : victim ? 1 : awake ? peeking : 0;
    this.headOut += (wanted - this.headOut) * Math.min(1, deltaMs / head.popMs);
    this.head.y = -(head.inUp + (head.outUp - head.inUp) * this.headOut);
    this.head.rotation = SKIBIDI.sway * Math.sin(this.clockMs / SKIBIDI.swayMs);
    // It stands still while it chews what it has just swallowed
    if (chewing) return;
    if (!victim) {
      if (awake && !bites) this.smash(monster.range, eyesY, world);
      return;
    }

    // Face the doll and scoot toward it
    const target = victim.feet;
    this.facing = target.x < this.x ? -1 : 1;
    const { halfWidth, height } = this.shape;
    const from = this.x;
    const step = this.facing * monster.speed * (deltaMs / 1000);
    const goal = bites
      ? clamp(target.x, from - Math.abs(step), from + Math.abs(step))
      : from + step;
    const inside = clamp(goal, world.area.left + halfWidth, world.area.right - halfWidth);
    this.x = blockedX(from, inside, halfWidth, this.y, height, pieces, 0);
    world.carry(this, this.x - from);

    if (bites) {
      const own = this.box;
      const mouth = { ...own, left: own.left - CHOMPER.reach, right: own.right + CHOMPER.reach };
      if (!overlaps(mouth, victim.hitBox)) return;
      this.zapWaitMs = monster.everyMs;
      world.swallow(this, victim);
      return;
    }
    if (this.zapWaitMs > 0 || this.headOut < 0.9) return;
    this.zapWaitMs = monster.everyMs;
    const eyesX = this.x + this.facing * (head.x + SKIBIDI.eyes.x * (head.scale ?? 1));
    world.zap(eyesX, eyesY, victim, monster.damage, monster.pushSpeed);
  }

  /**
   * A ghost floats straight toward the closest living doll, through walls and all.
   * When it gets there it scares the doll, which falls over and loses a life.
   */
  private haunt(deltaMs: number, world: World, state: BodyState): void {
    const monster = this.def.monster;
    if (!monster?.ghost) return;
    this.zapWaitMs = Math.max(0, this.zapWaitMs - deltaMs);
    if (state !== 'resting') return;
    const { halfWidth, height } = this.shape;
    const victim = this.closestDoll(world, this.y - height / 2, monster.range, null, false);
    if (!victim) return;

    const body = victim.hitBox;
    const atX = (body.left + body.right) / 2;
    const atY = (body.top + body.bottom) / 2;
    if (Math.abs(atX - this.x) > 1) this.facing = atX < this.x ? -1 : 1;
    const next = floatStep(this.x, this.y, atX, atY + height / 2, monster.speed, deltaMs);
    const { left, right, top, floorY } = world.area;
    this.x = clamp(next.x, left + halfWidth, right - halfWidth);
    this.y = clamp(next.y, top + height, floorY);

    if (this.zapWaitMs > 0 || !overlaps(this.box, body)) return;
    this.zapWaitMs = monster.everyMs;
    const solids = world.solidBoxes(victim);
    const { bite } = monster.ghost;
    const wound = bite ? 'stab' : 'bruise';
    const deadly = victim.hit(this.facing, solids, monster.damage, monster.pushSpeed, wound);
    world.hitEffect(atX, atY, deadly, bite ? 'punch' : 'none');
    if (!bite) world.spook();
  }

  /**
   * A flying saucer climbs up under the ceiling and flies over the closest living doll
   * it can see. Once it is above the doll it shoots its laser straight down at it.
   * With no doll in sight it burns up everything else, like the skibidis do.
   */
  private patrol(deltaMs: number, world: World, state: BodyState): void {
    const monster = this.def.monster;
    const saucer = monster?.saucer;
    if (!monster || !saucer) return;
    this.zapWaitMs = Math.max(0, this.zapWaitMs - deltaMs);
    if (state !== 'resting') return;
    const { halfWidth, height } = this.shape;
    const { left, right, top } = world.area;
    const pieces = world.pieces(this);
    const climb = monster.speed * (deltaMs / 1000);
    this.y += clamp(top + saucer.below + height - this.y, -climb, climb);

    const victim = this.closestDoll(world, this.y, monster.range, pieces, false);
    if (!victim) {
      this.smash(monster.range, this.y, world);
      return;
    }
    const body = victim.hitBox;
    const atX = (body.left + body.right) / 2;
    const from = this.x;
    const next = floatStep(from, 0, atX, 0, monster.speed, deltaMs).x;
    const inside = clamp(next, left + halfWidth, right - halfWidth);
    this.x = blockedX(from, inside, halfWidth, this.y, height, pieces, 0);
    world.carry(this, this.x - from);

    if (this.zapWaitMs > 0 || Math.abs(atX - this.x) > saucer.aim) return;
    this.zapWaitMs = monster.everyMs;
    world.zap(this.x, this.y, victim, monster.damage, monster.pushSpeed);
  }

  /**
   * A pool keeps moving: waves roll over water, lava glows and bubbles, and lava
   * burns up the loose items that get into it. A black hole keeps turning.
   */
  private flow(deltaMs: number, world: World, state: BodyState): void {
    const { liquid, hole } = this.def;
    if (this.swirl && hole) this.swirl.rotation += hole.spin * (deltaMs / 1000);
    if (!this.waves || !liquid) return;
    drawLiquid(this.waves.clear(), liquid, this.clockMs, this.def);
    if (liquid !== 'lava' || state !== 'resting') return;
    const own = this.box;
    for (const thing of world.things(this)) {
      if (!(thing instanceof Block) && overlaps(own, thing.box)) world.burn(thing);
    }
  }

  /** While it is haywire, sparks keep flying off it. */
  private fizz(deltaMs: number, world: World): void {
    if (this.haywireMs <= 0) return;
    this.haywireMs -= deltaMs;
    this.sparkWaitMs -= deltaMs;
    if (this.sparkWaitMs > 0) return;
    this.sparkWaitMs = THUNDER.sparkEveryMs;
    const { halfWidth, height } = this.shape;
    world.spark(this.x + (Math.random() * 2 - 1) * halfWidth, this.y - Math.random() * height);
  }

  /**
   * A trap hurts the dolls. Most get every doll that touches them, again and again;
   * a lightning coil shoots at the closest doll around; a mine blows up when a doll
   * touches it. Its blade keeps turning and its flames keep flickering.
   */
  private trap(deltaMs: number, world: World, state: BodyState): void {
    const hazard = this.def.hazard;
    if (!hazard) return;
    if (this.blade && hazard.blade) this.blade.rotation += hazard.blade.speed * (deltaMs / 1000);
    if (this.flames && hazard.flames) {
      const { halfWidth, height } = this.def;
      drawFlames(this.flames.clear(), this.clockMs, halfWidth, -height, hazard.flames.height);
    }
    if (state === 'flying') return;
    const own = this.box;

    if (hazard.kind === 'zap') {
      this.zapWaitMs = Math.max(0, this.zapWaitMs - deltaMs);
      if (this.zapWaitMs > 0 || this.fallen !== 0 || state !== 'resting') return;
      const ballY = own.top + TESLA.ballDown;
      const victim = this.closestDoll(world, ballY, hazard.range ?? 0, null, false);
      if (!victim) return;
      this.zapWaitMs = hazard.everyMs;
      world.zap(this.x, ballY, victim, hazard.damage, hazard.pushSpeed, true);
      return;
    }

    const zone = {
      left: own.left - hazard.side,
      right: own.right + hazard.side,
      top: own.top - hazard.up,
      bottom: own.bottom,
    };
    for (const person of world.people) {
      if (person.seated || !person.canBePicked) continue;
      const body = person.hitBox;
      if (!overlaps(zone, body)) continue;
      if (person.dead) {
        // Fire burns what is left of a doll down to its bones
        if (hazard.kind === 'touch' && hazard.wound === 'burn') person.scorch();
        continue;
      }
      if (hazard.kind === 'mine') {
        if (state === 'resting') this.setOff(0);
        return;
      }
      if (this.clockMs - (this.lastHurt.get(person) ?? -Infinity) < hazard.everyMs) continue;
      this.lastHurt.set(person, this.clockMs);
      const away: Facing = person.feet.x < this.x ? -1 : 1;
      const solids = world.solidBoxes(person);
      const deadly = person.hit(away, solids, hazard.damage, hazard.pushSpeed, hazard.wound);
      const atX = (body.left + body.right) / 2;
      world.hitEffect(atX, (body.top + body.bottom) / 2, deadly, hazard.sound);
    }
  }

  /**
   * With no doll in sight, a monster zaps whatever else is closest: building pieces,
   * junk, vehicles and loose items. Not other monsters. The laser comes from its eyes,
   * or from the belly of one that has no head.
   */
  private smash(range: number, eyesY: number, world: World): void {
    const head = this.def.monster?.head;
    if (this.zapWaitMs > 0) return;
    let thing: Body | null = null;
    let closest = range;
    for (const other of world.things(this)) {
      if (other instanceof Block && other.def.monster) continue;
      const box = other.box;
      const atX = (box.left + box.right) / 2;
      const atY = (box.top + box.bottom) / 2;
      const distance = Math.hypot(atX - this.x, atY - eyesY);
      if (distance >= closest) continue;
      thing = other;
      closest = distance;
    }
    if (!thing) return;
    this.zapWaitMs = this.def.monster?.everyMs ?? 0;
    this.facing = thing.feet.x < this.x ? -1 : 1;
    const ahead = head ? head.x + SKIBIDI.eyes.x * (head.scale ?? 1) : 0;
    world.zapThing(this.x + this.facing * ahead, eyesY, thing);
  }

  /**
   * A rotor seen from the side looks like a bar that gets short and long again as it
   * goes around. It flickers fast while the machine is on.
   */
  private spinRotor(): void {
    const rotor = this.def.drive?.rotor;
    if (!this.rotor || !rotor) return;
    // Switched off, it stands still
    const seen = this.driving ? Math.max(0.12, Math.abs(Math.cos(this.clockMs / ROTOR.turnMs))) : 1;
    this.rotor.setScale(rotor.flat ? seen : 1, rotor.flat ? 1 : seen);
  }

  /**
   * Gravity: its heavy middle has to be over what holds it up. If it isn't, a tall
   * piece falls over that way, and any other piece slides off that way, faster and
   * faster. Says which way it is going: -1 left, 1 right, 0 when it is balanced.
   */
  private keepBalance(deltaMs: number, world: World): Facing | 0 {
    const solids = world.solidBoxes(this);
    const span = supportSpan(this.box, solids, world.area.floorY, PHYSICS.groundSlack);
    const { give, longRatio, longShare } = TOPPLE;
    const out = overhang(this.shape.halfWidth, this.shape.height, give, longRatio, longShare);
    const tip = span === 'floor' || span === null ? 0 : leaning(this.x, span, out);
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
    // A piece that has fallen is drawn turned around the bottom corner it fell over:
    // a quarter turn when it lies flat, less when it leans on something
    const target = this.prop?.angle ?? Math.PI / 2;
    this.tiltShown += (target - this.tiltShown) * Math.min(1, deltaMs / TOPPLE.settleMs);
    const tilt = this.fallen === 0 ? 0 : this.tiltShown;
    const { halfWidth, height } = this.def;
    const pivotX = this.prop?.pivotX ?? this.x - this.fallen * (height / 2);
    // A ghost bobs up and down in the air
    const ghost = this.def.monster?.ghost;
    const floats =
      ghost && state === 'resting' ? ghost.bob * Math.sin(this.clockMs / ghost.bobMs) : 0;
    // A boss hops when it stomps or smashes something
    const stomp = this.def.monster?.boss?.stomp;
    const hop = stomp ? stomp.hop * Math.sin((this.hopMs / stomp.hopMs) * Math.PI) : 0;
    const bob = floats - hop;
    this.display.setPosition(
      this.fallen === 0 ? this.x : pivotX - this.fallen * halfWidth * Math.cos(tilt),
      (this.fallen === 0 ? this.y : this.y - halfWidth * Math.sin(tilt)) + bob,
    );
    this.display.rotation = this.fallen * tilt + (state === 'flying' ? this.spin : this.lean);
    if (this.haywireMs > 0 && state === 'resting') {
      // A haywire thing shakes on the spot
      const shake = (): number => (Math.random() * 2 - 1) * THUNDER.jitter;
      this.display.setPosition(this.display.x + shake(), this.display.y + shake());
    }
    // A bat flaps its wings: its picture is squeezed flat and let go again, fast
    const flapMs = ghost?.flapMs;
    const flap = flapMs ? 1 - 0.35 * Math.abs(Math.sin((this.clockMs / flapMs) * Math.PI)) : 1;
    // A trampoline is squashed flat for a moment when it throws something up
    this.boingMs = Math.max(0, this.boingMs - deltaMs);
    const squash = 1 - BOING.squash * Math.sin((this.boingMs / BOING.ms) * Math.PI);
    this.display.setScale(this.facing, flap * squash);
  }
}

type Graphics = Phaser.GameObjects.Graphics;

function isVehicle(kind: BlockKind): kind is VehicleKind {
  return BLOCKS[kind].drive !== undefined;
}

function isElement(kind: BlockKind): kind is ElementKind {
  return BLOCKS[kind].liquid !== undefined || BLOCKS[kind].hole !== undefined;
}

function isTrap(kind: BlockKind): kind is TrapKind {
  return BLOCKS[kind].hazard !== undefined && !isElement(kind);
}

/**
 * Draws a piece for the area. A monster that lives in a piece of junk gets that piece
 * only: its head is a picture of its own, so that it can pop in and out.
 */
function drawJunkOrPiece(g: Graphics, kind: BlockKind): Graphics {
  if (isElement(kind)) return drawElement(g, kind, false);
  if (isTrap(kind)) return drawTrap(g, kind, false);
  const body = BLOCKS[kind].monster?.body;
  return body ? drawJunk(g, body) : drawBlock(g, kind);
}

/** Draws a building piece with code. The middle of its bottom edge is at (0, 0). */
export function drawBlock(g: Graphics, kind: BlockKind): Graphics {
  if (isVehicle(kind)) return drawParkedVehicle(g, kind);
  if (isElement(kind)) return drawElement(g, kind, true);
  if (isTrap(kind)) return drawTrap(g, kind, true);
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
    case 'glass':
      return drawGlass(g, BLOCKS.glass);
    case 'tnt':
      return drawTnt(g, BLOCKS.tnt);
    case 'pillar':
      return drawPillar(g, BLOCKS.pillar);
    case 'trampoline':
      return drawTrampoline(g, BLOCKS.trampoline);
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

/** A pane of glass: you can see through it, and light streaks across it. */
function drawGlass(g: Graphics, def: BlockDef): Graphics {
  const { halfWidth, height, colors } = def;
  const width = halfWidth * 2;
  const left = -halfWidth;
  const top = -height;

  g.fillStyle(colors.fill, 0.45);
  g.fillRect(left, top, width, height);
  g.fillStyle(colors.light, 0.75);
  g.fillRect(left + 2, top + 4, 2.5, height - 8);
  g.lineStyle(1.2, colors.detail, 0.8);
  for (const y of [top + 22, top + 30, top + 78]) {
    g.lineBetween(left + 6, y, halfWidth - 2, y - 8);
  }
  g.lineStyle(1.5, colors.dark, 0.9);
  g.strokeRect(left, top, width, height);
  return g;
}

/** A red crate of explosives with a pale label that says TNT, and a short fuse. */
function drawTnt(g: Graphics, def: BlockDef): Graphics {
  const { halfWidth, height, colors } = def;
  const width = halfWidth * 2;
  const left = -halfWidth;
  const top = -height;

  g.lineStyle(2, colors.detail);
  g.lineBetween(9, top + 1, 13, top - 6);
  g.fillStyle(colors.dark);
  g.fillRoundedRect(left, top, width, height, 4);
  g.fillStyle(colors.fill);
  g.fillRoundedRect(left + 2, top + 2, width - 4, height - 4, 3);
  bevel(g, left + 3, top + 2, width - 6, height - 4, def);

  // The label, with the three letters drawn as lines
  const labelTop = top + height / 2 - 9;
  g.fillStyle(colors.detail);
  g.fillRect(left + 5, labelTop, width - 10, 18);
  const letterTop = labelTop + 3.5;
  const letterBottom = letterTop + 11;
  g.lineStyle(2.4, colors.dark);
  for (const x of [-17, 8]) {
    g.lineBetween(x, letterTop, x + 9, letterTop);
    g.lineBetween(x + 4.5, letterTop, x + 4.5, letterBottom);
  }
  g.lineBetween(-4.5, letterBottom, -4.5, letterTop);
  g.lineBetween(-4.5, letterTop, 4.5, letterBottom);
  g.lineBetween(4.5, letterBottom, 4.5, letterTop);
  return g;
}

/** A tall concrete pillar: a round shaft with grooves, on a wide foot and under a wide top. */
function drawPillar(g: Graphics, def: BlockDef): Graphics {
  const { halfWidth, height, colors } = def;
  const width = halfWidth * 2;
  const left = -halfWidth;
  const top = -height;
  const end = 9;

  // Shaft: light on the left, shadow on the right, grooves down its length
  g.fillStyle(colors.dark);
  g.fillRect(left + 2, top + end, width - 4, height - end * 2);
  g.fillStyle(colors.fill);
  g.fillRect(left + 3.5, top + end, width - 7, height - end * 2);
  g.fillStyle(colors.light, 0.7);
  g.fillRect(left + 4.5, top + end, 3, height - end * 2);
  g.fillStyle(colors.detail, 0.55);
  g.fillRect(halfWidth - 8, top + end, 4.5, height - end * 2);
  g.lineStyle(1, colors.detail, 0.7);
  for (const x of [-3.5, 2.5]) {
    g.lineBetween(x, top + end + 3, x, -end - 3);
  }
  g.lineStyle(1.2, colors.dark, 0.7);
  g.lineBetween(left + 6, top + 52, left + 11, top + 61);
  g.lineBetween(left + 11, top + 61, left + 8, top + 68);

  // The wide top and foot
  for (const y of [top, -end]) {
    g.fillStyle(colors.dark);
    g.fillRoundedRect(left, y, width, end, 2);
    g.fillStyle(colors.fill);
    g.fillRoundedRect(left + 1.3, y + 1.3, width - 2.6, end - 2.6, 1.5);
    g.fillStyle(colors.light, 0.8);
    g.fillRect(left + 2.5, y + 1.5, width - 5, 1.6);
  }
  return g;
}

/** A trampoline: a dark, springy mat in a blue padded frame, on bent metal legs. */
function drawTrampoline(g: Graphics, def: BlockDef): Graphics {
  const { halfWidth, height, colors } = def;
  const left = -halfWidth;
  const top = -height;

  // Legs: two bent tubes
  g.lineStyle(3.5, shade(colors.detail, 0.55));
  for (const side of [-1, 1]) {
    const x = side * (halfWidth - 12);
    g.lineBetween(x, top + 7, x + side * 7, 0);
    g.lineBetween(x - side * 12, top + 7, x - side * 5, -1);
  }
  g.lineBetween(-halfWidth + 5, -1, halfWidth - 5, -1);
  // The springs between the frame and the mat
  g.lineStyle(1.5, colors.light);
  for (let x = left + 9; x < halfWidth - 8; x += 7) {
    g.lineBetween(x, top + 5, x + 2.5, top + 9);
  }
  // Frame and mat
  g.fillStyle(colors.dark);
  g.fillRoundedRect(left, top, halfWidth * 2, 9, 4.5);
  g.fillStyle(colors.fill);
  g.fillRoundedRect(left + 1.5, top + 1.5, halfWidth * 2 - 3, 6, 3);
  g.fillStyle(colors.light, 0.8);
  g.fillRoundedRect(left + 5, top + 2.3, halfWidth * 2 - 10, 1.6, 0.8);
  g.fillStyle(colors.detail);
  g.fillRoundedRect(left + 12, top + 1.5, halfWidth * 2 - 24, 4.5, 2);
  return g;
}
