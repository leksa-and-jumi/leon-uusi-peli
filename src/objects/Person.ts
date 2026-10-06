import type Phaser from 'phaser';
import { ANGRY, KNOCK, PERSON, PUNCH_DAMAGE, THROW, WALK, type PersonLook } from '../config';
import { chaseStep, nearestIndex } from '../logic/chase';
import { fallStep, type Fall } from '../logic/fall';
import { flyStep, isGone, throwDirection, type Flying } from '../logic/fly';
import { isDead, takeHit } from '../logic/health';
import { knockDone, knockTilt } from '../logic/knock';
import type { Spot } from '../logic/pick';
import { clampFeet, type PlaceArea } from '../logic/place';
import { limpPose, poseFor, type Pose, type PoseKind } from '../logic/pose';
import { walkStep, type Facing } from '../logic/walk';
import { PersonFigure } from './personShape';

/** What a person keeps doing until it is switched off. */
export type Activity = 'idle' | 'walk' | 'dance' | 'angry';

/** What a person needs to know about the world around them each frame. */
export interface World {
  area: PlaceArea;
  bottom: number;
  everyone: readonly Person[];
  /** Show a hit at this spot. `deadly` when it was the last one. */
  hitEffect: (x: number, y: number, deadly: boolean) => void;
}

/**
 * A person in the area. They drop from where you put them, can be dragged, and can
 * walk, dance or get angry.
 */
export class Person {
  activity: Activity = 'idle';
  private readonly figure: PersonFigure;
  private x: number;
  private y: number;
  private facing: Facing = 1;
  private fall: Fall;
  private held = false;
  private grabOffset = { x: 0, y: 0 };
  /** Time since being knocked over, or `null` when not knocked. */
  private knockMs: number | null = null;
  /** Slide away while tipping over (after a punch, but not after being dropped). */
  private slide = false;
  private knockDir: Facing = 1;
  private flying: Flying | null = null;
  private spin = 0;
  private flownOut = false;
  private punchMs = 0;
  /** Time left before the next punch. */
  private waitMs = 0;
  private inReach = false;
  /** Keeps counting, so the moves keep going. */
  private clockMs = 0;
  private lives: number = PERSON.lives;
  /** How the limbs flop once there are no lives left, or `null` while alive. */
  private limp: Pose | null = null;

  constructor(scene: Phaser.Scene, look: PersonLook, x: number, feetY: number) {
    this.figure = new PersonFigure(scene, look);
    this.x = x;
    this.y = feetY;
    this.fall = { y: feetY, speed: 0, landed: false };
    this.draw('held', 0);
  }

  /** Where the feet are. */
  get feet(): Spot {
    return { x: this.x, y: this.y };
  }

  /** Thrown away and out of the screen: time to forget this person. */
  get gone(): boolean {
    return this.flying !== null && this.flownOut;
  }

  /** Can be grabbed and double-clicked (not while flying away). */
  get canBePicked(): boolean {
    return this.flying === null;
  }

  /** No lives left: lies limp and does nothing any more. */
  get dead(): boolean {
    return this.limp !== null;
  }

  /** Standing on the floor, so an angry one can punch them. */
  get canBeHit(): boolean {
    return (
      !this.dead && this.fall.landed && !this.held && this.knockMs === null && this.flying === null
    );
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

  /** Fly up and off the nearest side of the screen, spinning. */
  throwAway(area: PlaceArea): void {
    const direction = throwDirection(this.x, area.left, area.right);
    this.flying = { x: this.x, y: this.y, vx: direction * THROW.speedX, vy: -THROW.speedY };
    this.held = false;
    this.knockMs = null;
  }

  /** Picked up at this point. The person hangs from where they were grabbed. */
  grab(px: number, py: number): void {
    this.held = true;
    this.knockMs = null;
    this.slide = false;
    this.grabOffset = { x: this.x - px, y: this.y - py };
  }

  /** Dragged: follow the pointer, but stay inside the area. */
  dragTo(px: number, py: number, area: PlaceArea): void {
    const feet = clampFeet(px + this.grabOffset.x, py + this.grabOffset.y, area, PERSON);
    this.x = feet.x;
    this.y = feet.y;
  }

  /** Let go: drop to the floor from here. */
  release(): void {
    this.held = false;
    this.fall = { y: this.y, speed: 0, landed: false };
  }

  /**
   * Punched: lose lives, slide away from the punch and fall over. With no lives
   * left the doll stays down. Says whether this hit was the last one.
   */
  hit(direction: Facing, damage: number = PUNCH_DAMAGE): boolean {
    this.knockMs = 0;
    this.slide = true;
    this.knockDir = direction;
    this.punchMs = 0;
    this.lives = takeHit(this.lives, damage);
    if (!isDead(this.lives)) return false;
    this.limp = limpPose();
    this.activity = 'idle';
    this.figure.setAngry(false);
    this.figure.setDead(true);
    return true;
  }

  update(deltaMs: number, world: World): void {
    this.clockMs += deltaMs;

    if (this.flying) {
      this.flying = flyStep(this.flying, THROW.gravity, deltaMs);
      this.x = this.flying.x;
      this.y = this.flying.y;
      this.spin += Math.sign(this.flying.vx) * THROW.spin * (deltaMs / 1000);
      this.flownOut = isGone(
        this.flying,
        world.area.left,
        world.area.right,
        world.bottom,
        THROW.margin,
      );
      this.draw('held', this.spin);
      return;
    }

    if (this.held) {
      this.draw('held', 0);
      return;
    }

    if (!this.fall.landed) {
      this.fall = fallStep(this.fall, PERSON.gravity, world.area.floorY, deltaMs);
      this.y = this.fall.y;
      this.draw('held', 0);
      return;
    }

    if (this.knockMs !== null || this.dead) {
      this.updateKnocked(deltaMs, world.area);
      return;
    }

    this.draw(this.act(deltaMs, world), 0);
  }

  /** Draw this person on top of the others. */
  bringToTop(): void {
    const { container } = this.figure;
    container.scene.children.bringToTop(container);
  }

  destroy(): void {
    this.figure.destroy();
  }

  private updateKnocked(deltaMs: number, area: PlaceArea): void {
    const elapsed = (this.knockMs ?? 0) + deltaMs;
    if (this.slide && elapsed < KNOCK.fallMs) {
      const pushed = this.x + this.knockDir * KNOCK.pushSpeed * (deltaMs / 1000);
      this.x = clampFeet(pushed, this.y, area, PERSON).x;
    }
    // A doll with no lives left tips over like the others, but never gets back up
    const stayDown = this.dead && elapsed >= KNOCK.fallMs;
    this.knockMs = stayDown ? KNOCK.fallMs : knockDone(elapsed, KNOCK) ? null : elapsed;
    const tilt = stayDown ? 1 : knockTilt(elapsed, KNOCK);
    this.draw('stand', this.knockDir * tilt * (Math.PI / 2), tilt * PERSON.lyingLift);
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
      this.x = walker.x;
      this.facing = walker.facing;
      return 'walk';
    }
    if (this.activity === 'dance') return 'dance';
    if (this.activity === 'angry') return this.rage(deltaMs, world);
    return 'stand';
  }

  /** Angry mode: run to the closest person who is standing, and punch them over. */
  private rage(deltaMs: number, world: World): PoseKind {
    this.waitMs = Math.max(0, this.waitMs - deltaMs);
    if (this.punchMs > 0) {
      this.punchMs -= deltaMs;
      return 'punch';
    }

    const targets = world.everyone.filter((other) => other !== this && other.canBeHit);
    const nearest = nearestIndex(
      this.x,
      targets.map((other) => other.x),
    );
    const target = nearest === null ? undefined : targets[nearest];
    if (!target) {
      this.inReach = false;
      return 'stand';
    }

    const chase = chaseStep(this.x, this.facing, target.x, ANGRY.reach, ANGRY.speed, deltaMs);
    this.x = chase.x;
    this.facing = chase.facing;
    if (!chase.inReach) {
      this.inReach = false;
      return 'run';
    }

    if (!this.inReach) {
      // Just got close: wind up for a short, random moment first
      this.inReach = true;
      this.waitMs = Math.max(this.waitMs, randomBetween(ANGRY.windupMs.min, ANGRY.windupMs.max));
    }
    if (this.waitMs > 0) return 'stand';

    const deadly = target.hit(this.facing);
    world.hitEffect(target.x, target.y - PERSON.height * 0.75, deadly);
    this.punchMs = ANGRY.punchMs;
    this.waitMs = ANGRY.restMs;
    this.inReach = false;
    return 'punch';
  }

  private draw(kind: PoseKind, rotation: number, extraLift = 0): void {
    const pose = this.limp ?? poseFor(kind, this.clockMs);
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
