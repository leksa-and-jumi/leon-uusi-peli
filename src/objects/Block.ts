import type Phaser from 'phaser';
import {
  BARREL_ACTIONS,
  BLAST,
  BLOCK_LOOK,
  BLOCKS,
  BULLET_HOLE,
  DEPTH,
  PERSON,
  ROTOR,
  PHYSICS,
  SKIBIDI,
  THING_ACTIONS,
  TOPPLE,
  VEHICLE_ACTIONS,
  VEHICLE_HULL,
  type ActionId,
  type BlastDef,
  type BlockDef,
  type BlockKind,
  type VehicleKind,
} from '../config';
import { isTall, leaning, supportSpan, toppled, topplePose } from '../logic/balance';
import { clamp } from '../logic/bounds';
import { shade } from '../logic/color';
import { blockedX, liftOut, overlaps } from '../logic/ground';
import { segmentHit } from '../logic/shot';
import type { Spot } from '../logic/pick';
import type { PersonSize, PlaceArea } from '../logic/place';
import type { Facing } from '../logic/walk';
import { Body, type BodyState } from './Body';
import type { Person } from './Person';
import { drawJunk, drawSkibidiHead } from './junkShapes';
import { drawTvProgram } from './tvScreen';
import { drawParkedVehicle, drawRotor, drawVehicle, drawWheel } from './vehicleShapes';
import type { World } from './World';

/**
 * Something solid: a building piece (crate, wall, plank, stone, steel beam, barrel) or
 * a piece of junk (toilet, TV, fridge and so on). They stack, and dolls can stand on
 * them. They have to balance: a piece whose middle isn't over what holds it up slides
 * off, and a tall one falls over onto its side. A barrel explodes when a bullet or a
 * blast hits it.
 */
export class Block extends Body {
  override readonly solid = true;
  readonly def: BlockDef;
  readonly actions: readonly ActionId[];
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
  /** A monster: its head, how far out it is (0 to 1), and the time left until its next laser. */
  private readonly head: Phaser.GameObjects.Graphics | null = null;
  private headOut = 0;
  private zapWaitMs = 0;

  constructor(scene: Phaser.Scene, kind: BlockKind, x: number, y: number) {
    super(x, y);
    this.def = BLOCKS[kind];
    this.shape = { halfWidth: this.def.halfWidth, height: this.def.height };
    const { blast, drive } = this.def;
    this.actions = blast ? BARREL_ACTIONS : drive ? VEHICLE_ACTIONS : THING_ACTIONS;
    const { fill, dark, light } = this.def.colors;
    this.crumbs = [fill, dark, light];
    const blank = (): Phaser.GameObjects.Graphics => scene.make.graphics({}, false);
    const { monster } = this.def;
    const parts = [isVehicle(kind) ? drawVehicle(blank(), kind) : drawJunkOrPiece(blank(), kind)];
    if (monster) {
      // The head goes behind the fridge, so that it comes up out of its top
      this.head = drawSkibidiHead(blank(), monster.head.radius);
      this.head.setPosition(0, -monster.head.inUp);
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
    if (kind === 'tv') {
      this.screen = scene.make.graphics({}, false);
      parts.push(this.screen);
    }
    // A vehicle is drawn small and then made as big as it really is
    const picture = scene.make.container({ x: 0, y: 0 }, false).add(parts);
    picture.setScale(drive?.scale ?? 1);
    this.display = scene.add.container(x, y, [picture]).setDepth(DEPTH.block);
  }

  get size(): PersonSize {
    return this.shape;
  }

  override get gone(): boolean {
    return super.gone || this.exploded;
  }

  /** Does it go off with a blast when it is hit? */
  get explosive(): boolean {
    return this.blast !== undefined;
  }

  /** A vehicle with a seat that nobody sits in, standing where a doll can get in. */
  get seatFree(): boolean {
    return this.def.drive?.seat !== undefined && this.driver === null && this.carries;
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
    this.setDriving(true);
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
    const { drive, monster } = this.def;
    if (!drive && !monster) {
      this.setOff(0);
      return;
    }
    if (this.exploded) return;
    this.hull -= 1;
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

  override throwAway(area: PlaceArea): void {
    this.ejectDriver();
    super.throwAway(area);
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
    if (!this.def.drive) return;
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
    this.fuseMs = Math.min(this.fuseMs ?? ms, ms);
  }

  override grab(px: number, py: number): void {
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
    const lying = toppled({ x: this.x, ...this.shape }, direction);
    this.tipping = { fromX: this.x, fromY: this.y, ms: 0 };
    this.fallen = direction;
    this.shape = { halfWidth: lying.halfWidth, height: lying.height };
    const { left, right } = world.area;
    this.x = clamp(lying.x, left + lying.halfWidth, right - lying.halfWidth);
    this.slideSpeed = 0;
    world.shove(this.box, direction);
    this.y = liftOut(this.box, world.solidBoxes(this));
  }

  update(deltaMs: number, world: World): void {
    this.clockMs += deltaMs;
    const state = this.physics(deltaMs, world);
    // A flying machine can be switched on in the air too, while it is sinking
    if (state === 'resting' || (state === 'falling' && this.def.drive?.flies)) {
      this.drive(deltaMs, world);
    }
    this.spinRotor();
    this.hunt(deltaMs, world, state);
    const tip = state === 'resting' && !this.tipping ? this.keepBalance(deltaMs, world) : 0;
    if (tip === 0) this.slideSpeed = 0;
    this.lean += (tip * TOPPLE.lean - this.lean) * Math.min(1, deltaMs / TOPPLE.leanMs);
    this.draw(state, deltaMs);
    if (this.screen) drawTvProgram(this.screen, this.clockMs);

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

    for (const person of world.people) {
      if (!person.canBeHit || !overlaps(this.box, person.box)) continue;
      const solids = world.solidBoxes(person);
      const deadly = person.hit(this.facing, solids, drive.damage, drive.pushSpeed, 'bruise');
      world.hitEffect(person.feet.x, person.feet.y - PERSON.height / 2, deadly, 'punch');
    }
  }

  /**
   * A monster is always angry. It looks for the closest living doll it can see, pops
   * its head out, scoots toward the doll and zaps it with a laser from its eyes.
   * With nobody in sight its head bobs up and down, peeking.
   */
  private hunt(deltaMs: number, world: World, state: BodyState): void {
    const monster = this.def.monster;
    if (!monster || !this.head) return;
    this.zapWaitMs = Math.max(0, this.zapWaitMs - deltaMs);
    const { head } = monster;
    const eyesY = this.y - head.outUp - SKIBIDI.eyes.up;
    const pieces = world.pieces(this);
    const awake = state === 'resting' && this.fallen === 0;

    // The closest living doll in range that nothing solid hides
    let victim: Person | null = null;
    let closest = monster.range;
    for (const person of awake ? world.people : []) {
      if (person.dead || person.seated || !person.canBePicked) continue;
      const body = person.hitBox;
      const atX = (body.left + body.right) / 2;
      const atY = (body.top + body.bottom) / 2;
      const distance = Math.hypot(atX - this.x, atY - eyesY);
      if (distance >= closest) continue;
      if (segmentHit(this.x, eyesY, atX, atY, pieces) !== null) continue;
      victim = person;
      closest = distance;
    }

    const peeking = 0.3 + 0.3 * Math.sin(this.clockMs / 420);
    const wanted = victim ? 1 : awake ? peeking : 0;
    this.headOut += (wanted - this.headOut) * Math.min(1, deltaMs / head.popMs);
    this.head.y = -(head.inUp + (head.outUp - head.inUp) * this.headOut);
    if (!victim) return;

    // Face the doll and scoot toward it
    const target = victim.feet;
    this.facing = target.x < this.x ? -1 : 1;
    const { halfWidth, height } = this.shape;
    const from = this.x;
    const step = this.facing * monster.speed * (deltaMs / 1000);
    const inside = clamp(from + step, world.area.left + halfWidth, world.area.right - halfWidth);
    this.x = blockedX(from, inside, halfWidth, this.y, height, pieces, 0);
    world.carry(this, this.x - from);

    if (this.zapWaitMs > 0 || this.headOut < 0.9) return;
    this.zapWaitMs = monster.everyMs;
    const eyesX = this.x + this.facing * SKIBIDI.eyes.x;
    world.zap(eyesX, eyesY, victim, monster.damage, monster.pushSpeed);
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
    const tip = span === 'floor' || span === null ? 0 : leaning(this.x, span, TOPPLE.give);
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
    // A piece lying on its side is drawn turned, around the bottom edge it stood on
    const turned = this.fallen * (Math.PI / 2);
    this.display.setPosition(
      this.x - this.fallen * (this.def.height / 2),
      this.fallen === 0 ? this.y : this.y - this.def.halfWidth,
    );
    this.display.rotation = turned + (state === 'flying' ? this.spin : this.lean);
    this.display.setScale(this.facing, 1);
  }
}

type Graphics = Phaser.GameObjects.Graphics;

function isVehicle(kind: BlockKind): kind is VehicleKind {
  return BLOCKS[kind].drive !== undefined;
}

/**
 * Draws a piece for the area. A monster gets its fridge only: its head is a picture
 * of its own, so that it can pop in and out.
 */
function drawJunkOrPiece(g: Graphics, kind: BlockKind): Graphics {
  return kind === 'skibidi' ? drawJunk(g, 'fridge') : drawBlock(g, kind);
}

/** Draws a building piece with code. The middle of its bottom edge is at (0, 0). */
export function drawBlock(g: Graphics, kind: BlockKind): Graphics {
  if (isVehicle(kind)) return drawParkedVehicle(g, kind);
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
