import Phaser from 'phaser';
import {
  ASH,
  BLAST,
  BLOCKS,
  BLOOD,
  BULLET,
  CEILING,
  COLORS,
  CRUSH,
  DEBRIS,
  DEPTH,
  DOUBLE_CLICK_MS,
  FLOOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  HINT,
  HIT_FX,
  ITEMS,
  LASER,
  MENU,
  PERSON,
  RIDE_GAP,
  SOUND,
  SWING,
  THINGS_MAX,
  TOPPLE,
  TOSS,
  type ActionId,
  type BlastDef,
  type GunDef,
} from '../config';
import { Sfx } from '../audio/Sfx';
import { blastDirection, inBlast } from '../logic/blast';
import { addDrop, wipe, type Stain } from '../logic/blood';
import { crumbAlpha, crumbCount, crumbStep, scatter, type Crumb } from '../logic/debris';
import { overlaps, standsOn, type Box } from '../logic/ground';
import { boxAt, isDoubleClick, type Click, type Spot } from '../logic/pick';
import { placeFeet, type PlaceArea } from '../logic/place';
import { segmentHit } from '../logic/shot';
import { sameTeam } from '../logic/team';
import { recentSamples, throwSpeed, type DragSample } from '../logic/toss';
import { swingDirection, swingLands, swingSpeed } from '../logic/swing';
import type { Facing } from '../logic/walk';
import { ActionBubbles } from '../objects/ActionBubbles';
import { Block } from '../objects/Block';
import type { Body } from '../objects/Body';
import { Item } from '../objects/Item';
import { Person } from '../objects/Person';
import { SpawnMenu } from '../objects/SpawnMenu';
import type { HitSound, World } from '../objects/World';

const AREA: PlaceArea = {
  left: 0,
  right: GAME_WIDTH,
  top: MENU.height + CEILING.height,
  floorY: GAME_HEIGHT - FLOOR.height,
};

/** A bullet on its way. It flies straight sideways. */
interface Bullet {
  x: number;
  y: number;
  /** The way it flies: an arrow of length 1. */
  aim: Spot;
  /** The vehicle it was fired out of. It flies through that one. */
  from: Body | null;
  /** The way a doll that is hit by it is knocked: 1 right, -1 left. */
  direction: Facing;
  gun: GunDef;
  /** The doll that fired it, or `null` for a gun firing on its own. */
  shooter: Person | null;
  picture: Phaser.GameObjects.Rectangle;
}

/** A flying piece of something that broke, or a drop of blood (then `blood` is its color). */
interface Piece {
  crumb: Crumb;
  picture: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Arc;
  blood: number | null;
  /** How long it lies there before it starts to fade, and how long fading takes. */
  lieMs: number;
  fadeMs: number;
}

/**
 * The area: pick something from the menu and click to put it in. Drag things around,
 * and double-click one to open its action bubbles.
 */
export class MainScene extends Phaser.Scene {
  private menu!: SpawnMenu;
  private bubbles!: ActionBubbles;
  private readonly sfx = new Sfx();
  private people: Person[] = [];
  private blocks: Block[] = [];
  private items: Item[] = [];
  private bullets: Bullet[] = [];
  private pieces: Piece[] = [];
  /** Blood on the floor. It stays until it is wiped away with the broom. */
  private stains: Stain[] = [];
  private stainLayer!: Phaser.GameObjects.Graphics;
  private dragged: Body | null = null;
  private lastClick: Click | null = null;
  /** Where the dragged thing was a frame ago, to see how fast it is swung. */
  private lastDragSpot: Spot | null = null;
  /** Where the dragged thing has been in the last moments, to throw it when it is let go. */
  private dragTrail: DragSample[] = [];
  /** When each doll was last hit by a swung weapon. */
  private lastSwingHit = new WeakMap<Person, number>();
  /** The boxes of everything solid, worked out once per frame. */
  private solids: { body: Body; box: Box }[] = [];
  /** The boxes of the dolls lying on the ground, worked out once per frame. */
  private downDolls: Box[] = [];
  /** Things destroyed during this frame, waiting to be taken out of the game. */
  private doomed: Body[] = [];
  /** Where the monsters' tune is: time into the beat, and which beat. */
  private chantMs = 0;
  private chantBeat = 0;
  private world!: World;

  constructor() {
    super('MainScene');
  }

  create(): void {
    this.people = [];
    this.blocks = [];
    this.items = [];
    this.bullets = [];
    this.pieces = [];
    this.stains = [];
    this.solids = [];
    this.dragged = null;
    this.lastClick = null;
    this.lastDragSpot = null;
    this.world = {
      area: AREA,
      bottom: GAME_HEIGHT,
      people: this.people,
      solidBoxes: (body) => this.solidBoxes(body),
      hitEffect: (x, y, deadly, sound) => {
        this.showHit(x, y, deadly, sound);
      },
      pinned: (person) => this.pinned(person),
      shove: (box, direction) => {
        this.shove(box, direction);
      },
      pieces: (body) =>
        this.solids.filter((solid) => solid.body !== body).map((solid) => solid.box),
      carry: (vehicle, dx) => {
        this.carry(vehicle, dx);
      },
      landed: (fallSpeed) => {
        const { quietestFall, loudestFall } = SOUND.thud;
        this.sfx.thud((fallSpeed - quietestFall) / (loudestFall - quietestFall));
      },
      shoot: (shooter, x, y, direction, gun, aim, from) => {
        this.shoot(shooter, x, y, direction, gun, aim, from);
      },
      explode: (source, blast) => {
        this.explode(source, blast);
      },
      zap: (fromX, fromY, victim, damage, pushSpeed) => {
        this.zap(fromX, fromY, victim, damage, pushSpeed);
      },
      things: (self) => [
        ...this.blocks.filter((block) => block !== self && block.canBePicked),
        ...this.items.filter((item) => item.canBePicked && !item.isHeld),
      ],
      zapThing: (fromX, fromY, thing) => {
        this.zapThing(fromX, fromY, thing);
      },
      breakApart: (body, pushX, pushY) => {
        this.crumble(body, pushX, pushY);
        this.sfx.shatter();
      },
      bleed: (x, y, drops, color, spray) => {
        this.bleed(x, y, drops, color, spray);
      },
    };

    this.add.rectangle(0, AREA.floorY, GAME_WIDTH, FLOOR.height, FLOOR.color).setOrigin(0);
    this.add.rectangle(0, MENU.height, GAME_WIDTH, CEILING.height, CEILING.color).setOrigin(0);
    this.add.rectangle(0, AREA.top - 2, GAME_WIDTH, 2, CEILING.edge).setOrigin(0);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - HINT.fromBottom, HINT.text, {
        fontSize: HINT.fontSize,
        color: COLORS.text,
        align: 'center',
      })
      .setOrigin(0.5);

    this.stainLayer = this.add.graphics().setDepth(BLOOD.depth);
    this.menu = new SpawnMenu(this);
    this.bubbles = new ActionBubbles(this);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.sfx.unlock();
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

    this.downDolls = this.people.filter((person) => person.isDown).map((p) => p.hitBox);

    for (const body of this.everything()) {
      body.update(delta, this.world);
    }
    this.forget(this.doomed);
    this.doomed = [];
    this.chant(delta);
    this.updateBullets(delta);
    this.updatePieces(delta);
    this.sweep();
    this.handOutItems();
    this.swing(delta);
    this.trackDrag();
    this.forget(this.everything().filter((body) => body.gone));
    this.bubbles.update(delta, AREA);
  }

  /** Everything in the area, from the back to the front. */
  private everything(): Body[] {
    return [...this.blocks, ...this.people, ...this.items];
  }

  /**
   * What is solid for `except`: the building pieces, and for a building piece also
   * the dolls lying on the ground, so that it lands on them and they stay under it.
   */
  private solidBoxes(except: Body): Box[] {
    const boxes = this.solids.filter((solid) => solid.body !== except).map((solid) => solid.box);
    if (!except.solid) return boxes;
    const own = except.box;
    // A piece that has just landed in a doll rides it down, instead of dropping through
    const dolls = this.downDolls.map((doll) => {
      const sunk = own.bottom - doll.top;
      const over = own.left < doll.right && own.right > doll.left;
      return over && sunk > 0 && sunk <= CRUSH.sink ? { ...doll, top: own.bottom } : doll;
    });
    return [...boxes, ...dolls];
  }

  /** Is a building piece lying on top of this doll (not just standing beside it)? */
  private pinned(person: Person): boolean {
    const body = person.hitBox;
    return this.solids.some(
      ({ box }) =>
        box.left < body.right &&
        box.right > body.left &&
        Math.abs(box.bottom - body.top) <= CRUSH.restGap,
    );
  }

  /**
   * A vehicle has moved `dx` sideways: whatever stands on it goes along, and so does
   * whatever stands on that.
   */
  private carry(carrier: Body, dx: number, depth = 0): void {
    if (dx === 0 || depth > 4) return;
    const under = carrier.box;
    for (const body of this.everything()) {
      if (body === carrier || !body.riding) continue;
      if (!standsOn(body.box, under, RIDE_GAP, Math.abs(dx))) continue;
      body.nudge(dx);
      this.carry(body, dx, depth + 1);
    }
  }

  /** Something heavy and fast runs into the tall pieces right at `box`: they fall over. */
  private shove(box: Box, direction: Facing): void {
    const reach = { ...box, left: box.left - TOPPLE.reach, right: box.right + TOPPLE.reach };
    for (const block of this.blocks) {
      if (block.canTopple && overlaps(reach, block.box)) block.topple(direction, this.world);
    }
  }

  private press(px: number, py: number): void {
    if (this.menu.covers(py)) {
      const pressed = this.menu.click(px, py);
      if (pressed === 'sound') {
        this.sfx.muted = !this.sfx.muted;
        this.menu.showSound(!this.sfx.muted);
      }
      if (pressed === 'clear') {
        this.forget(this.everything());
        this.clearBullets();
        this.clearMess();
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
    this.dragTrail = [];
    this.bringToFront(body);
  }

  /** Remember where the dragged thing has just been, so letting go can throw it. */
  private trackDrag(): void {
    const body = this.dragged;
    if (!body) {
      this.lastDragSpot = null;
      return;
    }
    const now = body.feet;
    this.lastDragSpot = now;
    const timeMs = this.time.now;
    this.dragTrail = recentSamples(
      [...this.dragTrail, { timeMs, x: now.x, y: now.y }],
      timeMs,
      TOSS.windowMs,
    );
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
      const deadly = person.hit(
        direction,
        this.solidBoxes(person),
        melee.damage,
        melee.pushSpeed,
        melee.wound,
      );
      this.showHit(person.feet.x, now.y - weapon.size.height / 2, deadly, 'clang');
      if (weapon instanceof Item && weapon.def.stick) {
        // It sinks in and stays there: the hand lets go of it
        weapon.stickInto(person, direction);
        this.dragged = null;
        this.lastDragSpot = null;
        return;
      }
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
    // A living doll let go over a vehicle with an empty seat gets in and drives
    if (body instanceof Person && !body.dead) {
      const middle = body.hitBox;
      const free = this.blocks.filter((block) => block.seatFree);
      const index = boxAt(
        free.map((block) => block.box),
        (middle.left + middle.right) / 2,
        (middle.top + middle.bottom) / 2,
      );
      const vehicle = index === null ? undefined : free[index];
      if (vehicle) {
        body.sitIn(vehicle);
        return;
      }
    }
    if (body instanceof Person || body instanceof Item) {
      const speed = throwSpeed(recentSamples(this.dragTrail, this.time.now, TOSS.windowMs));
      body.throwWith(speed.x, speed.y, this.solidBoxes(body));
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
        if (body instanceof Person || body instanceof Item || body instanceof Block) body.turn();
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
        if (body instanceof Item || body instanceof Block) body.toggleFuse();
        break;
      case 'fire':
        if (body instanceof Item) body.toggleFire();
        break;
      case 'drive':
        if (body instanceof Block) body.toggleDrive();
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
    if (choice.type === 'none') return;
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
      // A vehicle that leaves lets its driver out first
      if (body instanceof Block) body.ejectDriver();
      if (!(body instanceof Person)) continue;
      body.leaveSeat();
      if (body.holding) all.add(body.holding);
      body.stuckItems.forEach((item) => all.add(item));
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
      if (!bullet.shooter || !all.has(bullet.shooter)) return true;
      bullet.picture.destroy();
      return false;
    });
  }

  private shoot(
    shooter: Person | null,
    x: number,
    y: number,
    direction: Facing,
    gun: GunDef,
    aim: Spot = { x: direction, y: 0 },
    from: Body | null = null,
  ): void {
    this.sfx.shot();
    const picture = this.add
      .rectangle(x, y, BULLET.width, BULLET.height, BULLET.color)
      .setDepth(DEPTH.bullet);
    picture.rotation = Math.atan2(aim.y, aim.x);
    this.bullets.push({ x, y, aim, from, direction, gun, shooter, picture });
  }

  /** Bullets fly straight until they hit a doll, hit something solid, or leave the area. */
  private updateBullets(delta: number): void {
    this.bullets = this.bullets.filter((bullet) => {
      const fromX = bullet.x;
      const fromY = bullet.y;
      const step = bullet.gun.bulletSpeed * (delta / 1000);
      bullet.x += bullet.aim.x * step;
      bullet.y += bullet.aim.y * step;
      bullet.picture.setPosition(bullet.x, bullet.y);

      // Bullets hit every living doll in their way: standing, lying, falling or held in
      // the hand. A doll's own bullets fly past dolls of its color, and out of its vehicle.
      const { shooter } = bullet;
      const solids = this.solids.filter((solid) => solid.body !== bullet.from);
      const targets = this.people.filter(
        (person) =>
          !person.dead &&
          !person.seated &&
          person.canBePicked &&
          !(shooter && sameTeam(person.look, shooter.look)),
      );
      const boxes = [...solids.map((solid) => solid.box), ...targets.map((p) => p.hitBox)];
      const hit = segmentHit(fromX, fromY, bullet.x, bullet.y, boxes);
      const flownOut =
        bullet.x < AREA.left ||
        bullet.x > AREA.right ||
        bullet.y < AREA.top ||
        bullet.y > AREA.floorY;
      if (hit === null && !flownOut) return true;

      const struck = hit === null ? undefined : solids[hit]?.body;
      const victim = hit === null ? undefined : targets[hit - solids.length];
      if (struck instanceof Block) {
        if (struck.def.drive) this.sfx.clang();
        struck.shot(bullet.x, bullet.y, this.world);
      }
      if (victim) {
        const deadly = victim.shot(bullet.direction, this.solidBoxes(victim), bullet.gun.damage);
        this.showHit(bullet.x, bullet.y, deadly, 'none');
      }
      bullet.picture.destroy();
      return false;
    });
  }

  /**
   * An item that falls on a standing, empty-handed doll, or lies against one, goes
   * into the doll's hand.
   */
  private handOutItems(): void {
    for (const item of this.items) {
      if (!item.canBeTaken) continue;
      const dropper = item.droppedBy;
      if (dropper && !overlaps(item.box, dropper.box)) item.forgetDropper();
      const taker = this.people.find(
        (person) =>
          person !== item.droppedBy &&
          person.canBeHit &&
          !person.holding &&
          overlaps(item.box, person.box),
      );
      taker?.hold(item, this.solidBoxes(item));
    }
  }

  private clearBullets(): void {
    this.bullets.forEach((bullet) => bullet.picture.destroy());
    this.bullets = [];
  }

  /**
   * Something goes off with a blast: a bomb or a barrel. Dolls in the blast are hurt
   * and thrown back. Building pieces and loose items in the blast are gone, and
   * other bombs and barrels go off right after.
   */
  private explode(source: Body, blast: BlastDef): void {
    const { x, y } = source.feet;
    const middleY = y - source.size.height / 2;
    const caught = (body: Body): boolean =>
      body !== source && inBlast(x, middleY, body.box, blast.radius);

    for (const person of this.people) {
      if (!person.canBePicked || !caught(person)) continue;
      const direction = blastDirection(x, person.feet.x);
      person.hit(direction, this.solidBoxes(person), blast.damage, blast.pushSpeed, 'burn');
    }

    const blocks = this.blocks.filter(caught);
    const items = this.items.filter((item) => !item.isHeld && caught(item));
    for (const next of [...blocks, ...items]) {
      next.setOff(BLAST.chainMs);
    }
    // What the blast destroys bursts into pieces that fly away from it
    const destroyed = [
      ...blocks.filter((block) => !block.explosive),
      ...items.filter((item) => !item.def.bomb),
    ];
    for (const body of destroyed) {
      const away = blastDirection(x, body.feet.x) * DEBRIS.blastPush;
      this.crumble(body, away, -DEBRIS.blastLift);
    }
    this.crumble(source, 0, -DEBRIS.blastLift);
    this.forget(destroyed);

    this.sfx.blast();
    this.popUp(x, middleY, BLAST.emoji, BLAST.fontSize, BLAST.ms, BLAST.grow);
    this.cameras.main.shake(BLAST.ms / 2, 0.012);
  }

  /** While a monster is in the area, its little tune plays over and over, a note per beat. */
  private chant(delta: number): void {
    if (!this.blocks.some((block) => block.def.monster)) {
      this.chantMs = 0;
      this.chantBeat = 0;
      return;
    }
    this.chantMs += delta;
    const { beatMs, notes } = SOUND.chant;
    while (this.chantMs >= beatMs) {
      this.chantMs -= beatMs;
      this.sfx.note(notes[this.chantBeat % notes.length] ?? 0);
      this.chantBeat += 1;
    }
  }

  /** A laser beam flashes from one spot to another and fades, with its sound. */
  private beam(fromX: number, fromY: number, toX: number, toY: number): void {
    const beam = this.add.graphics().setDepth(LASER.depth);
    beam.lineStyle(LASER.width, LASER.color, 0.9);
    beam.lineBetween(fromX, fromY, toX, toY);
    beam.lineStyle(LASER.coreWidth, LASER.core);
    beam.lineBetween(fromX, fromY, toX, toY);
    this.tweens.add({
      targets: beam,
      alpha: 0,
      duration: LASER.ms,
      onComplete: () => {
        beam.destroy();
      },
    });
    this.sfx.zap();
  }

  /** A laser hits a doll: the doll takes the hit. */
  private zap(
    fromX: number,
    fromY: number,
    victim: Person,
    damage: number,
    pushSpeed: number,
  ): void {
    const body = victim.hitBox;
    const atX = (body.left + body.right) / 2;
    const atY = (body.top + body.bottom) / 2;
    this.beam(fromX, fromY, atX, atY);
    const direction: Facing = atX < fromX ? -1 : 1;
    const deadly = victim.hit(direction, this.solidBoxes(victim), damage, pushSpeed, 'burn');
    this.showHit(atX, atY, deadly, 'none');
  }

  /**
   * A laser hits a thing and burns it up: it turns straight to ash, whatever it was.
   * Nothing explodes and no pieces are left.
   */
  private zapThing(fromX: number, fromY: number, thing: Body): void {
    const box = thing.box;
    this.beam(fromX, fromY, (box.left + box.right) / 2, (box.top + box.bottom) / 2);
    this.burnToAsh(thing);
    this.sfx.crumble();
    // It is taken out of the game once everything has had its turn this frame
    this.doomed.push(thing);
  }

  /** Break something into small pieces of its own colors. They fly off with this push. */
  private crumble(body: Body, pushX: number, pushY: number): void {
    const colors = body.crumbs;
    if (colors.length === 0) return;
    const box = body.box;
    const count = crumbCount(box, DEBRIS.areaPerCrumb, DEBRIS.least, DEBRIS.most);
    for (const crumb of scatter(box, count, { ...DEBRIS.burst, pushX, pushY })) {
      const color = colors[Math.floor(Math.random() * colors.length)] ?? 0;
      const picture = this.add
        .rectangle(crumb.x, crumb.y, crumb.size, crumb.size, color)
        .setDepth(DEBRIS.depth);
      this.pieces.push({ crumb, picture, blood: null, lieMs: DEBRIS.lieMs, fadeMs: DEBRIS.fadeMs });
    }
    this.trimPieces();
  }

  /** Burn something to ash: a puff of gray flakes that drift down and are soon gone. */
  private burnToAsh(body: Body): void {
    const box = body.box;
    const count = crumbCount(box, ASH.areaPerFlake, ASH.least, ASH.most);
    for (const crumb of scatter(box, count, { ...ASH.burst, pushX: 0, pushY: ASH.lift })) {
      const color = ASH.colors[Math.floor(Math.random() * ASH.colors.length)] ?? 0;
      const picture = this.add
        .rectangle(crumb.x, crumb.y, crumb.size, crumb.size, color)
        .setDepth(DEBRIS.depth);
      this.pieces.push({ crumb, picture, blood: null, lieMs: ASH.lieMs, fadeMs: ASH.fadeMs });
    }
    this.trimPieces();
  }

  /** Blood from a wound: a spray of many drops, or a single drip. */
  private bleed(x: number, y: number, drops: number, color: number, spray: boolean): void {
    const burst = spray
      ? { ...BLOOD.spray, pushX: 0, pushY: BLOOD.sprayLift }
      : { ...BLOOD.drip, pushX: 0, pushY: 0 };
    const wound = { left: x - 4, right: x + 4, top: y - 4, bottom: y + 4 };
    for (const crumb of scatter(wound, drops, burst)) {
      const picture = this.add
        .circle(crumb.x, crumb.y, crumb.size / 2, color)
        .setDepth(DEBRIS.depth);
      this.pieces.push({ crumb, picture, blood: color, lieMs: 0, fadeMs: 0 });
    }
    this.trimPieces();
  }

  /** With too many pieces flying around, the oldest ones go. */
  private trimPieces(): void {
    const extra = this.pieces.length - DEBRIS.max;
    if (extra <= 0) return;
    this.pieces.splice(0, extra).forEach((piece) => piece.picture.destroy());
  }

  /**
   * Pieces fly, bounce, lie on the floor for a while and fade away. A drop of blood
   * that reaches the floor becomes a stain instead, and stains stay.
   */
  private updatePieces(delta: number): void {
    const physics = {
      ...DEBRIS.physics,
      floorY: AREA.floorY,
      left: AREA.left,
      right: AREA.right,
    };
    let stained = false;
    this.pieces = this.pieces.filter((piece) => {
      piece.crumb = crumbStep(piece.crumb, physics, delta);
      const { x, y, turn, ageMs } = piece.crumb;
      if (piece.blood !== null && y >= AREA.floorY) {
        this.stains = addDrop(this.stains, x, piece.blood, BLOOD.stain);
        stained = true;
        piece.picture.destroy();
        return false;
      }
      const alpha = crumbAlpha(ageMs, piece.lieMs, piece.fadeMs);
      if (alpha <= 0) {
        piece.picture.destroy();
        return false;
      }
      piece.picture.setPosition(x, y).setAlpha(alpha);
      piece.picture.rotation = turn;
      return true;
    });
    if (stained) this.drawStains();
  }

  /** A broom dragged along the floor wipes away the stains under it. */
  private sweep(): void {
    const broom = this.dragged;
    if (!(broom instanceof Item) || !broom.wipes || this.stains.length === 0) return;
    const box = broom.box;
    if (box.bottom < AREA.floorY - BLOOD.sweepHeight) return;
    const left = wipe(this.stains, box.left, box.right);
    if (left.length === this.stains.length) return;
    this.stains = left;
    this.drawStains();
  }

  private drawStains(): void {
    const g = this.stainLayer;
    const y = AREA.floorY + BLOOD.stainDrop;
    g.clear();
    for (const stain of this.stains) {
      g.fillStyle(stain.color, BLOOD.stainAlpha);
      g.fillEllipse(stain.x, y, stain.halfWidth * 2, BLOOD.stainHeight);
    }
  }

  /** Take away every flying piece and every stain. */
  private clearMess(): void {
    this.pieces.forEach((piece) => piece.picture.destroy());
    this.pieces = [];
    this.stains = [];
    this.drawStains();
  }

  private showHit(x: number, y: number, deadly: boolean, sound: HitSound): void {
    if (sound === 'punch') this.sfx.punch();
    if (sound === 'clang') this.sfx.clang();
    if (deadly) this.sfx.out();
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
