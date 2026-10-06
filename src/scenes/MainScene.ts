import Phaser from 'phaser';
import {
  BLAST,
  BLOCKS,
  BULLET,
  COLORS,
  DEPTH,
  DOUBLE_CLICK_MS,
  FLOOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  HINT,
  HIT_FX,
  ITEMS,
  MENU,
  PERSON,
  SWING,
  THINGS_MAX,
  TOSS,
  type ActionId,
  type GunDef,
} from '../config';
import { blastDirection, inBlast } from '../logic/blast';
import { overlaps, type Box } from '../logic/ground';
import { boxAt, isDoubleClick, type Click, type Spot } from '../logic/pick';
import { placeFeet, type PlaceArea } from '../logic/place';
import { sweepHit } from '../logic/shot';
import { swingDirection, swingLands, swingSpeed } from '../logic/swing';
import type { Facing } from '../logic/walk';
import { ActionBubbles } from '../objects/ActionBubbles';
import { Block } from '../objects/Block';
import type { Body } from '../objects/Body';
import { Item } from '../objects/Item';
import { Person } from '../objects/Person';
import { SpawnMenu } from '../objects/SpawnMenu';
import type { World } from '../objects/World';

const AREA: PlaceArea = {
  left: 0,
  right: GAME_WIDTH,
  top: MENU.height,
  floorY: GAME_HEIGHT - FLOOR.height,
};

/** A bullet on its way. It flies straight sideways. */
interface Bullet {
  x: number;
  y: number;
  direction: Facing;
  gun: GunDef;
  shooter: Person;
  picture: Phaser.GameObjects.Rectangle;
}

/**
 * The area: pick something from the menu and click to put it in. Drag things around,
 * and double-click one to open its action bubbles.
 */
export class MainScene extends Phaser.Scene {
  private menu!: SpawnMenu;
  private bubbles!: ActionBubbles;
  private people: Person[] = [];
  private blocks: Block[] = [];
  private items: Item[] = [];
  private bullets: Bullet[] = [];
  private dragged: Body | null = null;
  private lastClick: Click | null = null;
  /** Where the dragged thing was a frame ago, to see how fast it is swung. */
  private lastDragSpot: Spot | null = null;
  /** How fast the dragged thing is being moved, smoothed (pixels per second). */
  private dragSpeed = { x: 0, y: 0 };
  /** When each doll was last hit by a swung weapon. */
  private lastSwingHit = new WeakMap<Person, number>();
  /** The boxes of everything solid, worked out once per frame. */
  private solids: { body: Body; box: Box }[] = [];
  private world!: World;

  constructor() {
    super('MainScene');
  }

  create(): void {
    this.people = [];
    this.blocks = [];
    this.items = [];
    this.bullets = [];
    this.solids = [];
    this.dragged = null;
    this.lastClick = null;
    this.lastDragSpot = null;
    this.world = {
      area: AREA,
      bottom: GAME_HEIGHT,
      people: this.people,
      solidBoxes: (body) => this.solidBoxes(body),
      hitEffect: (x, y, deadly) => {
        this.showHit(x, y, deadly);
      },
      shoot: (shooter, x, y, direction, gun) => {
        this.shoot(shooter, x, y, direction, gun);
      },
      explode: (bomb) => {
        this.explode(bomb);
      },
    };

    this.add.rectangle(0, AREA.floorY, GAME_WIDTH, FLOOR.height, FLOOR.color).setOrigin(0);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - HINT.fromBottom, HINT.text, {
        fontSize: HINT.fontSize,
        color: COLORS.text,
        align: 'center',
      })
      .setOrigin(0.5);

    this.menu = new SpawnMenu(this);
    this.bubbles = new ActionBubbles(this);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.press(pointer.x, pointer.y);
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.dragged?.dragTo(pointer.x, pointer.y, AREA);
    });
    this.input.on('pointerup', () => {
      this.letGo();
    });
    this.input.on('pointerupoutside', () => {
      this.letGo();
    });
  }

  update(_time: number, delta: number): void {
    this.world.people = this.people;
    this.solids = this.blocks
      .filter((block) => block.carries)
      .map((block) => ({ body: block, box: block.box }));

    for (const body of this.everything()) {
      body.update(delta, this.world);
    }
    this.updateBullets(delta);
    this.swing(delta);
    this.trackDrag(delta);
    this.forget(this.everything().filter((body) => body.gone));
    this.bubbles.update(delta, AREA);
  }

  /** Everything in the area, from the back to the front. */
  private everything(): Body[] {
    return [...this.blocks, ...this.people, ...this.items];
  }

  private solidBoxes(except: Body): Box[] {
    return this.solids.filter((solid) => solid.body !== except).map((solid) => solid.box);
  }

  private press(px: number, py: number): void {
    if (this.menu.covers(py)) {
      if (this.menu.click(px, py) === 'clear') {
        this.forget(this.everything());
        this.clearBullets();
      }
      return;
    }

    const action = this.bubbles.actionAt(px, py);
    const target = this.bubbles.target;
    if (action && target) {
      this.doAction(action, target);
      return;
    }

    const body = this.bodyUnder(px, py);
    if (!body) {
      // A click on empty space closes open bubbles; otherwise it puts a new thing in.
      if (target) {
        this.bubbles.close();
      } else {
        this.spawn(px, py);
      }
      return;
    }

    const click = { timeMs: this.time.now, target: body };
    if (isDoubleClick(this.lastClick, click, DOUBLE_CLICK_MS)) {
      this.lastClick = null;
      if (target === body) {
        this.bubbles.close();
      } else {
        this.bubbles.open(body);
      }
    } else {
      this.lastClick = click;
      if (target && target !== body) this.bubbles.close();
    }

    body.grab(px, py);
    this.dragged = body;
    this.lastDragSpot = null;
    this.dragSpeed = { x: 0, y: 0 };
    this.bringToFront(body);
  }

  /** Keep track of how fast the dragged thing moves, so letting go can throw it. */
  private trackDrag(delta: number): void {
    const body = this.dragged;
    if (!body || delta <= 0) {
      this.lastDragSpot = null;
      return;
    }
    const now = body.feet;
    const before = this.lastDragSpot ?? now;
    this.lastDragSpot = now;
    const seconds = delta / 1000;
    this.dragSpeed.x += ((now.x - before.x) / seconds - this.dragSpeed.x) * TOSS.smoothing;
    this.dragSpeed.y += ((now.y - before.y) / seconds - this.dragSpeed.y) * TOSS.smoothing;
  }

  /**
   * A sword or a bat that you drag fast into a doll hits it, just like when a doll
   * swings it. Carrying it slowly doesn't hurt anybody.
   */
  private swing(delta: number): void {
    const weapon = this.dragged;
    const melee = weapon instanceof Item ? weapon.def.melee : undefined;
    if (!weapon || !melee) return;
    const now = weapon.feet;
    const before = this.lastDragSpot ?? now;
    const speed = swingSpeed(before, now, delta);

    for (const person of this.people) {
      if (!person.canBePicked || !overlaps(weapon.pickBox, person.box)) continue;
      const sinceLastHit = this.time.now - (this.lastSwingHit.get(person) ?? -Infinity);
      if (!swingLands(speed, SWING.minSpeed, sinceLastHit, SWING.cooldownMs)) continue;
      this.lastSwingHit.set(person, this.time.now);
      const direction = swingDirection(now.x - before.x, now.x, person.feet.x);
      const deadly = person.hit(direction, this.solidBoxes(person), melee.damage, melee.pushSpeed);
      this.showHit(person.feet.x, now.y - weapon.size.height / 2, deadly);
    }
  }

  private letGo(): void {
    const body = this.dragged;
    if (!body) return;
    this.dragged = null;

    // An item let go on top of a standing doll goes into the doll's hand
    if (body instanceof Item) {
      const { x, y } = body.feet;
      const takers = this.people.filter((person) => person.canBeHit);
      const index = boxAt(
        takers.map((person) => person.box),
        x,
        y - body.size.height / 2,
      );
      const taker = index === null ? undefined : takers[index];
      if (taker) {
        taker.hold(body, this.solidBoxes(body));
        return;
      }
    }
    if (body instanceof Person) {
      body.throwWith(this.dragSpeed.x, this.dragSpeed.y, this.solidBoxes(body));
    } else {
      body.release(this.solidBoxes(body));
    }
  }

  private doAction(action: ActionId, body: Body): void {
    switch (action) {
      case 'throw':
        body.throwAway(AREA);
        this.bubbles.close();
        break;
      case 'turn':
        if (body instanceof Person) body.turn();
        this.bubbles.flash('turn');
        break;
      case 'drop':
        if (body instanceof Person) body.dropItem(this.solidBoxes(body));
        this.bubbles.flash('drop');
        break;
      case 'walk':
      case 'dance':
      case 'angry':
        if (body instanceof Person) body.toggle(action);
        break;
      case 'fuse':
        if (body instanceof Item) body.toggleFuse();
        break;
    }
  }

  /** What a click at this point grabs: items first, then dolls, then building pieces. */
  private bodyUnder(px: number, py: number): Body | null {
    const pickable = this.everything().filter((body) => body.canBePicked);
    const index = boxAt(
      pickable.map((body) => body.pickBox),
      px,
      py,
    );
    return index === null ? null : (pickable[index] ?? null);
  }

  /** Put what is picked in the menu into the area, around the click. */
  private spawn(px: number, py: number): void {
    const choice = this.menu.selected;
    if (choice.type === 'person') {
      const feet = placeFeet(px, py, AREA, PERSON);
      this.people.push(new Person(this, choice.look, feet.x, feet.y));
      if (this.people.length > PERSON.max) this.forgetOldest(this.people);
      return;
    }

    let thing: Block | Item;
    if (choice.type === 'item') {
      const feet = placeFeet(px, py, AREA, ITEMS[choice.kind]);
      thing = new Item(this, choice.kind, feet.x, feet.y);
      this.items.push(thing);
    } else {
      const feet = placeFeet(px, py, AREA, BLOCKS[choice.kind]);
      thing = new Block(this, choice.kind, feet.x, feet.y);
      this.blocks.push(thing);
    }
    thing.release(this.solidBoxes(thing));
    if (this.blocks.length + this.items.length > THINGS_MAX) {
      this.forgetOldest(this.blocks.length >= this.items.length ? this.blocks : this.items);
    }
  }

  private forgetOldest(list: readonly Body[]): void {
    const oldest = list.find((body) => body !== this.dragged);
    if (oldest) this.forget([oldest]);
  }

  /** What is drawn last is on top, and is also what a click picks first. */
  private bringToFront(body: Body): void {
    if (body instanceof Person) {
      this.people = [...this.people.filter((other) => other !== body), body];
    } else if (body instanceof Block) {
      this.blocks = [...this.blocks.filter((other) => other !== body), body];
    } else if (body instanceof Item) {
      this.items = [...this.items.filter((other) => other !== body), body];
    }
    body.bringToTop();
  }

  /** Take things out of the game for good. A doll takes the item in its hand along. */
  private forget(leaving: readonly Body[]): void {
    if (leaving.length === 0) return;
    const all = new Set<Body>(leaving);
    for (const body of leaving) {
      if (body instanceof Person && body.holding) all.add(body.holding);
    }
    for (const body of all) {
      if (this.dragged === body) this.dragged = null;
      if (this.bubbles.target === body) this.bubbles.close();
      if (this.lastClick?.target === body) this.lastClick = null;
      body.destroy();
    }
    this.people = this.people.filter((body) => !all.has(body));
    this.blocks = this.blocks.filter((body) => !all.has(body));
    this.items = this.items.filter((body) => !all.has(body));
    this.bullets = this.bullets.filter((bullet) => {
      if (!all.has(bullet.shooter)) return true;
      bullet.picture.destroy();
      return false;
    });
  }

  private shoot(shooter: Person, x: number, y: number, direction: Facing, gun: GunDef): void {
    const picture = this.add
      .rectangle(x, y, BULLET.width, BULLET.height, BULLET.color)
      .setDepth(DEPTH.bullet);
    this.bullets.push({ x, y, direction, gun, shooter, picture });
  }

  /** Bullets fly until they hit a doll, hit something solid, or leave the area. */
  private updateBullets(delta: number): void {
    this.bullets = this.bullets.filter((bullet) => {
      const fromX = bullet.x;
      bullet.x += bullet.direction * bullet.gun.bulletSpeed * (delta / 1000);
      bullet.picture.x = bullet.x;

      const targets = this.people.filter((person) => person !== bullet.shooter && person.canBeHit);
      const boxes = [...this.solids.map((solid) => solid.box), ...targets.map((p) => p.box)];
      const hit = sweepHit(fromX, bullet.x, bullet.y, boxes);
      const flownOut = bullet.x < AREA.left || bullet.x > AREA.right;
      if (hit === null && !flownOut) return true;

      const victim = hit === null ? undefined : targets[hit - this.solids.length];
      if (victim) {
        const deadly = victim.hit(bullet.direction, this.solidBoxes(victim), bullet.gun.damage);
        this.showHit(victim.feet.x, bullet.y, deadly);
      }
      bullet.picture.destroy();
      return false;
    });
  }

  private clearBullets(): void {
    this.bullets.forEach((bullet) => bullet.picture.destroy());
    this.bullets = [];
  }

  /** A bomb goes off: dolls nearby are hurt and thrown back, breakable pieces are gone. */
  private explode(bomb: Item): void {
    const blast = bomb.def.bomb;
    if (!blast) return;
    const { x, y } = bomb.feet;
    const middleY = y - bomb.size.height / 2;

    for (const person of this.people) {
      if (!person.canBePicked || !inBlast(x, middleY, person.box, blast.radius)) continue;
      const direction = blastDirection(x, person.feet.x);
      person.hit(direction, this.solidBoxes(person), blast.damage, blast.pushSpeed);
    }
    this.forget(
      this.blocks.filter(
        (block) => block.breakable && inBlast(x, middleY, block.box, blast.radius),
      ),
    );
    this.popUp(x, middleY, BLAST.emoji, BLAST.fontSize, BLAST.ms, BLAST.grow);
    this.cameras.main.shake(BLAST.ms / 2, 0.012);
  }

  private showHit(x: number, y: number, deadly: boolean): void {
    const emoji = deadly ? HIT_FX.deadEmoji : HIT_FX.emoji;
    this.popUp(x, y, emoji, HIT_FX.fontSize, deadly ? HIT_FX.deadMs : HIT_FX.ms, HIT_FX.grow);
  }

  /** A picture that pops up, grows and fades away. */
  private popUp(
    x: number,
    y: number,
    emoji: string,
    fontSize: string,
    ms: number,
    grow: number,
  ): void {
    const picture = this.add.text(x, y, emoji, { fontSize }).setOrigin(0.5).setDepth(HIT_FX.depth);
    this.tweens.add({
      targets: picture,
      alpha: 0,
      scale: grow,
      duration: ms,
      onComplete: () => {
        picture.destroy();
      },
    });
  }
}
