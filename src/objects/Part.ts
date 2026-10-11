import type Phaser from 'phaser';
import { DEPTH, POOL, SEVER, THING_ACTIONS, TOSS, type ActionId } from '../config';
import { clamp } from '../logic/bounds';
import { settleTurn } from '../logic/debris';
import type { Box } from '../logic/ground';
import type { PersonSize } from '../logic/place';
import type { Facing } from '../logic/walk';
import { Body } from './Body';
import type { World } from './World';

/**
 * A part that has been cut off a doll: a head, an arm, a leg or everything above the
 * waist. It drops to the ground and lies there flat. It can be picked up, carried,
 * thrown and thrown away like any other thing, and it floats in water.
 */
export class Part extends Body {
  readonly size: PersonSize;
  readonly actions: readonly ActionId[] = THING_ACTIONS;
  readonly crumbs: readonly number[] = [];
  private readonly picture: Phaser.GameObjects.Container;
  /** How far above its bottom edge the picture is drawn. */
  private readonly lift: number;
  /** How fast it goes sideways, how far it has turned and how fast it turns. */
  private vx: number;
  private turn: number;
  private twirl: number;

  constructor(
    picture: Phaser.GameObjects.Container,
    lift: number,
    reach: number,
    direction: Facing,
    gentle: boolean,
  ) {
    super(picture.x, picture.y + lift);
    this.picture = picture.setDepth(DEPTH.item - 1);
    this.lift = lift;
    this.size = { halfWidth: reach, height: lift * 2 };
    const force = gentle ? SEVER.gentle : 1;
    this.vx = direction * SEVER.push * (0.5 + Math.random()) * force;
    this.turn = picture.rotation;
    this.twirl = direction * SEVER.spin * force;
    this.hop(SEVER.lift * force);
  }

  protected override get floatDepth(): number {
    return this.size.height * POOL.floatShare;
  }

  isOn(): boolean {
    return false;
  }

  /** Let go: thrown the way the mouse was going, or just dropped when it was slow. */
  throwWith(speedX: number, speedY: number, solids: readonly Box[]): void {
    const speed = Math.hypot(speedX, speedY);
    if (speed < TOSS.minSpeed) {
      this.release(solids);
      return;
    }
    const scale = Math.min(TOSS.power, TOSS.maxSpeed / speed);
    this.release(solids, speedY * scale);
    this.vx = speedX * scale;
    this.twirl = Math.sign(speedX) * SEVER.spin;
  }

  update(deltaMs: number, world: World): void {
    const state = this.physics(deltaMs, world);
    const seconds = deltaMs / 1000;
    if (state === 'flying') {
      this.turn = this.spin;
    } else if (state === 'held') {
      // In the hand it hangs straight down
      this.vx = 0;
      this.turn = Math.atan2(Math.sin(this.turn), Math.cos(this.turn));
      this.turn *= Math.exp(-deltaMs / SEVER.settleMs);
    } else {
      const { halfWidth } = this.size;
      const wanted = this.x + this.vx * seconds;
      this.x = clamp(wanted, world.area.left + halfWidth, world.area.right - halfWidth);
      if (this.x !== wanted) this.vx = -this.vx * TOSS.bounce;
      if (state === 'resting') {
        // On the ground it slides to a stop and turns to lie flat
        this.vx *= Math.exp(-deltaMs / TOSS.slideMs);
        if (Math.abs(this.vx) < TOSS.stopSpeed) this.vx = 0;
        this.turn = settleTurn(this.turn, deltaMs, SEVER.settleMs);
      } else {
        this.turn += this.twirl * seconds;
      }
    }
    this.picture.setPosition(this.x, this.y - this.lift);
    this.picture.rotation = this.turn;
  }

  bringToTop(): void {
    this.picture.scene.children.bringToTop(this.picture);
  }

  destroy(): void {
    this.picture.destroy();
  }
}
