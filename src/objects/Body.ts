import { PHYSICS, PICK_PADDING, THROW, type ActionId } from '../config';
import { ceilingBounce, fallStep, springSpeed } from '../logic/fall';
import { flyStep, isGone, throwDirection, type Flying } from '../logic/fly';
import { boxAround, groundBelow, liftOut, type Box } from '../logic/ground';
import type { Spot } from '../logic/pick';
import { clampFeet, type PersonSize, type PlaceArea } from '../logic/place';
import type { World } from './World';

/** What a body is doing right now, as far as falling and flying goes. */
export type BodyState = 'flying' | 'held' | 'falling' | 'resting';

/**
 * Anything you can put into the area: a doll, an item or a building piece. It drops
 * to the ground, lands on solid things, can be dragged, and can be thrown away.
 * `x`, `y` is always the middle of its bottom edge.
 */
export abstract class Body {
  /** How much bigger than it looks everything is for a click. The scene sets it for touches. */
  static pickPadding: number = PICK_PADDING;
  abstract readonly size: PersonSize;
  /** The bubbles that come up when it is double-clicked. */
  abstract readonly actions: readonly ActionId[];
  /** The colors of the small pieces it breaks into when it is destroyed. */
  abstract readonly crumbs: readonly number[];
  /** Others can stand on it and can't walk through it. */
  readonly solid: boolean = false;
  protected x: number;
  protected y: number;
  protected state: BodyState = 'falling';
  protected held = false;
  protected flying: Flying | null = null;
  protected spin = 0;
  /** How hard it is pulled down, compared with everything else (1 is the usual). */
  protected gravityScale = 1;
  /** Held up in the air by itself (a flying machine): nothing pulls it down. */
  protected hovering = false;
  /**
   * What it does when something solid is put where it is. An item climbs out and
   * ends up on top of anything; a doll only steps up onto low things.
   */
  protected readonly climbsOnlyLow: boolean = false;
  /** A trampoline never stops bouncing it (a doll); other things bounce lower and lower. */
  protected readonly lively: boolean = false;
  /** How fast it was falling when it last hit the ground (pixels per second). */
  protected lastImpact = 0;
  private fallSpeed = 0;
  private fallSpeedBefore = 0;
  private flownOut = false;
  /** From the point it is held by to its bottom middle. */
  protected grabOffset = { x: 0, y: 0 };

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  /** The middle of the bottom edge. */
  get feet(): Spot {
    return { x: this.x, y: this.y };
  }

  get box(): Box {
    return boxAround(this.x, this.y, this.size.halfWidth, this.size.height);
  }

  /** The space a click can grab it by: a bit bigger than it looks. */
  get pickBox(): Box {
    const box = this.box;
    return {
      left: box.left - Body.pickPadding,
      right: box.right + Body.pickPadding,
      top: box.top - Body.pickPadding,
      bottom: box.bottom,
    };
  }

  /** Thrown away and out of the screen: time to forget it. */
  get gone(): boolean {
    return this.flownOut;
  }

  /** Can be grabbed and double-clicked (not while flying away). */
  get canBePicked(): boolean {
    return this.flying === null;
  }

  /** Standing on something and not in anybody's hand: it rides along when that thing drives. */
  get riding(): boolean {
    return this.state === 'resting' && !this.held;
  }

  /** Carried sideways by the vehicle it stands on. */
  nudge(dx: number): void {
    this.x += dx;
  }

  /** Solid and staying put, so others can stand on it. */
  get carries(): boolean {
    return this.solid && !this.held && this.flying === null;
  }

  /** Picked up at this point. It hangs from where it was grabbed. */
  grab(px: number, py: number): void {
    this.held = true;
    this.grabOffset = { x: this.x - px, y: this.y - py };
  }

  /** Dragged: follow the pointer, but stay inside the area. */
  dragTo(px: number, py: number, area: PlaceArea): void {
    const feet = clampFeet(px + this.grabOffset.x, py + this.grabOffset.y, area, this.size);
    this.x = feet.x;
    this.y = feet.y;
  }

  /**
   * Let go: drop to the ground from here, starting at `speedY` (negative is upward).
   * A solid thing let go inside another solid thing is first lifted to sit on top of it.
   */
  release(solids: readonly Box[], speedY = 0): void {
    this.held = false;
    this.fallSpeed = speedY;
    if (this.solid) this.y = liftOut(this.box, solids);
  }

  /** Fly up and off the nearest side of the screen, spinning. */
  throwAway(area: PlaceArea): void {
    const direction = throwDirection(this.x, area.left, area.right);
    this.flying = { x: this.x, y: this.y, vx: direction * THROW.speedX, vy: -THROW.speedY };
    this.held = false;
  }

  /** Is this bubble switched on (so it glows)? */
  abstract isOn(action: ActionId): boolean;
  abstract update(deltaMs: number, world: World): void;

  /** Bounce up off the ground at this speed (pixels per second). */
  protected hop(speed: number): void {
    this.fallSpeed = -Math.abs(speed);
    this.y -= 1;
    this.state = 'falling';
  }

  /** Draw it in front of the others of its kind. */
  abstract bringToTop(): void;
  abstract destroy(): void;

  /** Fly, hang or fall, and say which it is. `resting` means standing on the ground. */
  protected physics(deltaMs: number, world: World): BodyState {
    this.state = this.move(deltaMs, world);
    return this.state;
  }

  private move(deltaMs: number, world: World): BodyState {
    if (this.flying) {
      this.flying = flyStep(this.flying, THROW.gravity, deltaMs);
      this.x = this.flying.x;
      this.y = this.flying.y;
      this.spin += Math.sign(this.flying.vx) * THROW.spin * (deltaMs / 1000);
      const { left, right } = world.area;
      this.flownOut = isGone(this.flying, left, right, world.bottom, THROW.margin);
      return 'flying';
    }
    if (this.held) return 'held';

    const solids = world.solidBoxes(this);
    const { halfWidth, height } = this.size;
    if (this.hovering) {
      this.fallSpeed = 0;
      return 'resting';
    }
    if (!this.solid) {
      // Something solid put where this is: climb out and stand on it
      const low = this.y - PHYSICS.stepUp - 1;
      const climbable = this.climbsOnlyLow ? solids.filter((box) => box.top >= low) : solids;
      this.y = liftOut(boxAround(this.x, this.y, halfWidth - 1, height), climbable);
    }
    const ground = groundBelow(
      this.x - halfWidth,
      this.x + halfWidth,
      this.y,
      solids,
      world.area.floorY,
      PHYSICS.groundSlack,
    );
    if (this.y >= ground) {
      this.y = ground;
      this.fallSpeed = 0;
      return 'resting';
    }
    this.fallSpeedBefore = this.fallSpeed;
    const fall = fallStep(
      { y: this.y, speed: this.fallSpeed, landed: false },
      PHYSICS.gravity * this.gravityScale,
      ground,
      deltaMs,
    );
    // Nothing flies up past the ceiling: it bounces back down
    const below = ceilingBounce(fall.y, fall.speed, height, world.area.top, PHYSICS.ceilingBounce);
    this.y = below.y;
    this.fallSpeed = below.speed;
    if (!fall.landed) return 'falling';
    const impact = this.fallSpeedBefore + PHYSICS.gravity * this.gravityScale * (deltaMs / 1000);
    // Landed on a trampoline: it throws the thing back up
    const spring = world.spring(this.x - halfWidth, this.x + halfWidth, ground);
    const back = spring ? springSpeed(impact, spring, this.lively) : 0;
    if (back > 0) {
      this.y = ground - 1;
      this.fallSpeed = -back;
      return 'falling';
    }
    this.lastImpact = impact;
    return 'resting';
  }
}
