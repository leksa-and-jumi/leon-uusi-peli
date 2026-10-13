import Phaser from 'phaser';
import {
  ARENA,
  ALIVE,
  ASH,
  ASHEN,
  BLAST,
  BLOCKS,
  BLOOD,
  BULLET,
  CEILING,
  CLEANER,
  CHOMPER,
  COLORS,
  CRUSH,
  DEBRIS,
  DEPTH,
  DISSOLVE,
  DOUBLE_CLICK_MS,
  DROP_WEAPONS,
  DUEL,
  FIGHTERS,
  FIREWORK,
  FLAME,
  FLOOR,
  GEAR,
  GEAR_KINDS,
  GOLDEN_KINDS,
  GAME_HEIGHT,
  GAME_WIDTH,
  HINT,
  HIT_FX,
  ITEMS,
  LASER,
  LOB,
  MENU,
  PERSON,
  PHYSICS,
  PEOPLE,
  PICK_PADDING,
  type ItemKind,
  type PersonLook,
  PORTAL,
  POWER,
  POWER_KINDS,
  PICK_PADDING_TOUCH,
  QUAKE,
  RIDE_GAP,
  SEVER,
  SHADOW,
  SHARDS,
  SMOKE,
  STINK,
  TEAM,
  SOUND,
  SPARK,
  SWING,
  THINGS_MAX,
  THUNDER,
  WATER,
  TOPPLE,
  TOSS,
  type ActionId,
  type BlastDef,
  type BoltLook,
  type GunDef,
} from '../config';
import { Sfx } from '../audio/Sfx';
import { SHARP } from '../screen';
import { shadowOf } from '../logic/shadow';
import { drawFloor, drawWall } from '../objects/backdrop';
import { blastDirection, inBlast } from '../logic/blast';
import { addDrop, wipe, type Stain } from '../logic/blood';
import { jagged } from '../logic/bolt';
import { floatLine } from '../logic/fall';
import { pullStep } from '../logic/pull';
import { crumbAlpha, crumbCount, crumbStep, pickShard, scatter, type Crumb } from '../logic/debris';
import { onFloor, overlaps, standsOn, type Box } from '../logic/ground';
import { boxAt, isDoubleClick, type Click, type Spot } from '../logic/pick';
import { placeFeet, type PlaceArea } from '../logic/place';
import { fan, segmentHit } from '../logic/shot';
import { flameAt } from '../logic/fire';
import { steerFrom, takeSeat } from '../logic/duel';
import { pickDrop } from '../logic/drops';
import { waveKinds, waveSize } from '../logic/waves';
import { layOutArena } from '../logic/arena';
import {
  cleanerDue,
  heartsFor,
  NEW_MATCH,
  nextMatch,
  roundWon,
  unlockNext,
  type Match,
  type Seat,
} from '../logic/match';
import { loadGolden, saveGolden } from '../storage';
import { sameTeam } from '../logic/team';
import { recentSamples, throwSpeed, type DragSample } from '../logic/toss';
import { swingDirection, swingLands, swingSpeed } from '../logic/swing';
import type { Facing } from '../logic/walk';
import { ActionBubbles } from '../objects/ActionBubbles';
import { Block } from '../objects/Block';
import { Body } from '../objects/Body';
import { Item } from '../objects/Item';
import { Part } from '../objects/Part';
import { Person } from '../objects/Person';
import { SpawnMenu } from '../objects/SpawnMenu';
import type { HitSound, World } from '../objects/World';

const AREA: PlaceArea = {
  left: 0,
  right: GAME_WIDTH,
  top: MENU.height + CEILING.height,
  floorY: GAME_HEIGHT - FLOOR.height,
};

/** The keys of a two-player battle: left, right, jump and hit for each player. */
const DUEL_KEYS = ['A', 'D', 'W', 'F', 'G', 'LEFT', 'RIGHT', 'UP', 'ENTER', 'K'] as const;

/** The two kinds of battle: against each other, or together against enemies. */
type BattleMode = 'versus' | 'team';
type DuelKey = (typeof DUEL_KEYS)[number];

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
  picture: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Arc;
  /** How far it has flown. A flame only gets so far. */
  flown: number;
}

/** A flying piece of something that broke, or a drop of blood (then `blood` is its color). */
interface Piece {
  crumb: Crumb;
  picture: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Arc | Phaser.GameObjects.Triangle;
  blood: number | null;
  /** How see-through it is by itself (glass), before it starts to fade. Not at all when left out. */
  alpha?: number;
  /** How long it lies there before it starts to fade, and how long fading takes. */
  lieMs: number;
  fadeMs: number;
  /** A flake of ash in the wind hardly falls: it has a gravity of its own. */
  gravity?: number;
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
  /** The parts that have been cut off dolls and lie around. */
  private parts: Part[] = [];
  private bullets: Bullet[] = [];
  private pieces: Piece[] = [];
  /** Blood on the floor. It stays until it is wiped away with the broom. */
  private stains: Stain[] = [];
  private stainLayer!: Phaser.GameObjects.Graphics;
  private shadowLayer!: Phaser.GameObjects.Graphics;
  /**
   * A two-player battle: the doll of each player (or `null`), the number that hangs
   * over each of them, the keys the players use, and the reminder of which keys those are.
   */
  private players: (Person | null)[] = [null, null];
  private playerMarks: Phaser.GameObjects.Text[] = [];
  private duelKeys: Record<DuelKey, Phaser.Input.Keyboard.Key> | null = null;
  private duelHint: Phaser.GameObjects.Text | null = null;
  /**
   * How the battle stands, and the scoreboard that shows it. The look of each
   * player's doll, for the next round. While a round is over: the time left until the
   * next one starts, and whether that round won the whole match. And how many golden
   * weapons have been won so far.
   */
  private match: Match = NEW_MATCH;
  private scoreBoard!: Phaser.GameObjects.Text;
  private seatLooks: PersonLook[] = [];
  private roundOver: { ms: number; matchWon: boolean } | null = null;
  /**
   * The kind of battle that is on, if one is. The buttons to pick it with, while they
   * are open. And how a team game stands: the wave, the enemies put out so far, the
   * time left until the next wave, and the enemies of this wave.
   */
  private mode: BattleMode | null = null;
  private modeMenu: Phaser.GameObjects.Container | null = null;
  private modeButtons: { mode: BattleMode; box: Box }[] = [];
  private team = { wave: 0, kills: 0, restMs: 0, enemies: [] as Person[] };
  private readonly counted = new WeakSet<Person>();
  /**
   * The cleaning lady, while she is at work: how long she has been at it, how long she
   * still stops for the body she is throwing out, where she was a moment ago, and what
   * she has thrown out already. How many rounds this battle has had, and after which
   * round (or wave) she last came.
   */
  private cleaning: {
    granny: Person;
    ms: number;
    /** The body she has got to, and the time left of bending down for it and throwing it. */
    throwing: { body: Body; ms: number; thrown: boolean } | null;
    lastX: number;
    thrown: Set<Body>;
  } | null = null;
  private roundsDone = 0;
  private cleanedAt = 0;
  /** In a team game: the last wave that was counted as a round, once it was beaten. */
  private countedWave = 0;
  /** The boss of a boss wave, while it is in the game. And the building pieces of this round's arena. */
  private boss: Block | null = null;
  private arena: Block[] = [];
  /** Time left until the next thing falls from the sky in a battle, and the things that have fallen. */
  private dropMs = 0;
  private dropped: Item[] = [];
  private unlocked = 0;
  /** When each doll was last burnt by a stream of fire. */
  private readonly lastBurnt = new WeakMap<Person, number>();
  /**
   * The clouds stink bombs have left: where, how big, how long each still hangs there
   * (`ms`), how often it hurts, and the time saved up toward its next hurt and its next puff.
   */
  private fumes: {
    x: number;
    y: number;
    radius: number;
    ms: number;
    everyMs: number;
    hurtMs: number;
    puffMs: number;
  }[] = [];
  private floorShadowLayer!: Phaser.GameObjects.Graphics;
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
  /** A click on a pool that puts a new thing in, unless a second click makes it a double-click. */
  private spawnSoon: { x: number; y: number; atMs: number } | null = null;
  /** When the thunder hammer last called down lightning. */
  private lastThunderMs = -Infinity;
  /** The full-screen button was pressed: switch when the press is let go. */
  private fullScreenAsked = false;
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
    this.parts = [];
    this.bullets = [];
    this.pieces = [];
    this.stains = [];
    this.fumes = [];
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
      landed: (fallSpeed, x, y) => {
        const { quietestFall, loudestFall } = SOUND.thud;
        this.sfx.thud((fallSpeed - quietestFall) / (loudestFall - quietestFall));
        // A hard landing kicks up a little dust
        if (x !== undefined && y !== undefined && fallSpeed >= ALIVE.dust.minSpeed) {
          this.world.sparkle(x, Math.min(y, AREA.floorY) - 6, ALIVE.dust.color);
        }
      },
      shoot: (shooter, x, y, direction, gun, aim, from) => {
        this.shoot(shooter, x, y, direction, gun, aim, from);
      },
      explode: (source, blast) => {
        this.explode(source, blast);
      },
      zap: (fromX, fromY, victim, damage, pushSpeed, spark) => {
        this.zap(fromX, fromY, victim, damage, pushSpeed, spark);
      },
      sever: (picture, lift, reach, direction, gentle) => {
        this.sever(picture, lift, reach, direction, gentle);
      },
      thunder: (source, spare) => {
        this.thunder(source, spare);
      },
      spring: (left, right, groundY) => {
        const trampoline = this.blocks.find((block) => {
          const box = block.box;
          const under = Math.abs(box.top - groundY) <= PHYSICS.groundSlack;
          return block.def.spring && block.carries && under && box.left < right && box.right > left;
        });
        if (!trampoline?.def.spring) return null;
        trampoline.boing();
        this.sfx.boing();
        return trampoline.def.spring;
      },
      floatLine: (x, depth) => floatLine(x, depth, this.pools()),
      splash: (x, y) => {
        this.bleed(x, y, WATER.splashDrops, BLOCKS.water.colors.fill, true);
        this.sfx.splash();
      },
      burn: (thing) => {
        if (this.doomed.includes(thing)) return;
        this.burnToAsh(thing);
        this.sfx.crumble();
        this.doomed.push(thing);
      },
      blowAsh: (spots, direction, starting) => {
        if (starting) this.sfx.wind();
        this.blowAsh(spots, direction);
      },
      smash: (thing, direction) => {
        this.crumble(thing, direction * DEBRIS.blastPush, -DEBRIS.blastLift);
        this.sfx.crumble();
        this.doomed.push(thing);
      },
      quake: () => {
        this.cameras.main.shake(QUAKE.ms, QUAKE.strength);
        this.sfx.thud(1);
      },
      fling: (kind, x, y, speedX, speedY) => {
        const item = new Item(this, kind, x, y);
        this.items.push(item);
        // A bomb that is hurled is armed: it goes off where it comes down
        if (item.def.bomb) item.lob(speedX, speedY, this.solidBoxes(item), LOB.fuseMs);
        else item.fling(speedX, speedY, this.solidBoxes(item));
        if (this.blocks.length + this.items.length > THINGS_MAX) this.forgetOldest(this.items);
      },
      fireworks: (x, y) => {
        const spot = { left: x - 6, right: x + 6, top: y - 6, bottom: y + 6 };
        const burst = { ...FIREWORK.burst, pushX: 0, pushY: FIREWORK.lift };
        for (const crumb of scatter(spot, FIREWORK.sparks, burst)) {
          const color = FIREWORK.colors[Math.floor(Math.random() * FIREWORK.colors.length)] ?? 0;
          const picture = this.add.circle(crumb.x, crumb.y, crumb.size / 2, color);
          picture.setDepth(HIT_FX.depth);
          const { lieMs, fadeMs } = FIREWORK;
          this.pieces.push({ crumb, picture, blood: null, lieMs, fadeMs });
        }
        this.trimPieces();
        this.sfx.blast();
      },
      note: (pitch) => {
        this.sfx.note(pitch);
      },
      smoke: (x, y) => {
        this.puff(x, y);
      },
      spark: (x, y) => {
        const reach = (): number => (Math.random() * 2 - 1) * THUNDER.sparkReach;
        this.bolt(x, y, x + reach(), y + reach(), SPARK);
      },
      flash: (fromX, fromY, toX, toY, spark) => {
        if (!spark) {
          this.beam(fromX, fromY, toX, toY);
          return;
        }
        this.bolt(fromX, fromY, toX, toY, SPARK);
        this.sfx.zap();
      },
      portal: (x, y) => {
        this.openPortal(x, y);
      },
      sparkle: (x, y, color) => {
        const { count, spread, rise, radius, ms, depth } = POWER.sparkle;
        for (let i = 0; i < count; i++) {
          const startX = x + (Math.random() * 2 - 1) * spread;
          const startY = y + (Math.random() * 2 - 1) * spread;
          const size = radius.min + Math.random() * (radius.max - radius.min);
          const dot = this.add.circle(startX, startY, size, color).setDepth(depth);
          this.tweens.add({
            targets: dot,
            y: startY - rise * (0.5 + Math.random() * 0.5),
            alpha: 0,
            duration: ms * (0.6 + Math.random() * 0.4),
            onComplete: () => {
              dot.destroy();
            },
          });
        }
      },
      monsters: () =>
        this.blocks.filter(
          ({ def }) => def.monster !== undefined && def.monster.ghost === undefined,
        ),
      things: (self) => [
        ...this.blocks.filter((block) => block !== self && block.canBePicked && !block.def.liquid),
        ...this.items.filter((item) => item.canBePicked && !item.isHeld),
        ...this.parts.filter((part) => part.canBePicked),
      ],
      zapThing: (fromX, fromY, thing) => {
        this.zapThing(fromX, fromY, thing);
      },
      swallow: (by, victim) => {
        this.swallow(by, victim);
      },
      spook: () => {
        this.sfx.spook();
      },
      breakApart: (body, pushX, pushY) => {
        this.crumble(body, pushX, pushY);
        this.sfx.shatter();
      },
      bleed: (x, y, drops, color, spray) => {
        this.bleed(x, y, drops, color, spray);
      },
      gearHit: (x, y, colors, broke) => {
        this.sfx.clang();
        if (!broke) return;
        this.sfx.shatter();
        const spot = { left: x - 10, right: x + 10, top: y - 10, bottom: y + 10 };
        const burst = { ...DEBRIS.burst, pushX: 0, pushY: -DEBRIS.blastLift / 2 };
        for (const crumb of scatter(spot, GEAR.crumbs, burst)) {
          const color = colors[Math.floor(Math.random() * colors.length)] ?? 0;
          const picture = this.add
            .rectangle(crumb.x, crumb.y, crumb.size, crumb.size, color)
            .setDepth(DEBRIS.depth);
          this.pieces.push({
            crumb,
            picture,
            blood: null,
            lieMs: DEBRIS.lieMs,
            fadeMs: DEBRIS.fadeMs,
          });
        }
        this.trimPieces();
      },
    };

    // The game is drawn with more pixels than its own size: zoomed in to fill them all
    this.cameras.main.setZoom(SHARP).centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    const { touch } = this.sys.game.device.input;
    drawWall(this.add.graphics(), { ...AREA, bottom: AREA.floorY });
    this.shadowLayer = this.add.graphics().setDepth(DEPTH.shadow);
    drawFloor(this.add.graphics(), 0, AREA.floorY, GAME_WIDTH);
    this.add.rectangle(0, MENU.height, GAME_WIDTH, CEILING.height, CEILING.color).setOrigin(0);
    this.add.rectangle(0, AREA.top - 2, GAME_WIDTH, 2, CEILING.edge).setOrigin(0);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - HINT.fromBottom, touch ? HINT.touchText : HINT.text, {
        fontSize: HINT.fontSize,
        color: COLORS.text,
        align: 'center',
      })
      .setOrigin(0.5)
      .setResolution(SHARP)
      .setDepth(DEPTH.floorCover + 2);

    // The floor once more, in front of everything in the area: what sinks into it is
    // hidden. The stains on it are drawn on top of that.
    drawFloor(this.add.graphics(), 0, AREA.floorY, GAME_WIDTH).setDepth(DEPTH.floorCover);
    this.floorShadowLayer = this.add.graphics().setDepth(DEPTH.floorCover + 0.5);
    this.stainLayer = this.add.graphics().setDepth(DEPTH.floorCover + 1);
    this.menu = new SpawnMenu(this);
    this.bubbles = new ActionBubbles(this);
    this.players = [null, null];
    this.duelHint = null;
    this.match = NEW_MATCH;
    this.roundOver = null;
    this.mode = null;
    this.modeMenu = null;
    this.modeButtons = [];
    this.boss = null;
    this.arena = [];
    this.cleaning = null;
    this.roundsDone = 0;
    this.cleanedAt = 0;
    this.countedWave = 0;
    this.team = { wave: 0, kills: 0, restMs: TEAM.firstMs, enemies: [] };
    this.dropMs = DUEL.drops.firstMs;
    this.dropped = [];
    this.seatLooks = DUEL.dolls.map(
      ({ look }) => PEOPLE[look] ?? { body: 0xd9b382, joint: 0x8a6a45 },
    );
    this.scoreBoard = this.add
      .text(GAME_WIDTH / 2, AREA.top + DUEL.score.down, '', {
        fontSize: DUEL.score.fontSize,
        fontStyle: 'bold',
        color: COLORS.text,
        stroke: DUEL.mark.stroke,
        strokeThickness: DUEL.mark.strokeWidth + 1,
      })
      .setOrigin(0.5)
      .setResolution(SHARP)
      .setDepth(DUEL.hint.depth)
      .setVisible(false);
    // The golden weapons won before on this device are in the menu from the start
    this.unlocked = loadGolden(GOLDEN_KINDS.length);
    this.menu.setUnlocked(this.unlocked);
    this.playerMarks = DUEL.colors.map((color, seat) =>
      this.add
        .text(0, 0, `${String(seat + 1)}\n▼`, {
          fontSize: DUEL.mark.fontSize,
          fontStyle: 'bold',
          color,
          align: 'center',
          stroke: DUEL.mark.stroke,
          strokeThickness: DUEL.mark.strokeWidth,
        })
        .setOrigin(0.5, 1)
        .setResolution(SHARP)
        .setDepth(DUEL.hint.depth)
        .setVisible(false),
    );
    const keys = this.input.keyboard?.addKeys(DUEL_KEYS.join(','));
    this.duelKeys = keys ? (keys as Record<DuelKey, Phaser.Input.Keyboard.Key>) : null;

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.sfx.unlock();
      // A finger is thicker than a mouse pointer: things are easier to grab with it
      Body.pickPadding = pointer.wasTouch ? PICK_PADDING_TOUCH : PICK_PADDING;
      this.press(pointer.x / SHARP, pointer.y / SHARP);
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.dragged?.dragTo(pointer.x / SHARP, pointer.y / SHARP, AREA);
    });
    this.input.on('pointerup', () => {
      if (this.fullScreenAsked) {
        this.fullScreenAsked = false;
        this.scale.toggleFullscreen();
      }
      this.letGo();
    });
    this.input.on('pointerupoutside', () => {
      this.letGo();
    });
  }

  update(_time: number, delta: number): void {
    this.world.people = this.people;
    this.steerPlayers(delta);
    // A piece that leans on something is a flight of steps: several boxes for one body
    this.solids = this.blocks
      .filter((block) => block.carries)
      .flatMap((block) => block.solidParts.map((box) => ({ body: block, box })));

    this.downDolls = this.people.filter((person) => person.isDown).map((p) => p.hitBox);

    for (const body of this.everything()) {
      body.update(delta, this.world);
    }
    this.pullIn(delta);
    this.pullMetal(delta);
    if (this.spawnSoon && this.time.now - this.spawnSoon.atMs > DOUBLE_CLICK_MS) {
      const { x, y } = this.spawnSoon;
      this.spawnSoon = null;
      this.spawn(x, y);
    }
    this.forget(this.doomed);
    this.doomed = [];
    this.chant(delta);
    this.updateBullets(delta);
    this.updatePieces(delta);
    this.updateFumes(delta);
    this.dropFromSky(delta);
    this.runTeamGame(delta);
    this.sweep();
    this.handOutItems();
    this.swing(delta);
    this.pound(delta);
    this.trackDrag();
    this.forget(this.everything().filter((body) => body.gone));
    this.drawShadows();
    this.markPlayers();
    this.bubbles.update(delta, AREA);
  }

  /**
   * A soft shadow under everything, where the wall meets the floor: fainter and wider
   * the higher up the thing is. Not under what is only light, mist or liquid. The half
   * on the wall is behind everything; the half on the floor is on top of the floor.
   */
  private drawShadows(): void {
    const onWall = this.shadowLayer.clear();
    const onFloor = this.floorShadowLayer.clear();
    const halfOval = (
      g: Phaser.GameObjects.Graphics,
      x: number,
      halfWidth: number,
      height: number,
    ): void => {
      g.beginPath();
      for (let corner = 0; corner <= SHADOW.corners; corner++) {
        const angle = (corner / SHADOW.corners) * Math.PI;
        const px = x + Math.cos(angle) * halfWidth;
        const py = AREA.floorY + Math.sin(angle) * height;
        if (corner === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.closePath();
      g.fillPath();
    };
    for (const body of this.everything()) {
      if (body instanceof Item && body.isHeld) continue;
      if (body instanceof Block) {
        const { liquid, hole, cloud, monster } = body.def;
        if (liquid || hole || cloud || monster?.ghost) continue;
      }
      const shadow = shadowOf(body.box, AREA.floorY, SHADOW);
      if (!shadow) continue;
      for (const ring of SHADOW.rings) {
        const alpha = shadow.alpha / SHADOW.rings.length;
        halfOval(
          onWall.fillStyle(0x000000, alpha),
          shadow.x,
          shadow.halfWidth * ring,
          -SHADOW.up * ring,
        );
        halfOval(
          onFloor.fillStyle(0x000000, alpha),
          shadow.x,
          shadow.halfWidth * ring,
          SHADOW.down * ring,
        );
      }
    }
  }

  /**
   * The battle button. With no battle on, it puts in a doll for each player and gives
   * them to the players. With one on, it ends it: the dolls do as they like again.
   */
  private toggleDuel(): void {
    if (this.players.some((doll) => doll !== null)) {
      this.seat([null, null]);
      return;
    }
    if (this.modeMenu) this.closeModeMenu();
    else this.openModeMenu();
  }

  /** Two big buttons in the middle of the area: a battle against each other, or a team game. */
  private openModeMenu(): void {
    const { width, height, gap, radius, fill, edge, fontSize, depth, labels } = DUEL.modes;
    const middleX = (AREA.left + AREA.right) / 2;
    const middleY = (AREA.top + AREA.floorY) / 2;
    const panel = this.make.graphics({}, false);
    const parts: Phaser.GameObjects.GameObject[] = [panel];
    this.modeButtons = (['versus', 'team'] as const).map((mode, index) => {
      const left = middleX + (index === 0 ? -gap / 2 - width : gap / 2);
      const top = middleY - height / 2;
      panel.fillStyle(edge);
      panel.fillRoundedRect(left - 4, top - 4, width + 8, height + 8, radius + 3);
      panel.fillStyle(fill);
      panel.fillRoundedRect(left, top, width, height, radius);
      parts.push(
        this.make
          .text(
            {
              x: left + width / 2,
              y: middleY,
              text: labels[mode],
              style: { fontSize, color: COLORS.text, align: 'center', fontStyle: 'bold' },
            },
            false,
          )
          .setOrigin(0.5)
          .setResolution(SHARP),
      );
      return { mode, box: { left, right: left + width, top, bottom: top + height } };
    });
    this.modeMenu = this.add.container(0, 0, parts).setDepth(depth);
  }

  private closeModeMenu(): void {
    this.modeMenu?.destroy();
    this.modeMenu = null;
    this.modeButtons = [];
  }

  /** Start a battle of this kind: a doll drops in for each player. */
  private startBattle(mode: BattleMode): void {
    this.mode = mode;
    this.team = { wave: 0, kills: 0, restMs: TEAM.firstMs, enemies: [] };
    this.roundsDone = 0;
    this.cleanedAt = 0;
    this.countedWave = 0;
    this.seatLooks = DUEL.dolls.map(
      ({ look }) => PEOPLE[look] ?? { body: 0xd9b382, joint: 0x8a6a45 },
    );
    // A team game builds its arena when the first wave comes
    if (mode === 'versus') this.buildArena();
    this.seat(this.dropInDolls());
  }

  /**
   * Build this round's arena: what is left of the last one goes, and a new one is
   * put up, a few things built of building pieces, the same on both sides of the
   * middle and different every time.
   */
  private buildArena(): void {
    this.forget(this.arena.filter((piece) => this.blocks.includes(piece)));
    const middle = (AREA.left + AREA.right) / 2;
    this.arena = layOutArena(BLOCKS, ARENA).map(({ kind, dx, up }) => {
      const piece = new Block(this, kind, middle + dx, AREA.floorY - up);
      this.blocks.push(piece);
      return piece;
    });
    while (this.blocks.length + this.items.length > THINGS_MAX) this.forgetOldest(this.items);
    // Nobody ends up inside the new pieces, or under them: whoever was standing where
    // one is now stands on top of it
    for (const person of this.people) {
      const body = person.box;
      const tops = this.arena
        .map((piece) => piece.box)
        .filter((box) => box.left < body.right && box.right > body.left && box.top < body.bottom)
        .map((box) => box.top);
      if (tops.length > 0) person.liftOnto(Math.min(...tops) - 1);
    }
  }

  /** A new doll for one player, where a round starts, looking like that player's last one. */
  private dropInDoll(seat: number): Person {
    const across = DUEL.dolls[seat]?.across ?? 0.5;
    const x = AREA.left + (AREA.right - AREA.left) * across;
    const look = this.seatLooks[seat] ?? { body: 0xd9b382, joint: 0x8a6a45 };
    // It drops in from above, so that it lands on top of whatever is built there
    const doll = new Person(this, look, x, AREA.top + PERSON.height + 10);
    this.people.push(doll);
    return doll;
  }

  /**
   * A team game, wave after wave. Every enemy that is put out counts. When none of a
   * wave is left, the next one drops in after a short rest: the old enemies go, a
   * player whose doll is out gets a new one, and the new wave is a little bigger and
   * has one more kind of fighter in it than the last.
   */
  private runTeamGame(delta: number): void {
    const playing = this.mode === 'team' && !this.roundOver && this.players.every((doll) => doll);
    if (!playing || this.cleaning) return;
    const team = this.team;
    team.enemies = team.enemies.filter((enemy) => this.people.includes(enemy));
    const out = team.enemies.filter((enemy) => enemy.dead && !this.counted.has(enemy));
    out.forEach((enemy) => this.counted.add(enemy));
    team.kills += out.length;
    if (this.boss && !this.blocks.includes(this.boss)) {
      // The boss is out
      this.boss = null;
      team.kills += TEAM.boss.kills;
      this.showScore();
    }
    if (out.length > 0) this.showScore();
    if (this.boss || team.enemies.some((enemy) => !enemy.dead)) return;
    team.restMs -= delta;
    if (team.restMs > 0) return;
    if (team.wave > 0 && this.countedWave !== team.wave) {
      // The wave that has just been beaten is a round that is over
      this.countedWave = team.wave;
      this.roundsDone += 1;
    }
    if (cleanerDue(this.roundsDone, CLEANER.everyRounds, this.cleanedAt)) {
      // After every fifth round, won or lost, the cleaning lady comes first
      this.startCleaning();
      return;
    }

    team.wave += 1;
    team.restMs = TEAM.restMs;
    this.forget(team.enemies);
    const inGame = (doll: Person | null): doll is Person =>
      !!doll && !doll.dead && this.people.includes(doll);
    const gone = this.players.filter((doll): doll is Person => !!doll && !inGame(doll));
    if (gone.length > 0) {
      this.forget(gone.filter((doll) => this.people.includes(doll)));
      this.seat(this.players.map((doll, seat) => (inGame(doll) ? doll : this.dropInDoll(seat))));
    }
    this.buildArena();
    // Every few waves the boss drops in, at one end of the area, with only a few fighters beside it
    const bossWave = team.wave % TEAM.boss.everyWaves === 0;
    if (bossWave) {
      const end = Math.random() < 0.5 ? AREA.left + TEAM.boss.edge : AREA.right - TEAM.boss.edge;
      this.boss = new Block(this, 'boss', end, AREA.floorY);
      this.blocks.push(this.boss);
    }
    const kinds = waveKinds(team.wave, TEAM.waves, FIGHTERS.length);
    const size = bossWave ? TEAM.boss.fighters : waveSize(team.wave, TEAM.waves);
    team.enemies = Array.from({ length: size }, (_, index) => {
      const look = FIGHTERS[Math.floor(Math.random() * kinds)] ?? this.seatLooks[0];
      // By turns at the left end and at the right end of the area
      const offset = TEAM.edge + Math.random() * TEAM.spread;
      const x = index % 2 === 0 ? AREA.left + offset : AREA.right - offset;
      const enemy = new Person(
        this,
        look ?? { body: 0x607d8b, joint: 0x263238 },
        x,
        AREA.top + PERSON.height + 10,
      );
      enemy.side = 'enemies';
      this.people.push(enemy);
      return enemy;
    });
    while (this.people.length > PERSON.max) this.forgetOldest(this.people);
    this.showScore();
  }

  /** Both players' dolls are out in a team game: it is over, and starts again in a moment. */
  private endTeamGame(): void {
    this.roundOver = { ms: DUEL.resetMs, matchWon: false };
    // A game that is lost is a round that is over, too
    this.roundsDone += 1;
    const { emoji, fontSize, ms, grow } = TEAM.over;
    this.popUp(
      (AREA.left + AREA.right) / 2,
      (AREA.top + AREA.floorY) / 2,
      emoji,
      fontSize,
      ms,
      grow,
    );
  }

  /** Put a new doll in for each player, where a round starts, looking like that player's last one. */
  private dropInDolls(): Person[] {
    const dolls = DUEL.dolls.map((_, seat) => this.dropInDoll(seat));
    while (this.people.length > PERSON.max) this.forgetOldest(this.people);
    return dolls;
  }

  /**
   * A round is over. The winner gets a point and a trophy over its doll (nobody, when
   * both went out at once). The fifth point wins the match, and a match that is won
   * unlocks the next golden weapon. The next round starts in a moment.
   */
  private endRound(winner: Seat | null): void {
    this.roundOver = { ms: DUEL.resetMs, matchWon: false };
    this.roundsDone += 1;
    const doll = winner === null ? null : this.players[winner];
    if (winner === null || !doll) return;
    const { emoji, fontSize, ms, grow, up } = DUEL.trophy;
    this.popUp(doll.feet.x, doll.box.top - up, emoji, fontSize, ms, grow);
    const { match, won } = roundWon(this.match, winner, DUEL.toWin);
    this.match = match;
    this.roundOver.matchWon = won;
    this.showScore();
    if (won) this.winPrize();
  }

  /**
   * A match has been won: fireworks, and a golden weapon drops in. If there is one
   * that hasn't been won before, it is that one, and it is in the menu from now on.
   * With all of them won already, it is one of them at random.
   */
  private winPrize(): void {
    const middle = (AREA.left + AREA.right) / 2;
    const fresh = GOLDEN_KINDS[this.unlocked];
    const any = GOLDEN_KINDS[Math.floor(Math.random() * GOLDEN_KINDS.length)];
    const kind = fresh ?? any;
    if (fresh) {
      this.unlocked = unlockNext(this.unlocked, GOLDEN_KINDS.length);
      saveGolden(this.unlocked);
      this.menu.setUnlocked(this.unlocked);
    }
    for (const side of [-1, 0, 1]) this.world.fireworks(middle + side * 150, AREA.top + 110);
    if (!kind) return;
    const feet = placeFeet(middle, AREA.top + DUEL.prizeDown, AREA, ITEMS[kind]);
    this.items.push(new Item(this, kind, feet.x, feet.y));
  }

  /**
   * The next round: the dolls of the last one go (what they held stays in the area),
   * and a new doll drops in for each player. After a match that was won, the score
   * starts from nothing again.
   */
  private newRound(): void {
    const matchWon = this.roundOver?.matchWon ?? false;
    this.roundOver = null;
    if (matchWon) this.match = nextMatch(this.match);
    if (this.mode === 'team') {
      // A team game that is over starts again from the first wave, with no enemies left
      this.forget(this.team.enemies.filter((enemy) => this.people.includes(enemy)));
      if (this.boss && this.blocks.includes(this.boss)) this.forget([this.boss]);
      this.boss = null;
      this.countedWave = 0;
      this.team = { wave: 0, kills: 0, restMs: TEAM.firstMs, enemies: [] };
    }
    const old = this.players.filter(
      (doll): doll is Person => doll !== null && this.people.includes(doll),
    );
    for (const doll of old) doll.dropItem(this.solidBoxes(doll));
    this.forget(old);
    // Every round of a battle against each other has an arena of its own
    if (this.mode !== 'team') this.buildArena();
    this.seat(this.dropInDolls());
  }

  /**
   * While two players are in a battle, things fall from the sky every now and then:
   * mostly a weapon, sometimes a power orb, now and then the mega power or a golden
   * weapon that has been won. When too many of them lie around, the oldest one goes.
   */
  private dropFromSky(delta: number): void {
    const battle = this.players.every((doll) => doll !== null) && !this.roundOver;
    if (!battle) return;
    this.dropMs -= delta;
    if (this.dropMs > 0) return;
    const { everyMs, margin, down, most, shares, sparkle } = DUEL.drops;
    this.dropMs = everyMs.min + Math.random() * (everyMs.max - everyMs.min);
    const kind = pickDrop<ItemKind>([
      { share: shares.weapon, things: DROP_WEAPONS },
      { share: shares.power, things: POWER_KINDS.filter((power) => power !== 'megaOrb') },
      { share: shares.mega, things: ['megaOrb'] },
      { share: shares.golden, things: GOLDEN_KINDS.slice(0, this.unlocked) },
    ]);
    if (!kind) return;
    const x = AREA.left + margin + Math.random() * (AREA.right - AREA.left - margin * 2);
    const feet = placeFeet(x, AREA.top + down, AREA, ITEMS[kind]);
    const item = new Item(this, kind, feet.x, feet.y);
    this.items.push(item);
    this.world.sparkle(feet.x, feet.y - ITEMS[kind].height / 2, sparkle);
    // What a doll has taken, or what has gone some other way, doesn't count any more
    this.dropped = [...this.dropped.filter((one) => this.items.includes(one)), item];
    const lying = this.dropped.filter((one) => !one.isHeld);
    const oldest = lying.length > most ? lying[0] : undefined;
    if (oldest) this.forget([oldest]);
    if (this.blocks.length + this.items.length > THINGS_MAX) this.forgetOldest(this.items);
  }

  /**
   * The cleaning lady comes in at one end of the area, broom in hand. The arena is
   * taken down first, so that she has the whole floor to herself.
   */
  private startCleaning(): void {
    this.cleanedAt = this.roundsDone;
    this.forget(this.arena.filter((piece) => this.blocks.includes(piece)));
    this.arena = [];
    const x = AREA.left + CLEANER.edge;
    const granny = new Person(this, CLEANER.look, x, AREA.floorY);
    granny.safe = true;
    this.people.push(granny);
    const broom = new Item(this, 'broom', x, AREA.floorY - PERSON.height / 2);
    this.items.push(broom);
    granny.hold(broom, this.solidBoxes(broom));
    granny.steer(steerFrom(false, true, false, false));
    this.cleaning = { granny, ms: 0, throwing: null, lastX: x, thrown: new Set() };
  }

  /**
   * The cleaning lady at work: she walks across the area and sweeps the floor clean
   * under her. Every body and loose part she gets to, she stops at and throws out.
   * When she is across (or gone, or has taken far too long), the battle goes on.
   */
  private clean(delta: number): void {
    const job = this.cleaning;
    if (!job) return;
    const { granny } = job;
    job.ms += delta;
    const x = granny.feet.x;
    const swept = wipe(this.stains, x - CLEANER.reach, x + CLEANER.reach);
    if (swept.length !== this.stains.length) {
      this.stains = swept;
      this.drawStains();
    }
    const there = this.people.includes(granny);
    if (!there || x >= AREA.right - CLEANER.edge || job.ms > CLEANER.mostMs) {
      this.cleaning = null;
      if (there) {
        // Across: the last spots by the walls are done too, and off she goes
        this.stains = [];
        this.drawStains();
        this.forget([granny]);
      }
      // After a round that ended the game (or, against each other, any round) the next one starts now
      if (this.roundOver) this.newRound();
      return;
    }
    const throwing = job.throwing;
    if (throwing) {
      // She has bent down for a body: when she has hold of it, she throws it out with a swing of her arm
      throwing.ms -= delta;
      granny.steer(steerFrom(false, false, false, false));
      if (!throwing.thrown && throwing.ms <= CLEANER.throwMs) {
        throwing.thrown = true;
        if (throwing.body.canBePicked) throwing.body.throwAway(AREA);
        granny.perform('punch', CLEANER.throwMs);
        this.sfx.wind();
      }
      if (throwing.ms <= 0) job.throwing = null;
      return;
    }
    const lying: Body[] = [...this.people.filter((person) => person.dead), ...this.parts];
    const body = lying.find(
      (one) => !job.thrown.has(one) && one.canBePicked && Math.abs(one.feet.x - x) <= CLEANER.reach,
    );
    if (body) {
      job.thrown.add(body);
      job.throwing = { body, ms: CLEANER.bendMs + CLEANER.throwMs, thrown: false };
      granny.perform('slam', CLEANER.bendMs);
      return;
    }
    // Where her broom goes, a little dust flies up, and now and then the clean floor gleams behind her
    const every = (ms: number): boolean =>
      Math.floor(job.ms / ms) !== Math.floor((job.ms - delta) / ms);
    if (every(CLEANER.dustEveryMs)) {
      this.world.sparkle(x + CLEANER.broomAhead, AREA.floorY - 8, CLEANER.dust);
    }
    if (every(CLEANER.gleamEveryMs)) {
      this.world.sparkle(x - CLEANER.broomAhead, AREA.floorY - 10, CLEANER.gleam);
    }
    // Whatever is in her way, she hops over
    const stuck = Math.abs(x - job.lastX) < 0.05;
    job.lastX = x;
    granny.steer(steerFrom(false, true, stuck, false));
  }

  /**
   * The scoreboard: the rounds each player has won, a star by the one who won last,
   * and how many rounds win the match. It shows while two players are in a battle.
   */
  private showScore(): void {
    const battle = this.players.every((doll) => doll !== null) || this.roundOver !== null;
    this.scoreBoard.setVisible(battle);
    if (!battle) return;
    if (this.mode === 'team') {
      // A team game counts the waves and the enemies put out
      const { wave, kills } = TEAM.score;
      const boss = this.boss ? ` ${TEAM.boss.emoji}` : '';
      this.scoreBoard.setText(
        `${wave} ${String(this.team.wave)}${boss}      ${kills} ${String(this.team.kills)}`,
      );
      return;
    }
    const { star, sides, goal } = DUEL.score;
    const [first, second] = this.match.score;
    const mark = (seat: Seat): string => (this.match.last === seat ? star : '');
    this.scoreBoard.setText(
      `${mark(0)}${sides[0]} ${String(first)}  –  ${String(second)} ${sides[1]}${mark(1)}      ${goal} ${String(DUEL.toWin)}`,
    );
  }

  /** Give the players these dolls to steer (or `null` for none), and take every other doll back. */
  private seat(dolls: readonly (Person | null)[]): void {
    for (const doll of this.players) {
      if (!doll || dolls.includes(doll)) continue;
      doll.steer(null);
      doll.side = null;
    }
    const starting = this.players.every((doll) => doll === null);
    this.players = [...dolls];
    this.players.forEach((doll, seat) => {
      if (!doll) return;
      doll.steer(steerFrom(false, false, false, false));
      // In a team game the players are on the same side, and can't hurt each other
      doll.side = this.mode === 'team' ? 'players' : null;
      // The next round, this player's doll looks like this one
      this.seatLooks[seat] = doll.look;
    });
    const on = this.players.some((doll) => doll !== null);
    if (!on) {
      // The battle is over: the next one starts from nothing. The enemies that are
      // left are on nobody's side any more
      this.match = NEW_MATCH;
      this.roundOver = null;
      this.mode = null;
      for (const enemy of this.team.enemies) enemy.side = null;
      // The arena goes with the battle; a boss that is still there stays, as a monster like any other
      this.forget(this.arena.filter((piece) => this.blocks.includes(piece)));
      this.arena = [];
      this.boss = null;
      const granny = this.cleaning?.granny;
      this.cleaning = null;
      if (granny && this.people.includes(granny)) this.forget([granny]);
      this.team = { wave: 0, kills: 0, restMs: TEAM.firstMs, enemies: [] };
      this.duelHint?.destroy();
      this.duelHint = null;
    }
    this.menu.showDuel(on);
    this.showScore();
    if (on && starting) {
      this.showDuelHint();
      this.dropMs = DUEL.drops.firstMs;
    }
  }

  /** Show for a while which keys the players use. */
  private showDuelHint(): void {
    this.duelHint?.destroy();
    const { text, fontSize, down, ms, fadeMs, depth } = DUEL.hint;
    const hint = this.add
      .text(GAME_WIDTH / 2, AREA.top + down, text, {
        fontSize,
        color: COLORS.text,
        stroke: DUEL.mark.stroke,
        strokeThickness: DUEL.mark.strokeWidth,
      })
      .setOrigin(0.5)
      .setResolution(SHARP)
      .setDepth(depth);
    this.duelHint = hint;
    this.tweens.add({
      targets: hint,
      alpha: 0,
      delay: ms,
      duration: fadeMs,
      onComplete: () => {
        hint.destroy();
        if (this.duelHint === hint) this.duelHint = null;
      },
    });
  }

  /**
   * Pass on to each player's doll what its player is telling it with the keys. When a
   * doll is out or gone in a battle of two, the round is over: the other player has
   * won it, and the next round starts in a moment. A doll that is steered all alone
   * is just let go when it is out.
   */
  private steerPlayers(delta: number): void {
    if (this.cleaning) {
      this.clean(delta);
    } else if (this.roundOver) {
      this.roundOver.ms -= delta;
      // After every fifth round, whoever won it, the cleaning lady comes first
      const cleanFirst = cleanerDue(this.roundsDone, CLEANER.everyRounds, this.cleanedAt);
      if (this.roundOver.ms <= 0) {
        if (cleanFirst) this.startCleaning();
        else this.newRound();
      }
    }
    const keys = this.duelKeys;
    const inGame = (doll: Person | null | undefined): doll is Person =>
      !!doll && !doll.dead && this.people.includes(doll);
    const battle = this.players.every((doll) => doll !== null);
    this.players.forEach((doll, seat) => {
      if (!doll) return;
      if (!inGame(doll)) {
        // Counted already: it waits for the next round
        if (this.roundOver) return;
        if (this.mode === 'team') {
          // In a team game it waits for the next wave. With both out, the game is over
          if (!this.players.some(inGame)) this.endTeamGame();
          return;
        }
        const other: Seat = seat === 0 ? 1 : 0;
        if (battle) this.endRound(inGame(this.players[other]) ? other : null);
        else this.seat(this.players.map((sitting) => (sitting === doll ? null : sitting)));
        return;
      }
      if (!keys) return;
      const [left, right, jump, hit] =
        seat === 0
          ? [keys.A, keys.D, keys.W, keys.F]
          : [keys.LEFT, keys.RIGHT, keys.UP, keys.ENTER];
      doll.steer(
        steerFrom(left.isDown, right.isDown, Phaser.Input.Keyboard.JustDown(jump), hit.isDown),
      );
      // And one more key lets go of what it holds
      const drop = seat === 0 ? keys.G : keys.K;
      if (Phaser.Input.Keyboard.JustDown(drop)) doll.dropItem(this.solidBoxes(doll));
    });
  }

  /** The number of each player hangs over its doll. */
  private markPlayers(): void {
    this.playerMarks.forEach((mark, seat) => {
      const doll = this.players[seat];
      mark.setVisible(doll !== null && doll !== undefined);
      if (!doll) return;
      mark.setPosition(doll.feet.x, doll.box.top - DUEL.mark.up + 20);
      // Its lives as hearts, over the player's number
      const hearts = heartsFor(doll.livesLeft, DUEL.mark.heart, DUEL.mark.mostHearts);
      const text = `${hearts}\n${String(seat + 1)}\n▼`;
      if (mark.text !== text) mark.setText(text);
    });
  }

  /** Everything in the area, from the back to the front. */
  private everything(): Body[] {
    return [...this.blocks, ...this.people, ...this.parts, ...this.items];
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

  /** The pools of water that have come to rest: dolls float in them. */
  private pools(): Box[] {
    return this.blocks
      .filter((block) => block.def.liquid === 'water' && block.riding)
      .map((block) => block.box);
  }

  /**
   * Every black hole pulls in what is around it: dolls, items, pieces, vehicles and
   * monsters alike. What gets right to it is swallowed and gone. It leaves alone
   * what you are holding, other black holes, and things in a doll's hand or seat
   * (those come along with the doll or the vehicle).
   */
  private pullIn(delta: number): void {
    for (const hole of this.blocks) {
      const pull = hole.def.hole;
      if (!pull || !hole.canBePicked || hole === this.dragged) continue;
      const at = hole.box;
      const holeX = (at.left + at.right) / 2;
      const holeY = (at.top + at.bottom) / 2;
      for (const body of this.everything()) {
        if (body === this.dragged || !body.canBePicked || this.doomed.includes(body)) continue;
        if (body instanceof Block && (body.def.hole || body.def.liquid)) continue;
        if (body instanceof Item && body.isHeld) continue;
        if (body instanceof Person && body.seated) continue;
        const box = body instanceof Person ? body.hitBox : body.box;
        const middleX = (box.left + box.right) / 2;
        const middleY = (box.top + box.bottom) / 2;
        const step = pullStep(middleX, middleY, holeX, holeY, pull, delta);
        if (step === null) continue;
        if (step === 'eaten') {
          this.doomed.push(body);
          this.sfx.gulp();
        } else {
          body.tug(step.dx, step.dy, AREA);
        }
      }
    }
  }

  /**
   * Every magnet pulls in what is made of metal: weapons, steel, vehicles, robots and
   * knights. What gets to it sticks there. It leaves alone what you are holding, and
   * things in a doll's hand or seat.
   */
  private pullMetal(delta: number): void {
    for (const magnet of this.items) {
      const pull = magnet.def.magnet;
      if (!pull || !magnet.canBePicked) continue;
      const at = magnet.box;
      const magnetX = (at.left + at.right) / 2;
      const magnetY = (at.top + at.bottom) / 2;
      for (const body of this.everything()) {
        if (body === magnet || body === this.dragged || !body.metal || !body.canBePicked) continue;
        if (body instanceof Item && body.isHeld) continue;
        if (body instanceof Person && (body.seated || body.holding === magnet)) continue;
        const box = body instanceof Person ? body.hitBox : body.box;
        const middleX = (box.left + box.right) / 2;
        const middleY = (box.top + box.bottom) / 2;
        const step = pullStep(middleX, middleY, magnetX, magnetY, pull, delta);
        if (step === null) continue;
        // Right at the magnet it sticks: it is held there and doesn't fall
        if (step === 'eaten') body.tug(0, 0, AREA);
        else body.tug(step.dx, step.dy, AREA);
      }
    }
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
      // A browser only goes full screen when a finger or the mouse button lets go
      if (pressed === 'full') this.fullScreenAsked = true;
      if (pressed === 'sound') {
        this.sfx.muted = !this.sfx.muted;
        this.menu.showSound(!this.sfx.muted);
      }
      if (pressed === 'duel') this.toggleDuel();
      if (pressed === 'clear') {
        this.forget(this.everything());
        this.clearBullets();
        this.clearMess();
      }
      return;
    }

    if (this.modeMenu) {
      // The buttons to pick a battle with are open: a click on one starts it, any other click shuts them
      const picked = this.modeButtons.find(
        ({ box }) => px >= box.left && px <= box.right && py >= box.top && py <= box.bottom,
      );
      this.closeModeMenu();
      if (picked) this.startBattle(picked.mode);
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
    if (body instanceof Block && body.def.liquid) {
      // A pool can't be grabbed. A double-click opens its bubble (to drain it); a
      // single click goes through it, and puts a new thing in after a moment.
      const twice = isDoubleClick(this.lastClick, click, DOUBLE_CLICK_MS);
      this.lastClick = twice ? null : click;
      this.spawnSoon = null;
      if (twice && target === body) this.bubbles.close();
      else if (twice) this.bubbles.open(body);
      else if (target) this.bubbles.close();
      else this.spawnSoon = { x: px, y: py, atMs: this.time.now };
      return;
    }
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
      this.showHit(person.feet.x, now.y - weapon.size.height / 2, deadly, melee.sound ?? 'clang');
      if (weapon instanceof Item && weapon.def.stick) {
        // It sinks in and stays there: the hand lets go of it
        weapon.stickInto(person, direction);
        this.dragged = null;
        this.lastDragSpot = null;
        return;
      }
    }
  }

  /** The thunder hammer, slammed down onto the floor by hand, calls down lightning. */
  private pound(delta: number): void {
    const hammer = this.dragged;
    const thunder = hammer instanceof Item ? hammer.def.thunder : undefined;
    if (!hammer || !thunder || delta <= 0) return;
    const now = hammer.feet;
    const before = this.lastDragSpot ?? now;
    const down = ((now.y - before.y) / delta) * 1000;
    if (now.y >= AREA.floorY - 1 && down >= thunder.minSpeed) this.thunder(hammer);
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
    if (body instanceof Person || body instanceof Item || body instanceof Part) {
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
        if (body instanceof Person) this.dropFrom(body);
        this.bubbles.flash('drop');
        break;
      case 'walk':
      case 'dance':
      case 'angry':
        if (body instanceof Person) body.toggle(action);
        break;
      case 'jet':
        if (body instanceof Person) body.toggleJet();
        break;
      case 'play':
        if (body instanceof Person) this.seat(takeSeat(this.players, body));
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
      case 'gate':
        if (body instanceof Block) body.toggleGate();
        break;
      case 'bridge':
        if (body instanceof Block) body.toggleBridge(this.world);
        break;
    }
  }

  /** What a click at this point grabs: items first, then dolls, then building pieces. */
  private bodyUnder(px: number, py: number): Body | null {
    // A pool covers the whole floor: whatever else is under the click is picked before it
    const isPool = (body: Body): boolean => body instanceof Block && body.def.liquid !== undefined;
    const all = this.everything().filter((body) => body.canBePicked);
    const pickable = [...all.filter(isPool), ...all.filter((body) => !isPool(body))];
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
    if (choice.type === 'none' || choice.type === 'locked') return;
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
      const def = BLOCKS[choice.kind];
      const feet = placeFeet(px, py, AREA, def);
      // More of a pool that is there already makes it deeper. A new pool starts on the floor.
      const pool = def.liquid && this.blocks.find((block) => block.def.liquid === def.liquid);
      if (pool) {
        pool.deepen();
        return;
      }
      thing = new Block(this, choice.kind, feet.x, def.liquid ? AREA.floorY : feet.y);
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
    } else if (body instanceof Part) {
      this.parts = [...this.parts.filter((other) => other !== body), body];
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
      // An item that goes while a doll holds it (a stink bomb that went off) leaves an empty hand
      const holder = body instanceof Item ? body.heldBy : null;
      if (holder && !all.has(holder)) holder.lost(body as Item);
      if (this.dragged === body) this.dragged = null;
      if (this.bubbles.target === body) this.bubbles.close();
      if (this.lastClick?.target === body) this.lastClick = null;
      body.destroy();
    }
    this.people = this.people.filter((body) => !all.has(body));
    this.blocks = this.blocks.filter((body) => !all.has(body));
    this.items = this.items.filter((body) => !all.has(body));
    this.parts = this.parts.filter((body) => !all.has(body));
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
    // A flamethrower hisses; everything else bangs
    if (gun.flame) this.sfx.crumble();
    else this.sfx.shot();
    // A gun that fires bullets or shells flashes at its muzzle
    if (!gun.flame && !gun.frost && !gun.look) this.muzzleFlash(x, y, Math.atan2(aim.y, aim.x));
    // A cannon's shell is bigger and darker than a bullet; a flame or frost is a puff
    const look = gun.shell ?? gun.flame ?? gun.frost ?? gun.look ?? BULLET;
    for (const way of fan(aim, gun.pellets ?? 1, gun.spread ?? 0)) {
      if (gun.flame) {
        // A puff of fire is a ball of its own size, and no two fly quite the same way
        const turn = (Math.random() - 0.5) * FLAME.scatter;
        const cos = Math.cos(turn);
        const sin = Math.sin(turn);
        const wild = { x: way.x * cos - way.y * sin, y: way.x * sin + way.y * cos };
        const size = FLAME.sizes.min + Math.random() * (FLAME.sizes.max - FLAME.sizes.min);
        const ball = this.add.circle(x, y, (gun.flame.height / 2) * size, look.color);
        ball.setDepth(DEPTH.bullet);
        this.bullets.push({
          x,
          y,
          aim: wild,
          from,
          direction,
          gun,
          shooter,
          picture: ball,
          flown: 0,
        });
        continue;
      }
      const picture = this.add
        .rectangle(x, y, look.width, look.height, look.color)
        .setDepth(DEPTH.bullet);
      picture.rotation = Math.atan2(way.y, way.x);
      this.bullets.push({ x, y, aim: way, from, direction, gun, shooter, picture, flown: 0 });
    }
  }

  /** A flash at the muzzle of a gun that has just fired: a little star of light, gone at once. */
  private muzzleFlash(x: number, y: number, angle: number): void {
    const { ms, size, color, core, depth } = ALIVE.muzzle;
    const flash = this.add.graphics().setPosition(x, y).setDepth(depth);
    flash.rotation = angle;
    flash.fillStyle(color, 0.9);
    flash.fillTriangle(0, -size * 0.35, 0, size * 0.35, size * 1.3, 0);
    flash.fillTriangle(0, -size * 0.2, size * 0.5, -size * 0.75, size * 0.4, 0);
    flash.fillTriangle(0, size * 0.2, size * 0.5, size * 0.75, size * 0.4, 0);
    flash.fillStyle(core);
    flash.fillCircle(size * 0.15, 0, size * 0.28);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: ms,
      onComplete: () => {
        flash.destroy();
      },
    });
  }

  /** Bullets fly straight until they hit a doll, hit something solid, or leave the area. */
  private updateBullets(delta: number): void {
    this.bullets = this.bullets.filter((bullet) => {
      const fromX = bullet.x;
      const fromY = bullet.y;
      const step = bullet.gun.bulletSpeed * (delta / 1000);
      bullet.x += bullet.aim.x * step;
      bullet.y += bullet.aim.y * step;
      bullet.flown += step;
      bullet.picture.setPosition(bullet.x, bullet.y);
      const { flame } = bullet.gun;
      if (flame) {
        // Fire: the puff swells, goes from nearly white to yellow, orange, red and dark,
        // rises and fades. The young, bright puffs are in front of the old ones
        const age = bullet.flown / flame.reach;
        const now = flameAt(age, FLAME);
        const flicker = 1 + (Math.random() - 0.5) * FLAME.flicker;
        bullet.picture
          .setFillStyle(now.color, now.alpha)
          .setPosition(bullet.x, bullet.y - now.rise)
          .setScale(now.scale * flicker)
          .setDepth(DEPTH.bullet + 1 - Math.min(1, age));
      }

      // Bullets hit every living doll in their way: standing, lying, falling or held in
      // the hand. A doll's own bullets fly past dolls of its color, and out of its vehicle.
      const { shooter } = bullet;
      const solids = this.solids.filter((solid) => solid.body !== bullet.from);
      const targets = this.people.filter(
        (person) =>
          !person.dead &&
          !person.seated &&
          person.canBePicked &&
          !(shooter && (sameTeam(person.look, shooter.look) || shooter.friendOf(person))),
      );
      const boxes = [...solids.map((solid) => solid.box), ...targets.map((p) => p.hitBox)];
      const hit = segmentHit(fromX, fromY, bullet.x, bullet.y, boxes);
      const flownOut =
        bullet.x < AREA.left ||
        bullet.x > AREA.right ||
        bullet.y < AREA.top ||
        bullet.y > AREA.floorY;
      if (hit === null && flame && bullet.flown >= flame.reach) {
        // The flame has burnt out, and now and then a little smoke is left of it
        if (Math.random() < FLAME.smokeShare) this.puff(bullet.x, bullet.y - FLAME.rise);
        bullet.picture.destroy();
        return false;
      }
      if (hit === null && !flownOut) return true;

      const { shell } = bullet.gun;
      if (shell) {
        // A shell goes off where it hits. It doesn't hurt the tank it came out of.
        const atX = Phaser.Math.Clamp(bullet.x, AREA.left, AREA.right);
        const atY = Phaser.Math.Clamp(bullet.y, AREA.top, AREA.floorY);
        // Nor the doll that fired it from its hand.
        this.blastAt(atX, atY, shell.blast, null, bullet.from ?? bullet.shooter);
        bullet.picture.destroy();
        return false;
      }
      const struck = hit === null ? undefined : solids[hit]?.body;
      const victim = hit === null ? undefined : targets[hit - solids.length];
      const { frost } = bullet.gun;
      if (struck instanceof Block && flame) {
        // Fire sets off what explodes and burns up what is made of wood
        struck.setOff(BLAST.chainMs);
        if (struck.burns) this.world.burn(struck);
      } else if (struck instanceof Block && !frost) {
        if (struck.def.drive) this.sfx.clang();
        struck.shot(bullet.x, bullet.y, this.world);
      }
      if (victim && frost) {
        // Frost doesn't hurt: it freezes the doll solid
        victim.freeze(frost.ms);
      } else if (victim) {
        // In a stream of fire a doll isn't burnt by every single puff, only every now and then
        const every = flame?.burnEveryMs;
        const since = this.time.now - (this.lastBurnt.get(victim) ?? -Infinity);
        if (every === undefined || since >= every) {
          if (every !== undefined) this.lastBurnt.set(victim, this.time.now);
          const solids = this.solidBoxes(victim);
          const wound = flame ? 'burn' : (bullet.gun.wound ?? 'hole');
          const deadly = victim.shot(bullet.direction, solids, bullet.gun.damage, wound);
          this.showHit(bullet.x, bullet.y, deadly, 'none');
        }
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
    const putOn: Item[] = [];
    for (const item of this.items) {
      if (!item.canBeTaken) continue;
      const power = POWER_KINDS.find((one) => one === item.kind);
      if (power) {
        // A living doll that touches an orb takes its power, in place of the one it had
        const pupil = this.people.find(
          (person) => person.canLearn(power) && overlaps(item.box, person.box),
        );
        if (!pupil) continue;
        pupil.learn(power);
        putOn.push(item);
        continue;
      }
      const gear = item.def.gear;
      if (gear) {
        // Gear isn't held: a living doll that touches a piece puts it on, if it has room for it
        const wearer = this.people.find(
          (person) => person.canWear(gear.slot) && overlaps(item.box, person.box),
        );
        const kind = GEAR_KINDS.find((one) => one === item.kind);
        if (!wearer || !kind) continue;
        wearer.wear(kind);
        putOn.push(item);
        continue;
      }
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
    if (putOn.length === 0) return;
    this.forget(putOn);
    this.items = this.items.filter((item) => !putOn.includes(item));
  }

  /**
   * A doll lets go of what it holds. With nothing in its hand it takes off a piece of
   * its gear, the outermost one, which lands in front of it, as good as new. With no
   * gear on either, it lets go of its superpower.
   */
  private dropFrom(person: Person): void {
    if (person.holding) {
      person.dropItem(this.solidBoxes(person));
      return;
    }
    // With no gear on either, it gives up its superpower: the orb comes out of it
    const kind = person.takeOffGear() ?? person.forgetPower();
    if (!kind) return;
    const { x, y } = person.feet;
    const away = PERSON.halfWidth + ITEMS[kind].halfWidth + GEAR.takeOffGap;
    const up = y - PERSON.height * GEAR.takeOffUp;
    const at = placeFeet(x + person.pointing * away, up, AREA, ITEMS[kind]);
    this.items.push(new Item(this, kind, at.x, at.y));
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
    this.blastAt(x, y - source.size.height / 2, blast, source, null);
  }

  /**
   * A blast at this spot. `source` is the thing that blew up, if any: it bursts to
   * pieces. `spare` is a thing the blast leaves alone, with whoever sits in it: the
   * tank that fired the shell.
   */
  private blastAt(
    x: number,
    y: number,
    blast: BlastDef,
    source: Body | null,
    spare: Body | null,
  ): void {
    if (blast.stink) {
      // A stink bomb: no blast, only its own pieces and a foul cloud
      if (source) this.crumble(source, 0, -DEBRIS.blastLift / 2);
      this.fumes.push({ x, y, radius: blast.radius, ...blast.stink, hurtMs: 0, puffMs: 0 });
      this.sfx.wind();
      return;
    }
    const rider = spare instanceof Block ? spare.rider : null;
    const caught = (body: Body): boolean =>
      body !== source && body !== spare && body !== rider && inBlast(x, y, body.box, blast.radius);

    // In a team game a blast doesn't hurt the one who made it, or anybody on that side
    const maker = spare instanceof Person ? spare : null;
    for (const person of this.people) {
      if (!person.canBePicked || !caught(person)) continue;
      if (maker?.friendOf(person)) continue;
      const direction = blastDirection(x, person.feet.x);
      person.hit(direction, this.solidBoxes(person), blast.damage, blast.pushSpeed, 'blast');
    }

    // A blast doesn't blow a pool away
    const blocks = this.blocks.filter((block) => !block.def.liquid && caught(block));
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
    if (source) this.crumble(source, 0, -DEBRIS.blastLift);
    this.forget(destroyed);

    this.sfx.blast();
    this.popUp(x, y, BLAST.emoji, BLAST.fontSize, BLAST.ms, BLAST.grow);
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
    beam.lineStyle(LASER.width * LASER.glow, LASER.color, LASER.glowAlpha);
    beam.lineBetween(fromX, fromY, toX, toY);
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

  /** A flash of lightning from one spot to another: a jagged line that fades fast. */
  private bolt(fromX: number, fromY: number, toX: number, toY: number, look: BoltLook): void {
    const corners = jagged(fromX, fromY, toX, toY, look.pieces, look.sway);
    const flash = this.add.graphics().setDepth(LASER.depth);
    for (const [width, color] of [
      [look.width, look.color],
      [look.coreWidth, look.core],
    ] as const) {
      flash.lineStyle(width, color, 0.95);
      flash.beginPath();
      corners.forEach((corner, index) => {
        if (index === 0) flash.moveTo(corner.x, corner.y);
        else flash.lineTo(corner.x, corner.y);
      });
      flash.strokePath();
    }
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: look.ms,
      onComplete: () => {
        flash.destroy();
      },
    });
  }

  /**
   * The thunder hammer strikes the floor: lightning comes down on it and runs along
   * the whole floor. Every doll that touches the floor is out, except `spare`, the
   * doll that slammed it down; a doll standing up on something is safe. Nothing
   * breaks, but electric things standing on the floor go haywire, and vehicles on
   * the floor are fried.
   */
  private thunder(source: Body, spare?: Body): void {
    if (this.time.now - this.lastThunderMs < THUNDER.cooldownMs) return;
    this.lastThunderMs = this.time.now;
    const { x, y } = source.feet;
    this.bolt(x, AREA.top, x, y - source.size.height, THUNDER.bolt);
    const floorY = AREA.floorY - THUNDER.floorUp;
    for (let i = 0; i < THUNDER.floorBolts; i++) {
      this.bolt(AREA.left, floorY, AREA.right, floorY, THUNDER.floor);
    }
    this.sfx.thunder();
    this.cameras.main.flash(THUNDER.flashMs);
    this.cameras.main.shake(THUNDER.shake.ms, THUNDER.shake.strength);

    const touchesFloor = (box: Box): boolean => onFloor(box, AREA.floorY, THUNDER.groundSlack);
    // Water on the floor carries the lightning to whoever floats in it
    const wet = this.pools().filter(touchesFloor);
    for (const person of this.people) {
      if (person === spare || person.seated || !person.canBePicked) continue;
      // In a team game the lightning spares everybody on the side of the one who called it
      if (spare instanceof Person && spare.friendOf(person)) continue;
      const body = person.hitBox;
      if (!touchesFloor(body) && !wet.some((pool) => overlaps(pool, body))) continue;
      const away: Facing = person.feet.x < x ? -1 : 1;
      // Rubber boots: the lightning in the floor doesn't get into the doll
      if (person.immuneTo('shock')) continue;
      if (person.machine) {
        // A robot isn't knocked out by lightning: it short-circuits, and blows up later
        person.shortCircuit(away);
        continue;
      }
      person.hit(away, this.solidBoxes(person), THUNDER.damage, THUNDER.pushSpeed, 'shock');
    }
    for (const block of this.blocks) {
      if (!block.canBePicked || !touchesFloor(block.box)) continue;
      block.goHaywire(THUNDER.haywireMs);
      block.fry();
    }
  }

  /** A puff of smoke: a gray ball that rises, grows and fades away. */
  private puff(x: number, y: number): void {
    const between = (range: { min: number; max: number }): number =>
      range.min + Math.random() * (range.max - range.min);
    const color = SMOKE.colors[Math.floor(Math.random() * SMOKE.colors.length)] ?? 0;
    const startX = x + (Math.random() * 2 - 1) * SMOKE.spread;
    const ball = this.add
      .circle(startX, y, between(SMOKE.radius), color, SMOKE.alpha)
      .setDepth(SMOKE.depth);
    this.tweens.add({
      targets: ball,
      y: y - between(SMOKE.rise),
      x: startX + (Math.random() * 2 - 1) * SMOKE.spread,
      scale: SMOKE.grow,
      alpha: 0,
      duration: SMOKE.ms,
      onComplete: () => {
        ball.destroy();
      },
    });
  }

  /**
   * A part cut off a doll: it comes away, drops to the floor and lies there, where it
   * can be picked up like any other thing. With too many lying around, the oldest goes.
   */
  private sever(
    picture: Phaser.GameObjects.Container,
    lift: number,
    reach: number,
    direction: Facing,
    gentle: boolean,
  ): void {
    this.parts.push(new Part(picture, lift, reach, direction, gentle));
    if (this.parts.length > SEVER.max) this.forgetOldest(this.parts);
  }

  /** A laser hits a doll: the doll takes the hit. With `spark` it is lightning. */
  private zap(
    fromX: number,
    fromY: number,
    victim: Person,
    damage: number,
    pushSpeed: number,
    spark = false,
  ): void {
    const body = victim.hitBox;
    const atX = (body.left + body.right) / 2;
    const atY = (body.top + body.bottom) / 2;
    if (spark) {
      this.bolt(fromX, fromY, atX, atY, SPARK);
      this.sfx.zap();
    } else {
      this.beam(fromX, fromY, atX, atY);
    }
    const direction: Facing = atX < fromX ? -1 : 1;
    // Lightning singes; a laser turns what it finishes off to ash
    const wound = spark ? 'shock' : 'laser';
    const deadly = victim.hit(direction, this.solidBoxes(victim), damage, pushSpeed, wound);
    // Over a doll that has just turned to ash the skull pops up above its head, not in front of it
    const ash = deadly && !spark;
    this.showHit(atX, ash ? body.top - ASHEN.skullUp : atY, deadly, 'none');
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

  /** A monster swallows a doll whole: a gulp, and the doll is gone. */
  private swallow(by: Body, victim: Person): void {
    const mouth = by.box;
    this.sfx.gulp();
    const { gulpEmoji } = CHOMPER;
    const x = (mouth.left + mouth.right) / 2;
    this.popUp(x, mouth.top, gulpEmoji, HIT_FX.fontSize, HIT_FX.deadMs, HIT_FX.grow);
    // The doll is taken out of the game once everything has had its turn this frame
    this.doomed.push(victim);
  }

  /** Break something into small pieces of its own colors. They fly off with this push. */
  private crumble(body: Body, pushX: number, pushY: number): void {
    const colors = body.crumbs;
    if (colors.length === 0) return;
    const box = body.box;
    // What the pieces are depends on what it was made of: planks, bricks, shards of glass...
    const { kinds, more, dust } = SHARDS[body.material];
    const usual = crumbCount(box, DEBRIS.areaPerCrumb, DEBRIS.least, DEBRIS.most);
    for (const crumb of scatter(box, Math.round(usual * more), { ...DEBRIS.burst, pushX, pushY })) {
      const color = colors[Math.floor(Math.random() * colors.length)] ?? 0;
      const { shape, long, wide, alpha } = pickShard(kinds);
      const picture =
        shape === 'dot'
          ? this.add.circle(crumb.x, crumb.y, long / 2, color)
          : shape === 'chip'
            ? // A pointed chip: a triangle with its point a little to one side
              this.add.triangle(crumb.x, crumb.y, 0, wide, long * 0.35, 0, long, wide * 0.85, color)
            : this.add.rectangle(crumb.x, crumb.y, long, wide, color);
      picture.setDepth(DEBRIS.depth);
      this.pieces.push({
        crumb,
        picture,
        blood: null,
        alpha,
        lieMs: DEBRIS.lieMs,
        fadeMs: DEBRIS.fadeMs,
      });
    }
    // And a little cloud of dust goes up where it broke
    if (dust !== undefined) {
      this.world.sparkle((box.left + box.right) / 2, (box.top + box.bottom) / 2, dust);
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
      this.pieces.push({
        crumb,
        picture,
        blood: null,
        lieMs: ASH.lieMs,
        fadeMs: ASH.fadeMs,
      });
    }
    this.trimPieces();
  }

  /** The wind takes ash off something: a flake from every spot, which flies off to one side and hardly sinks. */
  private blowAsh(spots: readonly Spot[], direction: Facing): void {
    const { wind, flake } = ASHEN;
    const burst = { ...flake, pushX: direction * wind.push, pushY: wind.lift, spread: wind.spread };
    for (const { x, y } of spots) {
      const [crumb] = scatter({ left: x, right: x, top: y, bottom: y }, 1, burst);
      if (!crumb) continue;
      const color = ASH.colors[Math.floor(Math.random() * ASH.colors.length)] ?? 0;
      const picture = this.add
        .rectangle(crumb.x, crumb.y, crumb.size, crumb.size, color)
        .setDepth(DEBRIS.depth);
      this.pieces.push({
        crumb,
        picture,
        blood: null,
        lieMs: ASHEN.lieMs,
        fadeMs: ASHEN.fadeMs,
        gravity: wind.gravity,
      });
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
    const pools = this.pools();
    this.pieces = this.pieces.filter((piece) => {
      const falling =
        piece.gravity === undefined ? physics : { ...physics, gravity: piece.gravity };
      piece.crumb = crumbStep(piece.crumb, falling, delta);
      const { x, y, turn, ageMs } = piece.crumb;
      const inWater = (pool: Box): boolean =>
        x >= pool.left && x <= pool.right && y >= pool.top && y <= pool.bottom;
      if (piece.blood !== null && piece.crumb.vy >= 0 && pools.some(inWater)) {
        // A drop that falls into water doesn't get to the floor: it spreads out and is gone
        this.dissolve(x, y, piece.blood);
        piece.picture.destroy();
        return false;
      }
      if (piece.blood !== null && y >= AREA.floorY) {
        this.stains = addDrop(this.stains, x, piece.blood, BLOOD.stain);
        stained = true;
        piece.picture.destroy();
        return false;
      }
      // A drop of blood never fades in the air: it always gets to the floor
      const alpha = piece.blood === null ? crumbAlpha(ageMs, piece.lieMs, piece.fadeMs) : 1;
      if (alpha <= 0) {
        piece.picture.destroy();
        return false;
      }
      piece.picture.setPosition(x, y).setAlpha(alpha * (piece.alpha ?? 1));
      piece.picture.rotation = turn;
      return true;
    });
    if (stained) this.drawStains();
  }

  /** A drop in water: a faint cloud of its color that spreads out and fades away. */
  private dissolve(x: number, y: number, color: number): void {
    const cloud = this.add
      .circle(x, y, DISSOLVE.radius, color, DISSOLVE.alpha)
      .setDepth(DEPTH.liquid + 0.5);
    this.tweens.add({
      targets: cloud,
      scale: DISSOLVE.grow,
      alpha: 0,
      duration: DISSOLVE.ms,
      onComplete: () => {
        cloud.destroy();
      },
    });
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

  /**
   * The stink clouds hang where they are: green puffs keep coming, and every now and
   * then each doll in a cloud that has nothing to breathe through chokes and loses a life.
   */
  private updateFumes(delta: number): void {
    for (const cloud of this.fumes) {
      cloud.ms -= delta;
      cloud.puffMs += delta;
      while (cloud.puffMs >= STINK.puffEveryMs) {
        cloud.puffMs -= STINK.puffEveryMs;
        this.stinkPuff(cloud.x, cloud.y, cloud.radius);
      }
      cloud.hurtMs += delta;
      const hurts = cloud.hurtMs >= cloud.everyMs;
      if (hurts) cloud.hurtMs = 0;
      for (const person of this.people) {
        if (!person.canBePicked || !inBlast(cloud.x, cloud.y, person.box, cloud.radius)) continue;
        // In the cloud it is down on its knees, choking, and every now and then that costs a life
        if (!person.gag(STINK.gagMs) || !hurts) continue;
        if (!person.choke(this.solidBoxes(person))) continue;
        const head = person.box.top - 14;
        this.popUp(
          person.feet.x,
          head,
          STINK.emoji,
          STINK.fontSize,
          STINK.emojiMs,
          STINK.emojiGrow,
        );
      }
    }
    this.fumes = this.fumes.filter((cloud) => cloud.ms > 0);
  }

  /** One green puff somewhere in a stink cloud: it drifts, swells and fades. */
  private stinkPuff(x: number, y: number, radius: number): void {
    const far = Math.sqrt(Math.random()) * radius;
    const angle = Math.random() * Math.PI * 2;
    const startX = x + Math.cos(angle) * far;
    const startY = Math.min(y + Math.sin(angle) * far * 0.7, AREA.floorY - 4);
    const color = STINK.colors[Math.floor(Math.random() * STINK.colors.length)] ?? 0;
    const size = STINK.radius.min + Math.random() * (STINK.radius.max - STINK.radius.min);
    const ball = this.add.circle(startX, startY, size, color, STINK.alpha).setDepth(STINK.depth);
    this.tweens.add({
      targets: ball,
      x: startX + (Math.random() * 2 - 1) * STINK.drift,
      y: startY - Math.random() * STINK.drift,
      scale: STINK.grow,
      alpha: 0,
      duration: STINK.puffMs,
      onComplete: () => {
        ball.destroy();
      },
    });
  }

  /**
   * A portal: a tall oval with a dark middle and a bright rim, and arms of light in it
   * that turn. It opens, stays while a doll steps through, and closes again.
   */
  private openPortal(x: number, y: number): void {
    const { width, height, rim, rimWidth, fill, arms, dots, twist, colors, openMs } = PORTAL;
    const back = this.make.graphics({}, false);
    back.fillStyle(rim);
    back.fillEllipse(0, 0, width + rimWidth * 2, height + rimWidth * 2);
    back.fillStyle(fill);
    back.fillEllipse(0, 0, width, height);
    // The arms are drawn in a circle and squeezed into the oval, so that they can turn in it
    const swirl = this.make.graphics({}, false);
    const reach = height / 2 - 3;
    for (let arm = 0; arm < arms; arm++) {
      for (let dot = 1; dot <= dots; dot++) {
        const far = dot / dots;
        const angle = (arm / arms) * Math.PI * 2 + dot * twist;
        swirl.fillStyle(colors[arm % colors.length] ?? rim, 0.25 + 0.7 * far);
        swirl.fillCircle(
          Math.cos(angle) * reach * far,
          Math.sin(angle) * reach * far,
          1.5 + 4 * far,
        );
      }
    }
    const squeezed = this.make.container({ x: 0, y: 0 }, false).add(swirl);
    squeezed.setScale(width / height, 1);
    const portal = this.add.container(x, y, [back, squeezed]).setDepth(PORTAL.depth).setScale(0);
    this.tweens.add({
      targets: swirl,
      rotation: Math.PI * 2 * PORTAL.turns,
      duration: PORTAL.ms + openMs * 2,
    });
    this.tweens.add({
      targets: portal,
      scale: 1,
      duration: openMs,
      hold: PORTAL.ms,
      yoyo: true,
      ease: 'Sine.easeOut',
      onComplete: () => {
        portal.destroy();
      },
    });
    this.sfx.wind();
  }

  /** Take away every flying piece and every stain. */
  private clearMess(): void {
    this.fumes = [];
    this.pieces.forEach((piece) => piece.picture.destroy());
    this.pieces = [];
    this.stains = [];
    this.drawStains();
  }

  private showHit(x: number, y: number, deadly: boolean, sound: HitSound): void {
    if (sound === 'punch') this.sfx.punch();
    if (sound === 'clang') this.sfx.clang();
    if (sound === 'squeak') this.sfx.squeak();
    if (sound === 'zap') this.sfx.zap();
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
    const picture = this.add
      .text(x, y, emoji, { fontSize })
      .setOrigin(0.5)
      .setResolution(SHARP)
      .setDepth(HIT_FX.depth);
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
