import type { Material, ShardKind } from './logic/debris';
import type { WreckSpec } from './logic/wreck';
import type { Spring } from './logic/fall';
import type { Pull } from './logic/pull';
/** Shared game constants. Tweak values here instead of inside scenes. */
export const GAME_WIDTH = 1120;
export const GAME_HEIGHT = 660;

export const COLORS = {
  background: 0x808080,
  text: '#ffffff',
} as const;

/**
 * How sharp the game is drawn: at most this many pixels for every pixel of its own
 * size, and fewer on a phone.
 */
export const SHARPNESS = { most: 3, mostOnTouch: 2 } as const;

/** The dark floor along the bottom of the screen: darker further down, with a bright edge on top. */
export const FLOOR = {
  height: 110,
  top: 0x2b2d34,
  bottom: 0x050506,
  edge: 0x6b7079,
  edgeHeight: 2,
  shine: 0xffffff,
  shineAlpha: 0.06,
  shineHeight: 5,
} as const;

/**
 * The wall behind everything: lighter at the top, made of big panels, with a soft
 * light in the middle (its `x`, `y` are shares of the wall's width and height), dark
 * corners, and a skirting board along the floor.
 */
export const WALL = {
  top: 0x9ba2ab,
  bottom: 0x6d737b,
  panel: {
    width: 140,
    height: 118,
    line: 0x000000,
    lineAlpha: 0.09,
    shine: 0xffffff,
    shineAlpha: 0.07,
  },
  light: { x: 0.5, y: 0.34, width: 940, height: 540, color: 0xffffff, alpha: 0.011, rings: 26 },
  shade: {
    color: 0x000000,
    sides: 0.3,
    sideWidth: 280,
    top: 0.28,
    topHeight: 70,
    bottom: 0.22,
    bottomHeight: 60,
  },
  skirting: { height: 7, color: 0x3a3d43, shine: 0x858a93 },
} as const;

/**
 * Everything casts a soft shadow where the wall meets the floor under it: half an oval
 * this far `up` the wall, behind the thing, and half an oval this far `down` on the
 * floor. Each is drawn as a few ovals inside one another (their sizes as shares of the
 * whole), so that its edge is soft.
 */
export const SHADOW = {
  alpha: 0.5,
  fadeHeight: 330,
  grow: 0.6,
  up: 9,
  down: 11,
  rings: [1, 0.76, 0.52],
  /** An oval is drawn with this many corners to each half. */
  corners: 14,
} as const;

/** The ceiling along the top of the area: nothing gets past it. */
export const CEILING = {
  height: 10,
  color: 0x3a3a3a,
  edge: 0x1c1c1c,
} as const;

/** Every text in the game is shown in English and Finnish. */
export const HINT = {
  text:
    '👆 Pick + click   🖐️ Drag (🔫 onto a doll!)   👆👆 Double-click = actions   🗑️ = all away\n' +
    '👆 Valitse + klikkaa   🖐️ Raahaa (🔫 nuken päälle!)   👆👆 Tuplaklikkaa = toiminnot   🗑️ = kaikki pois',
  /** The same on a screen you touch with a finger. */
  touchText:
    '👆 Pick + tap   🖐️ Drag (🔫 onto a doll!)   👆👆 Double-tap = actions   🗑️ = all away\n' +
    '👆 Valitse + napauta   🖐️ Raahaa (🔫 nuken päälle!)   👆👆 Tuplanapauta = toiminnot   🗑️ = kaikki pois',
  fontSize: '12px',
  /** How far above the bottom of the screen the middle of the text is. */
  fromBottom: 36,
} as const;

/** How things fall and stand on each other. */
export const PHYSICS = {
  /** How hard everything is pulled down (pixels per second²). */
  gravity: 1800,
  /** Feet this little inside a box still count as standing on top of it. */
  groundSlack: 2,
  /** Something flying up bounces off the ceiling with this much of its speed. */
  ceilingBounce: 0.2,
  /** Things this low don't stop a walking doll: it steps up onto them (a plank, not a crate). */
  stepUp: 20,
} as const;

/** What is drawn in front of what: bigger numbers are in front. */
export const DEPTH = {
  /** The shadows are on the wall and the floor, behind everything else. */
  shadow: 1,
  /** A doll lying on the ground is behind the building pieces: it lies under them. */
  downDoll: 8,
  /** A doll sitting inside a vehicle is behind it, and shows through its windows. */
  driver: 9,
  block: 10,
  /** A doll sitting on a motorbike is in front of it. */
  rider: 11,
  person: 20,
  item: 30,
  /** Water and lava are in front of what is in them. */
  liquid: 32,
  /** The floor is drawn once more over everything that sinks into it. */
  floorCover: 33,
  bullet: 40,
  /** A ghost floats in front of everything else in the area. */
  ghost: 45,
} as const;

/** A weapon stuck in a doll. */
export const STUCK = {
  /** It can sit this far up the doll's body, from the feet, at the lowest and the highest. */
  lowest: 34,
  highest: 100,
  /** It doesn't sit perfectly straight: up to this much either way (radians). */
  tilt: 0.3,
  /** How many drops spray out when it goes in, and when it is pulled out. */
  spray: 20,
} as const;

/** Gravity on building pieces: they have to balance, or they tip off and fall over. */
export const TOPPLE = {
  /** A piece at least this many times taller than wide falls over onto its side. */
  tallRatio: 1.6,
  /** Its middle may hang this far past the end of what holds it up before it goes. */
  give: 1,
  /**
   * A long piece lying flat (at least this many times wider than tall) is steadier:
   * its middle may hang out by this share of its half width. So a fallen wall or a
   * plank stays lying on top of a single block.
   */
  longRatio: 1.6,
  longShare: 0.72,
  /**
   * A piece that falls onto a block stays leaning on it. Leaning less than `minLean`
   * (radians) it doesn't fall at all, and within `flatSlack` of a quarter turn it
   * lies flat. Others walk up it as steps of at most `stepHeight`, `maxSteps` at most.
   * The picture catches up with where the piece is in about `settleMs`.
   */
  minLean: 0.16,
  flatSlack: 0.03,
  stepHeight: 13,
  maxSteps: 12,
  settleMs: 130,
  /** Falling over onto its side takes this long. */
  ms: 380,
  /** A piece that isn't tall slides off toward its heavy side, faster and faster. */
  slideAccel: 900,
  /** While it slides off it leans this much (radians). */
  lean: 0.32,
  leanMs: 110,
  /** A thrown doll or item has to hit a tall piece at least this fast to knock it over. */
  minSpeed: 380,
  /** How close something has to come to a tall piece to knock it over. */
  reach: 4,
} as const;

/** How the wheels of the vehicles are drawn. */
export const WHEEL = { tire: 0x1c1c1f, rim: 0xb0b8c0, hub: 0x555b63, spokes: 4 } as const;

/** Something that stands this close above a vehicle rides along with it. */
export const RIDE_GAP = 3;

/** Something solid landing on a doll squashes it down. */
export const CRUSH = {
  /**
   * The doll falls over toward the thing and its feet slide the other way this fast
   * (pixels per second), so that it ends up with its body under the thing.
   */
  push: 190,
  /** How hard its head and its back are bent forward by the weight (radians per second). */
  headKick: 13,
  waistKick: 6,
  /** A thing counts as lying on a doll when it is this close above it. */
  restGap: 6,
  /**
   * A thing that has sunk at most this far into a doll that is going down waits for
   * the doll to give way under it, and then comes down on top of it.
   */
  sink: 70,
} as const;

/**
 * How a doll looks and what it is like. The body color also decides its side: dolls
 * of the same color don't fight each other.
 */
export interface PersonLook {
  /** The color it is made of, and the color of its ball joints. */
  body: number;
  joint: number;
  /** Eye color, when it isn't the usual dark. */
  eye?: number;
  /** Something extra that shows what kind of doll it is. */
  extra?:
    | 'antenna'
    | 'headband'
    | 'helmet'
    | 'patches'
    | 'crown'
    | 'wizardHat'
    | 'vikingHelmet'
    | 'pirateHat'
    | 'kabuto'
    | 'feelers'
    | 'horns'
    | 'bandages'
    | 'apron'
    | 'flatCap'
    | 'shadow';
  /** How many hits it takes, when not the usual `PERSON.lives`. */
  lives?: number;
  /** How much faster (above 1) or slower (below 1) than usual it walks and runs. */
  speed?: number;
  /**
   * How many lives its punch takes, when not the usual one. A stronger doll also
   * hits that much harder with a sword, axe, spear or bat.
   */
  punch?: number;
  /** It walks and runs with both arms stretched out in front. */
  armsForward?: boolean;
  /** Always in angry mode: it goes for the others the moment it lands. */
  angry?: boolean;
  /** What it bleeds, when not red blood: oil for a robot, slime for a zombie. */
  blood?: number;
  /**
   * It is a machine. Fire burns it up completely instead of leaving a skeleton, and
   * lightning makes it short-circuit: it twitches, sparks, and blows up in the end.
   */
  machine?: boolean;
  /**
   * A normal person and not a doll: skin, hair and clothes of their own colors. The
   * forearms are bare when the `sleeves` are short. (`body` is still what decides
   * which side they are on.)
   */
  human?: {
    skin: number;
    hair: number;
    style: 'short' | 'long' | 'bald' | 'bun';
    /** A full beard, of the color of the hair. */
    beard?: boolean;
    shirt: number;
    sleeves: 'short' | 'long';
    trousers: number;
    shoes: number;
  };
  /** A wizard: in angry mode it casts this at the others, with no weapon in its hand. */
  spell?: GunDef;
  /**
   * An old one: steered, it walks this fast (pixels per second) and doesn't run, and with
   * a broom in its hand it sweeps as it goes. And its back is bent this much (radians).
   */
  stroll?: number;
  stoop?: number;
  /** Nothing can hurt it, but hitting it makes it furious: then it runs this fast after whoever did it. */
  fury?: number;
  /** The first time it is hit, it flies into a rage and takes this superpower. */
  rages?: PowerKind;
  /** It comes with this in its hand. */
  holds?: ItemKind;
  /** It is heavy (a knight in armor): in water it sinks to the bottom, and under water it drowns. */
  heavy?: boolean;
  /** It is drawn this many times taller and bigger than a usual doll. */
  tall?: number;
  /** It is drawn this much narrower (below 1) than a usual doll: thin as a rake. */
  slim?: number;
  /** A plain test doll: horror mode doesn't change it. It stays just as it is. */
  dummy?: boolean;
}

/**
 * The spell of fire, of the wizard and of the fire power: a stream of fire that the
 * doll pushes out with both hands, in bursts. Whoever stands in it loses a life every
 * now and then, and what is made of wood burns up.
 */
export const FIRE_SPELL: GunDef = {
  range: 250,
  damage: 1,
  everyMs: 45,
  autoMs: 45,
  bulletSpeed: 380,
  muzzle: { x: 52, y: 84 },
  barrelUp: 0,
  pellets: 3,
  spread: 0.34,
  flame: {
    reach: 290,
    width: 20,
    height: 20,
    color: 0xff7a1a,
    burnEveryMs: 450,
    burst: { ms: 1200, restMs: 650 },
  },
};

/**
 * How fire looks, wherever it is thrown from: a hand, a flamethrower or a dragon. Every
 * puff is a ball that starts small and nearly white, swells, turns yellow, orange, red
 * and dark, rises a little and fades. The puffs don't all fly quite the same way
 * (`scatter`, radians) or have the same size (`sizes`), and they flicker. Some of
 * them leave a puff of smoke where they burn out.
 */
export const FLAME = {
  colors: [
    { at: 0, color: 0xfffbe0 },
    { at: 0.14, color: 0xffe45c },
    { at: 0.4, color: 0xff9a1f },
    { at: 0.7, color: 0xe5391a },
    { at: 1, color: 0x5a2416 },
  ],
  small: 0.55,
  big: 2.6,
  alpha: 0.72,
  fadeFrom: 0.58,
  rise: 36,
  scatter: 0.24,
  sizes: { min: 0.75, max: 1.25 },
  flicker: 0.16,
  smokeShare: 0.12,
} as const;

/**
 * The dolls on the first page of the menu: six plain ones in different colors, three
 * normal people, a king and a queen, and a wizard.
 */
export const PEOPLE: readonly PersonLook[] = [
  { body: 0xd9b382, joint: 0x8a6a45, dummy: true },
  { body: 0x6fbf4a, joint: 0x2e7d32, dummy: true },
  { body: 0x4a90d9, joint: 0x1e4f8a, dummy: true },
  { body: 0xd9534f, joint: 0x7f1d1d, dummy: true },
  { body: 0xe8c84a, joint: 0x9a7b12, dummy: true },
  { body: 0xa9b1ba, joint: 0x4a5560, dummy: true },
  // Normal people: a man in a blue shirt, a woman in a yellow one, and a grandpa
  {
    body: 0x1e88e5,
    joint: 0x0d47a1,
    human: {
      skin: 0xf1c27d,
      hair: 0x4e342e,
      style: 'short',
      shirt: 0x1e88e5,
      sleeves: 'short',
      trousers: 0x3949ab,
      shoes: 0x212121,
    },
  },
  {
    body: 0xfbc02d,
    joint: 0xf57f17,
    human: {
      skin: 0xe0ac69,
      hair: 0x2b1b12,
      style: 'long',
      shirt: 0xfbc02d,
      sleeves: 'short',
      trousers: 0x6a1b9a,
      shoes: 0xd81b60,
    },
  },
  {
    body: 0x558b2f,
    joint: 0x33691e,
    human: {
      skin: 0xffdbac,
      hair: 0xcfd8dc,
      style: 'bald',
      shirt: 0x558b2f,
      sleeves: 'long',
      trousers: 0x5d4037,
      shoes: 0x3e2723,
    },
  },
  // The king and the queen: golden crowns, and a little tougher than the others
  {
    body: 0xb71c1c,
    joint: 0x7f1d1d,
    extra: 'crown',
    lives: 5,
    punch: 2,
    human: {
      skin: 0xf1c27d,
      hair: 0x5d4037,
      style: 'short',
      beard: true,
      shirt: 0xb71c1c,
      sleeves: 'long',
      trousers: 0x4a148c,
      shoes: 0x212121,
    },
  },
  {
    body: 0x8e24aa,
    joint: 0x4a148c,
    extra: 'crown',
    lives: 4,
    human: {
      skin: 0xffdbac,
      hair: 0xf9a825,
      style: 'long',
      shirt: 0x8e24aa,
      sleeves: 'long',
      trousers: 0x8e24aa,
      shoes: 0xffd54f,
    },
  },
  // A wizard: a pointed hat with a star, a long white beard and a robe
  {
    body: 0x4527a0,
    joint: 0x311b92,
    extra: 'wizardHat',
    lives: 4,
    // A stream of fire, pushed out with both hands
    spell: FIRE_SPELL,
    human: {
      skin: 0xf1c27d,
      hair: 0xeeeeee,
      style: 'long',
      beard: true,
      shirt: 0x4527a0,
      sleeves: 'long',
      trousers: 0x4527a0,
      shoes: 0x3e2723,
    },
  },
];

/**
 * The old lady: gray hair in a bun, round glasses, a purple dress and a white apron,
 * her back bent, and a broom in her hand. Hit her, and she flies into a rage: she
 * takes the mega power, grows big and muscular, and has every power there is.
 */
export const GRANNY = {
  body: 0x7e57c2,
  joint: 0x5e3f8f,
  extra: 'apron',
  stoop: 0.3,
  punch: 2,
  rages: 'megaOrb',
  holds: 'broom',
  human: {
    skin: 0xf1c9a5,
    hair: 0xe0e0e0,
    style: 'bun',
    shirt: 0x7e57c2,
    sleeves: 'long',
    trousers: 0x7e57c2,
    shoes: 0x4e342e,
  },
} as const satisfies PersonLook;

/**
 * The old man: a flat cap, a gray beard, a brown cardigan, his back bent, and a
 * walking stick in his hand. Hit him, and he flies into a rage too: his is lightning.
 */
/**
 * The shadow monster, which only comes out in the dark of horror mode: very tall and
 * very thin, bent over, black as the night, its bones showing through (ribs, spine,
 * the bones of its long limbs), a skull for a face with tiny white lights deep in the
 * eye holes and a jaw of long teeth, long bony claws, and wisps of shadow coming off
 * its head. It is always angry, quick and strong.
 */
export const SHADOW_MONSTER = {
  body: 0x0d0b14,
  joint: 0x06050a,
  eye: 0xf4f1ff,
  extra: 'shadow',
  lives: 8,
  speed: 1.25,
  punch: 2,
  angry: true,
  blood: 0x2a1640,
  tall: 1.75,
  slim: 0.6,
  stoop: 0.22,
} as const satisfies PersonLook;

export const GRANDPA = {
  body: 0x8d6e63,
  joint: 0x5d4037,
  extra: 'flatCap',
  stoop: 0.3,
  punch: 2,
  rages: 'lightningOrb',
  holds: 'cane',
  human: {
    skin: 0xf1c9a5,
    hair: 0xe0e0e0,
    style: 'bald',
    beard: true,
    shirt: 0x8d6e63,
    sleeves: 'long',
    trousers: 0x546e7a,
    shoes: 0x3e2723,
  },
} as const satisfies PersonLook;

/**
 * The fighters: always angry, tougher than a plain doll, and each with a look of its
 * own. A robot, a ninja (fast), a knight (heavy) and a zombie (slow, arms out); a
 * viking, a pirate, a samurai, an alien, a demon that throws fire, a mummy, the old
 * lady with her broom and the old man with his walking stick.
 */
export const FIGHTERS: readonly PersonLook[] = [
  {
    body: 0x607d8b,
    joint: 0x263238,
    eye: 0xff1744,
    extra: 'antenna',
    machine: true,
    lives: 5,
    punch: 2,
    speed: 0.9,
    angry: true,
    blood: 0x1a1a1f,
  },
  {
    body: 0x30303a,
    joint: 0x101014,
    eye: 0xffffff,
    extra: 'headband',
    lives: 4,
    punch: 2,
    speed: 1.7,
    angry: true,
  },
  {
    body: 0xdfe6ea,
    joint: 0x78909c,
    extra: 'helmet',
    heavy: true,
    lives: 6,
    punch: 2,
    speed: 0.8,
    angry: true,
  },
  {
    body: 0x8aa35c,
    joint: 0x4d5e2a,
    eye: 0xfff176,
    extra: 'patches',
    lives: 5,
    punch: 2,
    speed: 0.55,
    armsForward: true,
    angry: true,
    blood: 0x5f8f1f,
  },
  // A viking: a steel helmet with two horns, long fair hair and a beard
  {
    body: 0x8d6e63,
    joint: 0x5d4037,
    extra: 'vikingHelmet',
    lives: 6,
    punch: 3,
    speed: 0.95,
    angry: true,
    human: {
      skin: 0xf1c27d,
      hair: 0xf2c14e,
      style: 'long',
      beard: true,
      shirt: 0x8d6e63,
      sleeves: 'short',
      trousers: 0x5d4037,
      shoes: 0x3e2723,
    },
  },
  // A pirate: a black hat with a skull on it, a patch over one eye and a black beard
  {
    body: 0xc62828,
    joint: 0x7f1d1d,
    extra: 'pirateHat',
    lives: 4,
    punch: 2,
    speed: 1.15,
    angry: true,
    human: {
      skin: 0xe0ac69,
      hair: 0x1b1b1b,
      style: 'short',
      beard: true,
      shirt: 0xc62828,
      sleeves: 'long',
      trousers: 0x263238,
      shoes: 0x1b1b1b,
    },
  },
  // A samurai: dark red armor, a helmet with a golden crescent and a mask. Quick, and it hits hard
  {
    body: 0x8e1c1c,
    joint: 0x1b1b1b,
    eye: 0xffffff,
    extra: 'kabuto',
    lives: 5,
    punch: 3,
    speed: 1.25,
    angry: true,
  },
  // An alien: bright green, with big black eyes and two feelers. The fastest of them
  {
    body: 0x7ed957,
    joint: 0x2e7d32,
    eye: 0xffffff,
    extra: 'feelers',
    lives: 4,
    punch: 2,
    speed: 1.4,
    angry: true,
    blood: 0x76ff03,
  },
  // A demon: red, with horns, yellow eyes and a pointed beard. It throws fire, like the wizard
  {
    body: 0xa31515,
    joint: 0x4a0d0d,
    eye: 0xffeb3b,
    extra: 'horns',
    lives: 7,
    punch: 3,
    angry: true,
    blood: 0x4a0d0d,
    spell: FIRE_SPELL,
  },
  // A mummy: wrapped in bandages, with glowing eyes. Slow, arms out, and very hard to stop
  {
    body: 0xe8dcc0,
    joint: 0xa1937a,
    eye: 0x4dd0e1,
    extra: 'bandages',
    lives: 8,
    punch: 2,
    speed: 0.6,
    armsForward: true,
    angry: true,
    blood: 0xc2b280,
  },
  // The old lady, as a fighter: tough, and the first hit she takes sends her into a rage
  { ...GRANNY, lives: 6, angry: true },
  // And the old man, with his walking stick: his rage is lightning
  { ...GRANDPA, lives: 6, angry: true },
];

/** The colors of the extras that the special dolls wear. */
export const EXTRA_COLORS = {
  antenna: { rod: 0x263238, ball: 0xff1744 },
  headband: { band: 0xd32f2f, dark: 0x8e1c1c },
  helmet: { visor: 0x263238, crest: 0x1e88e5, crestDark: 0x0d47a1 },
  patches: { blotch: 0x5a6e38 },
  crown: { gold: 0xffd54f, dark: 0xb8860b, jewel: 0xe53935 },
  wizardHat: { hat: 0x311b92, light: 0x5e35b1, star: 0xffd54f },
  vikingHelmet: {
    steel: 0x90a4ae,
    dark: 0x455a64,
    shine: 0xeceff1,
    horn: 0xf5efe0,
    hornDark: 0xb8a98a,
  },
  pirateHat: { hat: 0x1b1b1b, light: 0x3a3a3a, skull: 0xf5f5f5, trim: 0xffc107 },
  kabuto: { helmet: 0x1b1b1b, light: 0x3a3a3a, gold: 0xffc107, mask: 0x5d1010 },
  feelers: { stalk: 0x2e7d32, tip: 0x18ffff, eye: 0x0b0f14 },
  horns: { horn: 0x2b1b17, tip: 0x8d6e63, beard: 0x1b1b1b },
  bandages: { line: 0xa1937a, dark: 0x3e2f1c },
  apron: { cloth: 0xfafafa, shade: 0xb0bec5, glasses: 0x263238 },
  flatCap: { cloth: 0x6d6f73, dark: 0x3d3f43, light: 0x9a9da3 },
  shadow: {
    wisp: 0x0d0b14,
    glow: 0xd8d0ff,
    bone: 0x6e6680,
    socket: 0x000000,
    teeth: 0xbdb5c9,
  },
} as const;

/** How the dolls are shaded to look round, like 3D toys. */
export const DOLL = {
  /** The dark rim around every part (how much darker than the body color). */
  rim: -0.45,
  rimWidth: 1.6,
  /** The bright stripe down the middle of every part. */
  shine: 0.4,
  shineAlpha: 0.55,
} as const;

/** A person standing in the area. `x`, `y` is always the spot between the feet. */
export const PERSON = {
  height: 120,
  halfWidth: 24,
  /** At most this many people at once; the oldest one leaves when a new one comes. */
  max: 100,
  face: { eye: 0x1b1b1b, angryBrow: 0x1b1b1b },
  /** A doll that is shot but still standing jerks back this much (radians), for this long. */
  flinch: { lean: 0.14, ms: 130 },
  /** A doll is out after this many punches. */
  lives: 3,
  /** A lying person is lifted this much, so they lie on the floor and not in it. */
  lyingLift: 16,
  /** How far the hips are above the feet of a standing doll. */
  hipHeight: 54,
  /** Roughly where the front hand is: this far in front of the middle and above the feet. */
  hand: { x: 22, y: 48 },
} as const;

/** Two quick clicks this close together are a double-click. */
export const DOUBLE_CLICK_MS = 420;

/** Walking around: back and forth between the edges of the area. */
export const WALK = { speed: 80 } as const;

/**
 * A walking or running doll hops onto a low thing in its way and goes on from there.
 * Onto things at most `height` high; it jumps `clear` higher than it has to, and
 * goes forward at `speed` in the air. If a jump got it nowhere it waits `restMs`
 * before it tries again, and turns around like at a wall meanwhile.
 */
export const JUMP = { height: 72, clear: 14, speed: 150, least: 2, restMs: 1500 } as const;

/**
 * A two-player battle on one keyboard. Player 1 steers with A and D, jumps with W and
 * hits with F; player 2 uses the arrow keys and Enter. The battle button puts in a doll
 * for each (which of the `PEOPLE`, and how far across the area), and any doll can be
 * taken over with its 🎮 bubble. A number in the player's color hangs over its doll.
 * The one whose doll is left standing gets a trophy.
 */
export const DUEL = {
  speed: 215,
  jump: 560,
  restMs: 300,
  /** A swing reaches this far back as well, so that a doll right on top of the other still hits. */
  behind: 12,
  /** A player's swing reaches a little further than a doll's own, so that it isn't missed by a hair. */
  reach: 18,
  dolls: [
    { look: 2, across: 0.3 },
    { look: 3, across: 0.7 },
  ],
  colors: ['#42a5f5', '#ef5350'],
  /** Over each player's doll: its lives as hearts (one heart and a number when there are more than `mostHearts`), and the player's number. */
  mark: {
    up: 30,
    fontSize: '17px',
    stroke: '#101010',
    strokeWidth: 4,
    heart: '❤️',
    mostHearts: 6,
  },
  /**
   * The two kinds of battle to pick from when the battle button is pressed: two big
   * buttons in the middle of the area. Against each other, or together as a team.
   */
  modes: {
    width: 250,
    height: 150,
    gap: 50,
    radius: 18,
    fill: 0x263238,
    edge: 0xfdd835,
    fontSize: '44px',
    depth: 80,
    labels: { versus: '⚔️\n1  vs  2', team: '🤝\n1  +  2', solo: '🦸\n1' },
    /** Under the buttons: whether arenas are built of building pieces in the battles, on or off. */
    arenas: {
      width: 260,
      height: 70,
      down: 40,
      fontSize: '36px',
      on: '🏗️ 📦  ✅',
      off: '🏗️ 📦  ❌',
    },
  },
  /** A match goes to this many rounds won. After a round the next one starts this soon. */
  toWin: 5,
  resetMs: 1900,
  score: { fontSize: '27px', down: 26, star: '⭐', sides: ['🔵', '🔴'], goal: '🏆' },
  /** A golden weapon that has just been won drops in from this far below the ceiling. */
  prizeDown: 70,
  /**
   * In a battle of two, things fall from the sky: the first after `firstMs`, and then
   * one every now and then. Mostly a weapon; sometimes a power orb or a piece of gear,
   * now and then the mega power or a golden weapon that has been won. They land at least `margin` from
   * the sides. With more than `most` of them lying around, the oldest one goes.
   */
  drops: {
    firstMs: 2500,
    everyMs: { min: 4500, max: 8000 },
    margin: 90,
    down: 34,
    most: 6,
    shares: { weapon: 45, power: 24, gear: 20, mega: 4, golden: 7 },
    sparkle: 0xffffff,
  },
  hint: {
    text: '🎮   1:  A  D  W  +  F   (G ⤓)          2:  ←  →  ↑  +  Enter   (K ⤓)',
    // The team game alone has only player 1
    solo: '🎮   1:  A  D  W  +  F   (G ⤓)',
    fontSize: '19px',
    down: 62,
    ms: 9000,
    fadeMs: 800,
    depth: 70,
  },
  trophy: { emoji: '🏆', fontSize: '58px', ms: 1800, grow: 1.4, up: 40 },
} as const;

/**
 * Little things that make the game feel alive. Dolls blink every `everyMs` or so, for
 * `ms`. Something that lands faster than `minSpeed` kicks up dust of this color. And a
 * gun that fires flashes at its muzzle for `ms`, a star this big.
 */
export const ALIVE = {
  blink: { everyMs: 3600, ms: 130 },
  dust: { minSpeed: 380, color: 0xcfc8bd },
  muzzle: { ms: 70, size: 14, color: 0xfff176, core: 0xffffff, depth: 41 },
} as const;

/**
 * The cleaning lady. After every `everyRounds`th round of a battle, whoever won it (in
 * a team game a round is a wave that was beaten, or a game that was lost), an old lady with a broom walks across the area, from one end to the other. She
 * sweeps the floor clean under her (`reach` to either side), and every body and loose
 * part she gets to, she throws out, stopping for `pauseMs` to do it. Nothing can hurt
 * her. If she hasn't got across after `mostMs`, she gives up and goes.
 */
/**
 * Horror mode: the room goes dark and the light flickers now and then. Every doll has
 * a creepy face (deep dark eyes with a red glow in them, a wide grin full of sharp
 * teeth, a crack in the head) and claws. They are all angry, all the time. An angry
 * one leaps at whoever it is after with a shriek, and claws at it: three scratches on
 * the doll, and three deep scratches in the wall behind it.
 */
export const HORROR = {
  dark: { color: 0x07040c, alpha: 0.6 },
  /** Now and then the light goes out for a moment, twice in a row. */
  flicker: { everyMs: { min: 4000, max: 10000 }, ms: 110, gapMs: 120, alpha: 0.9 },
  /** A big ghost pops up when it is switched on. */
  popUp: { emoji: '👻', fontSize: '96px', ms: 1300, grow: 1.6 },
  face: {
    socket: 0x0d0606,
    streak: 0x1a0606,
    eye: 0xff2020,
    glow: 0xff4040,
    glowAlpha: 0.38,
    slit: 0x200000,
    mouth: 0x120404,
    teeth: 0xf1ead2,
    crack: 0x241414,
    claw: 0x1e1616,
    clawTip: 0x5a4c4c,
    thread: 0xcfc3a8,
    button: 0x1b1b1f,
    white: 0xf5f3ea,
    pupil: 0x111111,
    pale: 0xe8e6ff,
  },
  /** It runs faster than an ordinary angry doll. */
  speedUp: 1.35,
  /** It leaps at a doll this far away, as high as this, and leaps again after a rest. */
  lunge: { from: 80, to: 230, up: 430, short: 20, restMs: 1500 },
  /**
   * Its creepy music, all made with code: a low, dark hum that swells and fades, a
   * slow heartbeat, a music box tune in a sad, strange key, and whispers of wind.
   */
  music: {
    beatSeconds: 0.62,
    tune: {
      notes: [0, 7, 6, 3, 2, 3, 0, null, -4, 0, -1, null, 0, 3, 6, null, 7, 6, 3, -1, 0, null],
      base: 880,
      quietBeats: 14,
      heartEvery: 2,
      whisperEvery: 11,
    },
    drone: { low: 55, high: 58.3, filter: 260, volume: 0.07, swellHz: 0.13 },
    heart: { from: 75, to: 38, seconds: 0.16, volume: 0.5, second: 0.24 },
    box: { wave: 'triangle', seconds: 1.5, volume: 0.07, detune: 1.006 },
    whisper: { low: 500, high: 2600, seconds: 1.8, volume: 0.07 },
    fadeSeconds: 0.5,
    /** The notes are put in this much ahead of time, every this often. */
    aheadSeconds: 0.4,
    everyMs: 150,
  },
  /** Its claws flash through the air as they rake: three quick streaks that are gone at once. */
  swipe: { length: 34, gap: 6, lean: 0.55, light: 0xffffff, deep: 0xb71c1c, ms: 260 },
  /** Light from a flashlight: a soft cone, brighter in the dark. */
  light: {
    length: 320,
    spread: 0.3,
    color: 0xfff3b0,
    alpha: 0.13,
    darkAlpha: 0.3,
    /** A creepy doll that is in a beam this long turns back to normal, with a sparkle and a chime. */
    cureMs: 500,
    sparkle: 0xfff59d,
    chime: 1320,
  },
  /**
   * The shadow monster comes out of the dark a while after the light goes, and again
   * a while after it has gone. Light hurts it: in a flashlight's beam it loses a life
   * every so often, and shrieks. Out, it melts into the dark.
   */
  shadow: {
    firstMs: 6000,
    againMs: 12000,
    hurtEveryMs: 450,
    pushSpeed: 260,
    meltMs: 700,
    puffs: 6,
    /** It comes out at least this far from the walls. */
    margin: 90,
  },
} as const;

export const CLEANER = {
  everyRounds: 5,
  reach: 48,
  /** At a body she bends down for `bendMs` to get hold of it, and then throws it with a swing of her arm that takes `throwMs`. */
  bendMs: 520,
  throwMs: 420,
  /** Where her broom sweeps, a little dust flies up this often, and now and then the clean floor gleams behind her. */
  dustEveryMs: 260,
  dust: 0xd7ccc8,
  gleamEveryMs: 900,
  gleam: 0xffffff,
  broomAhead: 46,
  edge: 34,
  mostMs: 60000,
  /**
   * Somebody has hit her: she goes after that one, and whacks it with her broom from
   * this close, until it is out. She doesn't keep it up for longer than `mostMs`.
   */
  rage: { reach: 78, near: 14, mostMs: 30000, emoji: '💢', fontSize: '40px', ms: 900, grow: 1.3 },
  // At work she walks slowly. Furious, she is quicker than anybody
  look: { ...GRANNY, stroll: 72, fury: 250 },
  /**
   * And the old man comes with her, from the other end of the area. He leaves the
   * floor and the bodies to her: his job is the weapons that lie around, which he
   * throws out one by one. He has his walking stick, and the same temper.
   */
  helper: { ...GRANDPA, stroll: 72, fury: 250 },
} as const satisfies { look: PersonLook; helper: PersonLook } & Record<string, unknown>;

/**
 * The arena of a battle: every round a few things are built of building pieces, the
 * same on both sides of the middle of the area and different every time. One may
 * stand in the middle; on each side there is a place a little way out (`mid`) and
 * one far out (`far`).
 */
export const ARENA = { mid: 240, far: 420, middleChance: 0.85, placeChance: 0.9 } as const;

/**
 * A team game: the two players are on the same side and can't hurt each other, and
 * enemies drop in from the sky in waves, at the two ends of the area. The first wave
 * comes after `firstMs`, and the next one `restMs` after the last enemy is out. A
 * player whose doll is out gets a new one when the next wave comes. With both dolls
 * out the game is over, and it starts again from the first wave.
 */
export const TEAM = {
  firstMs: 1800,
  restMs: 2600,
  waves: { first: 2, everyWaves: 2, most: 7, kindsFirst: 3 },
  edge: 70,
  spread: 90,
  /**
   * Every `everyWaves`th wave is a boss wave: the boss drops in, with only this many
   * fighters beside it. Putting the boss out counts as this many enemies.
   */
  boss: { everyWaves: 5, fighters: 2, kills: 5, edge: 110, emoji: '👹' },
  score: { wave: '🌊', kills: '💀' },
  over: { emoji: '💀', fontSize: '84px', ms: 1900, grow: 1.3 },
} as const;

/** Angry mode: run to the closest person and punch them over. */
export const ANGRY = {
  speed: 170,
  /** Stops this far from the other person: close enough to punch. */
  reach: 48,
  /** A short, random wait before each punch, so a fight between two angry ones is fair. */
  windupMs: { min: 150, max: 650 },
  /** How long the arm stays out after a punch. */
  punchMs: 220,
  /** Rest between punches. */
  restMs: 500,
  /** Feet at most this much higher or lower still count as standing on the same level. */
  levelSlack: 30,
  /** A hit on a monster counts as this many bullets at the most, however hard the weapon hits. */
  monsterHits: 5,
} as const;

/** Getting knocked over: the doll goes limp, lies on the ground, and gets back up. */
export const KNOCK = {
  /** How long it lies on the ground before getting up. */
  lieMs: 1300,
  /** Getting up takes this long. */
  riseMs: 450,
  /** How fast it is shoved away by a punch (pixels per second). */
  pushSpeed: 260,
} as const;

/**
 * A doll that is knocked over, lifted or thrown is a limp ragdoll: every joint swings
 * loosely. Smaller stiffness and damping make it floppier.
 */
export const LIMP = {
  /** Arms, elbows and the head: light and loose. */
  loose: { stiffness: 26, damping: 3.8, maxSpeed: 13 },
  /** Legs, knees and the waist: heavier, so they calm down a bit sooner. */
  heavy: { stiffness: 34, damping: 5, maxSpeed: 11 },
  /** The whole body swinging from the hand that holds it. */
  hangBody: { stiffness: 22, damping: 3.8, maxSpeed: 9 },
  /** Every joint once the doll lies on the ground: it drops flat and stays there. */
  ground: { stiffness: 70, damping: 12 },
  /** How much arms and legs sag toward the floor when lying, at most (radians). */
  sag: 0.16,
  /** The whole body flopping down flat on the ground. */
  settle: { stiffness: 110, damping: 13 },
  /** How far limbs trail behind when the doll is moved (radians per pixel per second). */
  limbTrail: 0.0032,
  limbTrailMax: 1.4,
  /** The same for the whole body hanging from the hand. */
  bodyTrail: 0.0017,
  bodyTrailMax: 0.95,
  /** How soon arms and legs fly apart when the doll drops (per pixel per second). */
  floatTrail: 0.0022,
  hang: {
    legMax: 1.3,
    elbowMax: 2.3,
    kneeMax: 2.2,
    headMax: 1,
    waistMax: 0.7,
    spread: 0.2,
    armFloat: 1.6,
    legFloat: 0.7,
  },
  /** Grabbed lower than this part of its height, a limp doll hangs upside down. */
  upsideDownBelow: 0.4,
  /** How fast it starts to tip over when a hit lands (radians per second). */
  knockSpin: 5,
  /** A hit makes the joints flop about this hard (radians per second). */
  hitKick: 5,
  /** Hitting the ground makes them flop: this much per pixel per second of the fall. */
  landKick: 0.008,
  landKickMax: 5,
  /** A hit on a doll that has no lives left pushes it this much of the usual push. */
  corpsePush: 0.6,
  /** It lies flat on the ground, give or take this little (radians). */
  lieSpread: 0.04,
  /** A living doll put down gently, leaning less than this, just stands back up. */
  standWithin: 0.45,
  quickRiseMs: 220,
  /** How fast a limp doll lying half outside the area scoots back in (pixels per second). */
  scootSpeed: 320,
} as const;

/** Throwing a doll: let go of it while moving the mouse. */
export const TOSS = {
  /** The throw uses the fastest stretch of the mouse movement in this last bit of time. */
  windowMs: 220,
  /** How much harder than the mouse moved the doll flies. */
  power: 1.5,
  /** Slower than this (pixels per second) is just letting go, not a throw. */
  minSpeed: 200,
  maxSpeed: 2400,
  /** A thrown doll is pulled down less, so it flies in a longer arc. */
  gravityScale: 0.6,
  /** It bounces off the ground with this much of its speed, when it lands at least this fast. */
  floorBounce: 0.3,
  bounceMinSpeed: 420,
  /** A thrown doll at least this fast knocks over the dolls it hits. */
  knockSpeed: 170,
  /** A doll swung around in the hand has to move at least this fast to knock others over. */
  swingKnockSpeed: 320,
  /** A doll that is hit slides away at least this fast, or this much of the thrown doll's speed. */
  pushSpeed: 260,
  pushShare: 0.55,
  /** How much speed the thrown doll keeps after hitting someone, or bouncing off a wall. */
  keep: 0.85,
  /** Off a wall it hardly bounces at all: it stops there and drops. */
  bounce: 0.02,
  /** On the ground it slides to a stop in about this long. */
  slideMs: 320,
  stopSpeed: 15,
  /** How fast a limp doll spins in the air (radians per pixel flown). */
  spin: 0.007,
  /** How much the newest frame counts when measuring how fast a doll moves. */
  smoothing: 0.5,
} as const;

/** Swinging a sword or a bat yourself, by dragging it fast into a doll. */
export const SWING = {
  /** Slower than this (pixels per second) is just carrying it, not a hit. */
  minSpeed: 600,
  /** The same doll can't be hit again sooner than this. */
  cooldownMs: 450,
} as const;

/** The 💥 that pops up where a punch lands, and the 💀 when it was the last one. */
export const HIT_FX = {
  emoji: '💥',
  deadEmoji: '💀',
  fontSize: '34px',
  ms: 380,
  deadMs: 900,
  grow: 1.6,
  depth: 80,
} as const;

/** One punch takes this many lives. */
export const PUNCH_DAMAGE = 1;

/** Throwing a person away: up and off the nearest side of the screen, spinning. */
export const THROW = {
  speedX: 720,
  speedY: 820,
  gravity: 1800,
  /** Spin, in radians per second. */
  spin: 11,
  /** Gone for good when this far outside the screen. */
  margin: 160,
} as const;

/** Everything a bubble can do, and the picture on it. */
export const ACTION_EMOJI = {
  throw: '🚀',
  turn: '🔄',
  walk: '🚶',
  dance: '💃',
  angry: '😡',
  drop: '✋',
  fuse: '🔥',
  fire: '💥',
  drive: '🏁',
  gate: '🚪',
  bridge: '🌉',
  jet: '🛫',
  play: '🎮',
} as const;

export type ActionId = keyof typeof ACTION_EMOJI;

/** The bubbles of a doll. Walk, dance and angry stay on until pressed again. */
export const PERSON_ACTIONS: readonly ActionId[] = [
  'throw',
  'turn',
  'walk',
  'dance',
  'angry',
  'drop',
  'play',
];
/** A doll with a jetpack on has one more: it switches the jetpack on and off. */
export const JET_ACTIONS: readonly ActionId[] = [...PERSON_ACTIONS, 'jet'];
/** The bubbles of a building piece or an item, and of a bomb. */
export const THING_ACTIONS: readonly ActionId[] = ['throw'];
/** Stairs can be turned around. */
export const TURN_ACTIONS: readonly ActionId[] = ['throw', 'turn'];
/** A castle gate opens and closes; a drawbridge turns around, and goes down and up. */
export const GATE_ACTIONS: readonly ActionId[] = ['throw', 'gate'];
export const BRIDGE_ACTIONS: readonly ActionId[] = ['throw', 'turn', 'bridge'];
/** A doll with no lives left, or a vehicle that is broken for good, can only be thrown away. */
export const WRECK_ACTIONS: readonly ActionId[] = ['throw'];
export const BOMB_ACTIONS: readonly ActionId[] = ['throw', 'fuse'];
/** A barrel can be set off the same way. */
export const BARREL_ACTIONS: readonly ActionId[] = ['throw', 'fuse'];
/** The bubbles of a vehicle: turn it around, and make it drive. */
export const VEHICLE_ACTIONS: readonly ActionId[] = ['throw', 'turn', 'drive'];
/** The bubbles of a gun: turn it around, and make it fire nonstop. */
export const GUN_ACTIONS: readonly ActionId[] = ['throw', 'turn', 'fire'];
/** The most bubbles anything has. */
export const MAX_BUBBLES = 8;

/** The round action bubbles that come up above a double-clicked person. */
export const BUBBLES = {
  // Big enough to hit with a finger on a phone
  row: { radius: 27, gap: 8, above: 10 },
  color: 0xffffff,
  edge: 0x1b1b1b,
  edgeWidth: 2,
  fontSize: '27px',
  /** The light around a pressed bubble. */
  glow: { color: 0xffe14d, extra: 9, alpha: 0.45, edgeWidth: 4 },
  /** Turn-around is done in a blink, so its light only flashes this long. */
  flashMs: 260,
  /** Above the people, below the menu. */
  depth: 90,
} as const;

/** The menu along the top where you pick a person. */
export const MENU = {
  height: 100,
  color: 0x2b2b2b,
  edge: 0x000000,
  /** The small buttons on the left that switch between dolls, items and building pieces. */
  // Buttons, two under each other in five columns
  tabs: { x: 6, y: 6, width: 36, height: 27, gap: 3, vertical: true, wrap: 3 },
  tabColor: 0x555555,
  tabSelectedColor: 0xffd54f,
  tabRadius: 7,
  tabFontSize: '17px',
  /** A golden weapon that hasn't been won yet shows as a padlock of these colors. */
  lock: { body: 0x6b6f76, shackle: 0x9a9fa7, hole: 0x2b2d33 },
  slots: { x: 210, y: 10, width: 58, height: 80, gap: 6 },
  /** The slots of a page end before this. A page with many things gets narrower slots. */
  slotsEnd: GAME_WIDTH - 202,
  /** The button that starts and ends a two-player battle. It is lit while one is on. */
  duel: { x: GAME_WIDTH - 194, y: 10, width: 50, height: 38, gap: 0 },
  duelEmoji: '🎮',
  duelFontSize: '24px',
  /** The button under it that switches horror mode on and off. It glows red while it is on. */
  horror: { x: GAME_WIDTH - 194, y: 52, width: 50, height: 38, gap: 0 },
  horrorEmoji: '👻',
  horrorColor: 0x4a2a3a,
  horrorOnColor: 0xd50000,
  duelColor: 0x3949ab,
  duelOnColor: 0xfdd835,
  /** A picture in a slot is made small enough to leave this much room around it. */
  slotPadding: 5,
  slotColor: 0x9e9e9e,
  slotRadius: 10,
  selected: { color: 0xffd54f, width: 5 },
  /** Dolls in the menu are drawn this much smaller. */
  personScale: 0.56,
  /** How far above the slot's bottom edge the feet stand. */
  feetInset: 7,
  /** The button that switches the sounds off and on. */
  sound: { x: GAME_WIDTH - 138, y: 10, width: 50, height: 38, gap: 0 },
  /** The button under it that makes the game fill the whole screen, and back. */
  full: { x: GAME_WIDTH - 138, y: 52, width: 50, height: 38, gap: 0 },
  fullEmoji: '⛶',
  soundColor: 0x555555,
  soundEmoji: { on: '🔊', off: '🔇' },
  soundFontSize: '24px',
  /** The button that takes everything away. */
  clear: { x: GAME_WIDTH - 80, y: 10, width: 72, height: 80, gap: 0 },
  clearColor: 0xc62828,
  clearEmoji: '🗑️',
  clearFontSize: '34px',
  /** Drawn above everything in the area. */
  depth: 100,
} as const;

/** The pages of the menu. */
export const TABS = [
  { id: 'people', emoji: '🧍' },
  { id: 'items', emoji: '🔫' },
  { id: 'build', emoji: '🧱' },
  { id: 'junk', emoji: '🚽' },
  { id: 'vehicles', emoji: '🚗' },
  { id: 'monsters', emoji: '👾' },
  { id: 'traps', emoji: '⚠️' },
  { id: 'elements', emoji: '🌊' },
  { id: 'castle', emoji: '🏰' },
  { id: 'gear', emoji: '🛡️' },
  { id: 'powers', emoji: '🔮' },
  { id: 'fighters', emoji: '🥷' },
  { id: 'golden', emoji: '🏆' },
] as const;

export type TabId = (typeof TABS)[number]['id'];

/** What a blast does to the dolls it catches. */
export interface BlastDef {
  radius: number;
  damage: number;
  pushSpeed: number;
  /**
   * A stink bomb: no blast at all, but a foul cloud that hangs there for `ms`. A doll
   * in it that has nothing to breathe through loses a life every `everyMs`.
   */
  stink?: { ms: number; everyMs: number };
}

/** A building piece: others can stand on it and can't walk through it. */
export interface BlockDef {
  halfWidth: number;
  height: number;
  /** How much smaller it is drawn in the menu. */
  menuScale: number;
  /** `detail` is the mortar between bricks, the nails in wood, or the sign on a barrel. */
  colors: { fill: number; dark: number; light: number; detail: number };
  /** It explodes when a bullet or another blast hits it. */
  blast?: BombDef;
  /** It is a vehicle: it can drive. */
  drive?: DriveDef;
  /** It is a monster: it hunts the dolls. */
  monster?: MonsterDef;
  /** Glass: it shatters when a bullet hits it or when it falls over. */
  fragile?: boolean;
  /** It is a trap: it hurts the dolls. */
  hazard?: HazardDef;
  /** It runs on electricity: lightning along the floor makes it go haywire. */
  electric?: boolean;
  /** It is a trampoline: what lands on it is thrown back up. */
  spring?: Spring;
  /**
   * It is a pool of something. It spreads out over the whole floor. Nothing stands on
   * it: things go into it, and it is drawn in front of them. Dolls and light things
   * float in `water`; `lava` melts dolls and burns up what is made of wood.
   */
  liquid?: 'water' | 'lava';
  /** It is light: in water it comes up and floats, and dolls can ride on it. */
  floats?: boolean;
  /** It is made of wood, rubber or plastic: lava burns it up. */
  burns?: boolean;
  /** Lava melts it: it sinks in and nothing is left of it. */
  melts?: boolean;
  /** It is made of iron or steel: a magnet pulls it. */
  metal?: boolean;
  /** It is a black hole: it pulls everything around it in, and it turns this fast (radians per second). */
  hole?: Pull & { spin: number };
  /**
   * It is a gate. Open, only the part above its `opening` is solid, so dolls walk
   * through under it; closed, all of it is. Its grille goes up and down in `ms`.
   */
  gate?: { opening: { halfWidth: number; height: number }; ms: number };
  /** It is a drawbridge: from its bubble it is let down the way it points, and pulled up again. */
  bridge?: boolean;
  /** It is a flight of stairs with this many steps: dolls walk up it, the way it points. */
  stairs?: number;
  /**
   * It is a catapult: every `everyMs` it hurls a thing at the closest doll in front of
   * it, between `tooClose` and `range` away, in an arc that takes `flightMs`. The
   * thing leaves from this spot on it, and its arm turns at `pivot`.
   */
  launcher?: {
    item: ItemKind;
    everyMs: number;
    range: number;
    tooClose: number;
    flightMs: number;
    x: number;
    up: number;
    /** A catapult has an arm that turns at `pivot`; a cannon has neither. */
    pivot?: { x: number; up: number };
    /** How the arm leans while it waits, how far it swings over, and how long it takes back. */
    arm?: { rest: number; swing: number; backMs: number; length: number };
  };
  /**
   * It is a storm cloud: it hangs `below` the ceiling, drifts from side to side this
   * fast, and its lightning comes out of its underside.
   */
  cloud?: { below: number; speed: number };
  /**
   * It is a piano: a doll walking along its top plays these notes (pitches in hertz),
   * one for every key it steps onto, from left to right.
   */
  keys?: readonly number[];
  /** A thing that floats lies this deep in the water, when not the usual share of its height. */
  draft?: number;
}

/** The pieces on the building page. */
export type BuildKind =
  | 'island'
  | 'hay'
  | 'stairs'
  | 'steelCrate'
  | 'fence'
  | 'crate'
  | 'wall'
  | 'plank'
  | 'stone'
  | 'girder'
  | 'barrel'
  | 'glass'
  | 'tnt'
  | 'pillar'
  | 'trampoline';
/** Junk that is solid like a building piece: you can stack it and stand on it. */
export type JunkBlockKind =
  'toilet' | 'tv' | 'trashcan' | 'armchair' | 'table' | 'fridge' | 'cone' | 'tire' | 'piano';
/** The things on the vehicles page. They are solid like building pieces, and they drive. */
export type VehicleKind =
  'car' | 'truck' | 'tank' | 'bike' | 'skateboard' | 'helicopter' | 'plane' | 'saucer' | 'ship';
/** Things that are alive in their own way and go after the dolls. */
export type MonsterKind =
  | 'skibidi'
  | 'skibidiToilet'
  | 'skibidiCone'
  | 'skibidiTv'
  | 'chomper'
  | 'ghost'
  | 'batMonster'
  | 'ufo'
  | 'boss'
  | 'dragon'
  | 'wisp'
  | 'shark';
/** Things that hurt the dolls that touch them or come near. They are solid like building pieces. */
export type TrapKind = 'spikes' | 'saw' | 'burner' | 'tesla' | 'laserTower' | 'mine' | 'cactus';
/** Forces of nature you can put in: a pool of lava, a pool of water, and a black hole. */
export type ElementKind = 'lava' | 'water' | 'blackHole' | 'cloud';
/** The pieces of a castle. */
export type CastleKind =
  'tower' | 'rampart' | 'gate' | 'drawbridge' | 'banner' | 'catapult' | 'cannon';
export type BlockKind =
  BuildKind | JunkBlockKind | VehicleKind | MonsterKind | TrapKind | ElementKind | CastleKind;

/**
 * A trap. One that hurts by `touch` gets every doll that touches it, a `zap` trap
 * shoots lightning (or a `laser`) at the closest doll in `range`, and a `mine` blows
 * up when a doll touches it.
 */
export interface HazardDef {
  kind: 'touch' | 'zap' | 'mine';
  /** How many lives it takes, how hard it flings the doll, and the mark it leaves. */
  damage: number;
  pushSpeed: number;
  wound: WoundKind;
  sound: 'punch' | 'clang' | 'none';
  /** The same doll isn't hurt again sooner than this. */
  everyMs: number;
  /** It reaches this far past its sides and above its top. */
  side: number;
  up: number;
  range?: number;
  /** A `zap` trap that shoots a laser from its eye, and not lightning. */
  laser?: true;
  /** A saw blade that turns: how big, how high its middle is, how fast (radians per second). */
  blade?: { radius: number; up: number; speed: number };
  /** Flames that flicker above it, this high. */
  flames?: { height: number };
}

/**
 * A monster: always angry, and after the dolls. How it gets them is its `attack`:
 * a `laser` from its eyes from far away, a `bite` that swallows a doll whole when it
 * gets there, or a `scare` when it floats into one.
 */
export interface MonsterDef {
  attack: 'laser' | 'bite' | 'scare';
  /** How far away it notices a doll, and how long it waits between attacks. */
  range: number;
  everyMs: number;
  /** How many lives an attack takes, and how hard it flings the doll. */
  damage: number;
  pushSpeed: number;
  /** How fast it goes after the doll (pixels per second). */
  speed: number;
  /** The piece of junk it lives in, and the face that pops out of it. A ghost has neither. */
  body?: JunkBlockKind;
  face?: 'skibidi' | 'chomper';
  /**
   * The head that pops out of its top: how big it is, how far in front of the middle
   * it comes up, and how high its middle is when in and out. A small monster has the
   * whole head drawn smaller, by `scale`.
   */
  head?: { radius: number; x: number; inUp: number; outUp: number; popMs: number; scale?: number };
  /** The blast when it is shot to bits. Without one it just falls apart. */
  blast?: BlastDef;
  /**
   * A ghost: it floats, goes straight through everything, and can't be shot. `alpha`
   * is how see-through it is, and it bobs `bob` pixels up and down every `bobMs`.
   */
  ghost?: {
    alpha: number;
    bob: number;
    bobMs: number;
    /** A bat: it bites instead of scaring, and flaps its wings once in `flapMs`. */
    bite?: boolean;
    flapMs?: number;
    /** The mark its touch leaves, when not the usual one: a fire spirit burns. */
    wound?: WoundKind;
  };
  /**
   * A flying saucer: it hovers `below` the ceiling, flies over the closest doll and
   * shoots straight down at it once it is at most `aim` pixels off to the side.
   */
  saucer?: { below: number; aim: number };
  /**
   * A dragon: it flies `below` the ceiling, keeps `keep` pixels to the side of the doll
   * it is after, and breathes fire at it from its `mouth` for `breathMs` at a time.
   * It takes `hull` bullets, and its wings beat once every `flapMs`.
   */
  dragon?: {
    hull: number;
    below: number;
    keep: number;
    breathMs: number;
    mouth: { x: number; up: number };
    wing: { x: number; up: number };
    flapMs: number;
    gun: GunDef;
  };
  /**
   * A shark: it only lives in water. There it swims `depth` under the surface, goes
   * for the closest doll that is in the water too, and bites it. On dry land it just lies there.
   */
  shark?: { depth: number };
  /**
   * A boss: huge and tough. It takes `hull` bullets (a blast counts as `blastHits`),
   * and a bar above its head shows how many are left. It shoots its laser from its
   * `eyes`, stomps every doll within `reach` of it, and smashes the things in its way.
   */
  boss?: {
    hull: number;
    blastHits: number;
    eyes: { x: number; up: number };
    reach: number;
    stomp: { everyMs: number; damage: number; pushSpeed: number; hopMs: number; hop: number };
    smashEveryMs: number;
  };
}

/** How a vehicle drives, and where its wheels are. */
export interface DriveDef {
  /** Pixels per second. */
  speed: number;
  /** How many lives a doll loses when the vehicle drives into it, and how hard it is flung. */
  damage: number;
  pushSpeed: number;
  /**
   * How many times bigger than its drawing the vehicle is. The wheels and the seat
   * below are measured on the drawing, before it is made bigger.
   */
  scale: number;
  /** The wheels: how far each one is from the middle, how high their middle is, and how big they are. */
  wheels: { xs: readonly number[]; up: number; radius: number };
  /**
   * Where a doll's hips go when it sits in: this far in front of the middle and above
   * the bottom. `inFront` when the doll sits on the vehicle and not inside it.
   */
  seat?: { x: number; up: number; inFront: boolean };
  /** The blast when it is shot to bits. Without one it just breaks into pieces. */
  blast?: BlastDef;
  /**
   * It flies. Switched on, it climbs until its top is `below` under the ceiling,
   * `climb` pixels per second. Switched off, it sinks down, pulled only `sink` as hard
   * as other things.
   */
  flies?: { below: number; climb: number; sink: number };
  /**
   * The rotor or propeller: where its middle is on the drawing, how long and thick
   * it is, and whether it lies flat (a rotor) or stands up (a propeller).
   */
  rotor?: { x: number; up: number; length: number; thickness: number; flat: boolean };
  /** How many bullets it takes, when that isn't the usual number. */
  hull?: number;
  /** A ship: it only moves while it floats in water. */
  sails?: boolean;
  /**
   * A cannon: while the vehicle is switched on it fires at the closest doll in front
   * of it, from this spot on the drawing. It doesn't fire at anything closer than `tooClose`.
   */
  cannon?: { x: number; up: number; tooClose: number; gun: GunDef };
}

/** The head of a skibidi fridge. */
export const SKIBIDI = {
  skin: 0xe9bd8f,
  dark: 0x7a4f2e,
  hair: 0x3a2a1c,
  eye: 0xffffff,
  pupil: 0xff1744,
  mouth: 0x5a1010,
  teeth: 0xfffbe6,
  /** Where its eyes are from the middle of the head, looking the way it faces. */
  eyes: { x: 5, up: 3 },
  /** Its head sways from side to side: this far (radians), one sway in this long. */
  sway: 0.24,
  swayMs: 300,
} as const;

/** What a laser leaves of a thing: a puff of ash that drifts down and is soon gone. */
export const ASH = {
  colors: [0x2b2b2b, 0x4a4a4a, 0x6b6b6b, 0x141414],
  /** One flake for every this many square pixels of the thing, between the least and the most. */
  areaPerFlake: 90,
  least: 10,
  most: 46,
  burst: { spread: 55, size: { min: 2, max: 5 }, spin: 5 },
  /** The flakes puff up a little before they sink. */
  lift: -70,
  lieMs: 450,
  fadeMs: 750,
} as const;

/** The head of the trash-can chomper: green, with one big eye and a mouth full of fangs. */
export const CHOMPER = {
  skin: 0x7cb342,
  dark: 0x33691e,
  eye: 0xffffff,
  pupil: 0x1b1b1b,
  mouth: 0x3a0d0d,
  teeth: 0xfffbe6,
  /** What pops up when it swallows a doll. */
  gulpEmoji: '😋',
  /** It bites when the doll is this close to it. */
  reach: 10,
  /** While it chews, its head bounces up and down once in this long. */
  chewMs: 90,
} as const;

/** The flames of a burner, from the outside in. */
export const FIRE = { outer: 0xff5722, mid: 0xffa000, core: 0xffee58, tongues: 5 } as const;

/** The blade of a saw trap. */
export const SAW = {
  steel: 0xcfd8dc,
  dark: 0x607d8b,
  hub: 0x37474f,
  mark: 0x90a4ae,
  teeth: 14,
} as const;

/** A lightning coil shoots from the ball at its top, this far under its tip. */
export const TESLA = { ballDown: 9, ballRadius: 9 } as const;

/** The eye of a laser tower: how far below its top it is, and how big. */
export const LASER_TOWER = { eyeDown: 13, eyeRadius: 6, headHeight: 26 } as const;

/** How a flash of lightning looks: a jagged line that fades fast. */
export interface BoltLook {
  color: number;
  core: number;
  width: number;
  coreWidth: number;
  /** How many straight bits it is made of, and how far each corner strays to the side. */
  pieces: number;
  sway: number;
  ms: number;
}

/** The spark of a lightning coil. */
export const SPARK: BoltLook = {
  color: 0x40c4ff,
  core: 0xffffff,
  width: 5,
  coreWidth: 2,
  pieces: 7,
  sway: 12,
  ms: 190,
};

/**
 * The thunder hammer: lightning comes down on it from the ceiling and runs along the
 * whole floor. Every doll that touches the floor is out; a doll standing up on
 * something is safe. Nothing breaks, but electric things on the floor go haywire.
 */
export const THUNDER = {
  cooldownMs: 900,
  /** An angry doll with the hammer stays crouched this long, and rests this long between slams. */
  slamMs: 450,
  restMs: 2600,
  damage: 99,
  pushSpeed: 520,
  bolt: {
    color: 0x82b1ff,
    core: 0xffffff,
    width: 12,
    coreWidth: 5,
    pieces: 9,
    sway: 34,
    ms: 420,
  } satisfies BoltLook,
  /** The lightning along the floor: this many of them, this far above the floor. */
  floor: {
    color: 0x40c4ff,
    core: 0xffffff,
    width: 6,
    coreWidth: 2.5,
    pieces: 30,
    sway: 16,
    ms: 520,
  } satisfies BoltLook,
  floorBolts: 3,
  floorUp: 10,
  /** Something this close to the floor counts as touching it. */
  groundSlack: 3,
  /**
   * An electric thing goes haywire for this long: it shakes this many pixels, sparks
   * fly off it this often and this far, and a monster's head shakes like this.
   */
  haywireMs: 7000,
  /**
   * A vehicle on the floor is fried: it smokes (a puff this often) and never drives
   * again. This share of them blow up as well, after a wait somewhere in between.
   */
  fried: { smokeEveryMs: 170, explodeChance: 0.5, explodeAfterMs: { min: 4000, max: 14000 } },
  jitter: 1.6,
  sparkEveryMs: 260,
  sparkReach: 36,
  headShake: { sway: 0.9, ms: 45 },
  flashMs: 220,
  shake: { ms: 320, strength: 0.016 },
} as const;

/**
 * Water. A standing doll floats with its feet `standDepth` under the surface, and a
 * doll lying limp floats `lieDepth` under it. Deeper than that, it comes up this
 * fast. Falling in faster than `splashSpeed` makes a splash of this many drops.
 */
export const WATER = {
  standDepth: 60,
  lieDepth: 16,
  /** A swimming doll lies high in the water, and gets along at this share of its speed on land. */
  swimDepth: 30,
  swimSpeed: 0.6,
  /** What floats bobs up and down this far, once in this long. Closer than `snap` to its float line it is afloat. */
  bob: { height: 4, ms: 1900 },
  snap: 12,
  /** Under water, a limp doll moves this much slower: it falls over in slow motion. */
  drag: 0.3,
  riseSpeed: 150,
  splashSpeed: 220,
  splashDrops: 14,
  alpha: 0.58,
  /** The waves on top: this high, this long, and one comes by in this many milliseconds. */
  wave: { height: 3, length: 34, ms: 900 },
} as const;

/** Lava glows and bubbles: its bright patches drift, one way and back in this long. */
export const LAVA = { alpha: 0.95, driftMs: 2600, bubbleMs: 700 } as const;

/**
 * A pool spreads out over the floor this fast (pixels per second), and its depth
 * changes in about `levelMs`. Putting more in makes it `more` of its first depth
 * deeper, up to `most`. Drained, it is gone once it is shallower than `gone`.
 */
export const POOL = {
  spreadSpeed: 520,
  levelMs: 380,
  more: 0.5,
  most: { water: 260, lava: 64 },
  gone: 1.5,
  /** A light thing floats with this much of its height under the surface. */
  floatShare: 0.6,
} as const;

/** A firework bursts into this many sparks of these colors: they fly out, fall and fade. */
export const FIREWORK = {
  sparks: 46,
  colors: [0xff1744, 0xffea00, 0x00e5ff, 0x76ff03, 0xd500f9, 0xffffff, 0xff9100],
  burst: { spread: 430, size: { min: 3, max: 6 }, spin: 0 },
  lift: -120,
  lieMs: 500,
  fadeMs: 900,
  /** On its way up it leaves a puff of smoke this often. */
  smokeEveryMs: 70,
} as const;

/** Blood that falls into water spreads out into a faint cloud and is gone. */
export const DISSOLVE = { radius: 3, grow: 4.5, alpha: 0.45, ms: 1100 } as const;

/** The block of ice around a frozen doll. */
export const ICE = { fill: 0x9be7ff, alpha: 0.5, edge: 0xffffff, shine: 0xffffff, pad: 6 } as const;

/** A heavy doll with its head under water loses a life this often, until it has drowned. */
export const DROWN = {
  everyMs: 1100,
  /** After this long with its head under water, a heavy doll can't stay on its feet any more. */
  fallAfterMs: 2400,
  /** It tips over this much slower than a doll that is knocked down. */
  tip: 0.25,
} as const;

/**
 * A doll in lava sinks into it, feet first, in this long: all of it and `extra` more
 * goes down under the floor. What is left lies on the bottom: a burnt skeleton, so
 * thin that the lava hides it. `settleMs` is how long it is given to come to lie flat
 * there, all at once, before anybody can see it.
 */
export const MELT = { ms: 1500, extra: 14, settleMs: 2600 } as const;

/** The bar above a boss that shows how much more it can take. */
export const BOSS_BAR = {
  width: 76,
  height: 8,
  up: 16,
  back: 0x1b1b1b,
  full: 0x66bb6a,
  low: 0xe53935,
  /** With less than this share left, the bar turns red. */
  lowShare: 0.35,
} as const;

/** The looks of the boss that aren't its body: eyes, mouth, teeth, claws. */
export const BOSS_LOOK = {
  eye: 0xff1744,
  glow: 0xffeb3b,
  mouth: 0x1a0626,
  teeth: 0xfffbe6,
} as const;

/** When a trampoline throws something up, it is squashed flat for a moment. */
export const BOING = { ms: 180, squash: 0.35 } as const;

/** The ground shakes when a boss stomps. */
export const QUAKE = { ms: 200, strength: 0.01 } as const;

/**
 * A robot that lightning has run through short-circuits. For somewhere between `ms.min`
 * and `ms.max` it lies there twitching: sparks fly off it, its joints are kicked about,
 * it skids this fast to one side or the other and now and then it hops. Then it blows up.
 */
export const SHORT_CIRCUIT = {
  ms: { min: 2500, max: 5500 },
  sparkEveryMs: 130,
  twitchEveryMs: 130,
  kick: 7,
  skid: { min: 110, max: 330 },
  hop: 240,
  hopChance: 0.3,
  blast: { radius: 160, damage: 3, pushSpeed: 720 },
} as const;

/** A doll that lightning has finished off is singed: every part of it is covered in soot. */
export const SOOT = { color: 0x0a0a0a, alpha: 0.55 } as const;

/**
 * A doll that a monster's laser has finished off is all ash: black from head to toe,
 * with pale crosses for eyes. It doesn't fall: it stays just as it stood, for a moment.
 * Then the wind takes it apart, one little square of ash after another, from the side
 * the wind blows to and from the top, until nothing is left of it.
 */
export const ASHEN = {
  color: 0x121212,
  alpha: 0.93,
  eye: 0xe0e0e0,
  standMs: 1400,
  blowMs: 1500,
  /** The skull that pops up when it dies is this far above its head, so that the doll can be seen. */
  skullUp: 26,
  /** The size of one little square of ash, and the grays the squares are. */
  square: 3,
  shades: [0x121212, 0x0a0a0a, 0x1d1d1d, 0x262626],
  /** How far from the doll's feet there can be any of it: this many times its height. */
  reach: 1.2,
  order: { topFirst: 0.4, ragged: 16 },
  /** This share of the squares is seen flying off; the rest are just gone. */
  flying: 0.55,
  /**
   * And this share falls straight down: a little pile of ash, of this gray, stays on
   * the floor under the doll until a broom sweeps it up.
   */
  falling: 0.1,
  pile: 0x757575,
  /** How fast the flakes fly off to the side and up, and how slowly they sink. */
  wind: { push: 170, lift: -40, spread: 60, gravity: 90 },
  flake: { size: { min: 2, max: 4 }, spin: 6 },
  lieMs: 300,
  fadeMs: 600,
} as const;

/** A doll that fire has finished off is a black skeleton: charred bones, with embers in its eyes. */
export const CHARRED = {
  bone: 0x1c1a19,
  shine: 0x4a4542,
  socket: 0x000000,
  ember: 0xff8a1e,
  /** How thick a bone is, and how big the knobs at its ends are. */
  thick: 4,
  knob: 3.2,
  /** What lava leaves is burnt much thinner still: it is only this share as thick. */
  thinScale: 0.4,
} as const;

/** A puff of smoke: a gray ball that rises, grows and fades. */
export const SMOKE = {
  colors: [0x3a3a3a, 0x5a5a5a, 0x7d7d7d],
  radius: { min: 5, max: 9 },
  spread: 10,
  rise: { min: 45, max: 80 },
  grow: 2.2,
  alpha: 0.65,
  ms: 1200,
  depth: 16,
} as const;

/** A part that a blade has cut off a doll: how it flies off, and how long it lies around. */
export const SEVER = {
  push: 170,
  lift: 300,
  spin: 5,
  /** A saw doesn't fling the part off: it comes away this much more gently. */
  gentle: 0.25,
  /** At most this many loose parts lie around; the oldest goes first. */
  max: 40,
  /** Lying on the floor it turns flat in about this long. */
  settleMs: 140,
} as const;

/**
 * An angry doll with a bomb throws it at the one it is after: from at least `margin`
 * outside the blast and at most `range` away, in a high arc that takes `flightMs`.
 * The bomb goes off where it lands, or after `fuseMs` at the latest.
 */
export const LOB = { margin: 40, range: 520, flightMs: 700, fuseMs: 1500 } as const;

/** The laser a monster shoots from its eyes. */
export const LASER = {
  color: 0xff1744,
  core: 0xffffff,
  width: 7,
  coreWidth: 2.5,
  /** The glow around the ray: this many times as wide, and this faint. */
  glow: 2.6,
  glowAlpha: 0.22,
  ms: 170,
  depth: 60,
} as const;

/** How the rotors and propellers are drawn, and how fast they flicker around. */
export const ROTOR = { color: 0x24272b, hub: 0x8b949c, turnMs: 70 } as const;

/** A doll sitting in a vehicle with a gun in its hand shoots from it. */
export const SEAT_GUN = {
  /** Where the bullet comes out: this far in front of the doll's hips and above them. */
  forward: 26,
  up: 30,
  /** It aims at the middle of a doll: this much of the doll's height above its feet. */
  aimHeight: 0.55,
} as const;

/** A vehicle takes this many bullets. The last one blows it up. */
export const VEHICLE_HULL = 3;
/** The hole a bullet leaves in a vehicle. */
export const BULLET_HOLE = { color: 0x111114, rim: 0x6b6f75, radius: 2.4 } as const;

export const BLOCKS: Record<BlockKind, BlockDef> = {
  crate: {
    floats: true,
    burns: true,
    halfWidth: 28,
    height: 56,
    menuScale: 1,
    colors: { fill: 0xb07a45, dark: 0x5e3a1a, light: 0xdcaa70, detail: 0x3a2a1a },
  },
  wall: {
    halfWidth: 17,
    height: 128,
    menuScale: 0.55,
    colors: { fill: 0xa8503f, dark: 0x4e221b, light: 0xd58a76, detail: 0xcfc4b2 },
  },
  plank: {
    floats: true,
    burns: true,
    halfWidth: 70,
    height: 18,
    menuScale: 0.45,
    colors: { fill: 0xc9a46a, dark: 0x7a5a2e, light: 0xecd2a0, detail: 0x4a3a26 },
  },
  stone: {
    halfWidth: 30,
    height: 30,
    menuScale: 1.1,
    colors: { fill: 0x8f969c, dark: 0x454b51, light: 0xc9cfd4, detail: 0x5d646a },
  },
  girder: {
    melts: true,
    metal: true,
    halfWidth: 90,
    height: 14,
    menuScale: 0.36,
    colors: { fill: 0x6f7f8c, dark: 0x2f3a43, light: 0xb1c1cc, detail: 0x232b31 },
  },
  barrel: {
    metal: true,
    floats: true,
    halfWidth: 19,
    height: 50,
    menuScale: 1.2,
    colors: { fill: 0xc62828, dark: 0x6d1414, light: 0xf08a85, detail: 0xffd54f },
    blast: { fuseMs: 1500, radius: 150, damage: 3, pushSpeed: 700 },
  },
  glass: {
    melts: true,
    halfWidth: 7,
    height: 120,
    menuScale: 0.6,
    colors: { fill: 0xa9d6e8, dark: 0x4f7f93, light: 0xeaf8ff, detail: 0xffffff },
    fragile: true,
  },
  // A bigger bang than the barrel, and a longer fuse to get away from it
  tnt: {
    floats: true,
    halfWidth: 26,
    height: 44,
    menuScale: 1.1,
    colors: { fill: 0xd32f2f, dark: 0x6d1414, light: 0xff8a80, detail: 0xfff3e0 },
    blast: { fuseMs: 2000, radius: 230, damage: 4, pushSpeed: 850 },
  },
  pillar: {
    halfWidth: 15,
    height: 150,
    menuScale: 0.5,
    colors: { fill: 0xb8b8b0, dark: 0x5f5f58, light: 0xe2e2da, detail: 0x8c8c84 },
  },
  // Dolls that stand, fall or lie on them lose a life again and again
  spikes: {
    melts: true,
    metal: true,
    halfWidth: 34,
    height: 16,
    menuScale: 0.9,
    colors: { fill: 0xb4c0c8, dark: 0x4c575e, light: 0xeef3f6, detail: 0x6f7b83 },
    hazard: {
      kind: 'touch',
      damage: 1,
      pushSpeed: 140,
      wound: 'stab',
      sound: 'clang',
      everyMs: 700,
      side: 2,
      up: 4,
    },
  },
  saw: {
    melts: true,
    metal: true,
    halfWidth: 28,
    height: 14,
    menuScale: 0.9,
    colors: { fill: 0x5d6770, dark: 0x2b3238, light: 0x9aa7b4, detail: 0xffc107 },
    hazard: {
      kind: 'touch',
      damage: 99,
      pushSpeed: 40,
      wound: 'saw',
      sound: 'clang',
      everyMs: 500,
      side: 0,
      up: 30,
      blade: { radius: 22, up: 22, speed: 14 },
    },
  },
  burner: {
    halfWidth: 26,
    height: 12,
    menuScale: 1,
    colors: { fill: 0x3a3f44, dark: 0x1a1d20, light: 0x8b959c, detail: 0xff8a1e },
    hazard: {
      kind: 'touch',
      damage: 1,
      pushSpeed: 120,
      wound: 'burn',
      sound: 'none',
      everyMs: 450,
      side: 0,
      up: 36,
      flames: { height: 38 },
    },
  },
  tesla: {
    melts: true,
    halfWidth: 14,
    height: 86,
    menuScale: 0.75,
    colors: { fill: 0x8d6e63, dark: 0x3e2723, light: 0xd7ccc8, detail: 0x40c4ff },
    hazard: {
      kind: 'zap',
      damage: 1,
      pushSpeed: 260,
      wound: 'burn',
      sound: 'none',
      everyMs: 1100,
      side: 0,
      up: 0,
      range: 210,
    },
  },
  // A tower with one red eye: it shoots its laser at the closest doll around it
  laserTower: {
    melts: true,
    metal: true,
    halfWidth: 15,
    height: 72,
    menuScale: 0.88,
    colors: { fill: 0x607d8b, dark: 0x263238, light: 0xb0bec5, detail: 0xff1744 },
    hazard: {
      kind: 'zap',
      laser: true,
      damage: 2,
      pushSpeed: 200,
      wound: 'laser',
      sound: 'none',
      everyMs: 1500,
      side: 0,
      up: 0,
      range: 300,
    },
  },
  mine: {
    metal: true,
    halfWidth: 16,
    height: 9,
    menuScale: 1.6,
    colors: { fill: 0x5b6628, dark: 0x23280f, light: 0x9aab55, detail: 0xff1744 },
    blast: { fuseMs: 800, radius: 150, damage: 3, pushSpeed: 750 },
    hazard: {
      kind: 'mine',
      damage: 0,
      pushSpeed: 0,
      wound: 'burn',
      sound: 'none',
      everyMs: 0,
      side: 2,
      up: 4,
    },
  },
  // A little too high to step onto: a doll hops on, and then it bounces
  trampoline: {
    burns: true,
    halfWidth: 46,
    height: 24,
    menuScale: 0.9,
    colors: { fill: 0x1e88e5, dark: 0x0d3c73, light: 0x90caf9, detail: 0x23272b },
    spring: { minSpeed: 140, keep: 0.85, boost: 150, dull: 0.55, most: 1100 },
  },
  // It spreads over the whole floor. A doll in it melts away, and wooden things burn up.
  lava: {
    halfWidth: 64,
    height: 18,
    menuScale: 0.9,
    colors: { fill: 0xff5722, dark: 0x8a1c00, light: 0xffc107, detail: 0xffee58 },
    liquid: 'lava',
  },
  // It spreads over the whole floor too. Light things float in it, heavy ones sink.
  water: {
    halfWidth: 84,
    height: 130,
    menuScale: 0.6,
    colors: { fill: 0x29b6f6, dark: 0x0277bd, light: 0xb3e5fc, detail: 0xffffff },
    liquid: 'water',
  },
  blackHole: {
    halfWidth: 28,
    height: 56,
    menuScale: 1,
    colors: { fill: 0x050208, dark: 0x4a148c, light: 0xff9800, detail: 0xffe082 },
    hole: { radius: 260, speed: 560, least: 28, eat: 30, spin: 3.2 },
  },
  // A sandy island with a palm tree and a treasure chest: tall enough to stand out of the water
  island: {
    halfWidth: 92,
    height: 150,
    menuScale: 0.4,
    colors: { fill: 0xe6c98a, dark: 0x9a7a45, light: 0xf7e6b8, detail: 0x8d6e63 },
  },
  // It swims in water and bites the dolls that are in it. Out of the water it is helpless.
  shark: {
    halfWidth: 46,
    height: 34,
    menuScale: 0.7,
    colors: { fill: 0x78909c, dark: 0x37474f, light: 0xeceff1, detail: 0x1b1b1b },
    monster: {
      attack: 'bite',
      range: 2000,
      everyMs: 900,
      damage: 2,
      pushSpeed: 240,
      speed: 190,
      shark: { depth: 34 },
    },
  },
  // Soft and light: it floats, and it burns
  hay: {
    burns: true,
    floats: true,
    halfWidth: 34,
    height: 42,
    menuScale: 1,
    colors: { fill: 0xe6c04a, dark: 0x9a7a1e, light: 0xf7e08a, detail: 0x8d6e63 },
  },
  piano: {
    keys: [262, 294, 330, 349, 392, 440, 494, 523],
    burns: true,
    halfWidth: 42,
    height: 64,
    menuScale: 0.8,
    colors: { fill: 0x3e2723, dark: 0x1b100d, light: 0x8d6e63, detail: 0xfafafa },
  },
  // It pricks whoever touches it
  cactus: {
    burns: true,
    halfWidth: 18,
    height: 66,
    menuScale: 0.85,
    colors: { fill: 0x43a047, dark: 0x1b5e20, light: 0x81c784, detail: 0xa1553a },
    hazard: {
      kind: 'touch',
      damage: 1,
      pushSpeed: 220,
      wound: 'stab',
      sound: 'punch',
      everyMs: 600,
      side: 3,
      up: 3,
    },
  },
  // It drifts along under the ceiling and strikes the closest doll with lightning
  cloud: {
    halfWidth: 60,
    height: 40,
    menuScale: 0.5,
    colors: { fill: 0x546e7a, dark: 0x263238, light: 0x90a4ae, detail: 0xffee58 },
    cloud: { below: 14, speed: 45 },
    hazard: {
      kind: 'zap',
      damage: 2,
      pushSpeed: 300,
      wound: 'burn',
      sound: 'none',
      everyMs: 1900,
      side: 0,
      up: 0,
      range: 640,
    },
  },
  // A castle cannon: it lobs bombs at the dolls in front of it
  cannon: {
    metal: true,
    halfWidth: 40,
    height: 46,
    menuScale: 0.8,
    colors: { fill: 0x37474f, dark: 0x1c262b, light: 0x90a4ae, detail: 0x8d6e63 },
    launcher: {
      item: 'bomb',
      everyMs: 3400,
      range: 720,
      tooClose: 240,
      flightMs: 1000,
      x: 38,
      up: 52,
    },
  },
  // A fire spirit: it floats through everything like the ghost, and its touch burns
  wisp: {
    halfWidth: 20,
    height: 44,
    menuScale: 1.1,
    colors: { fill: 0xff7a1a, dark: 0xc62828, light: 0xffee58, detail: 0x1b1b1b },
    monster: {
      attack: 'scare',
      range: 2000,
      everyMs: 750,
      damage: 1,
      pushSpeed: 160,
      speed: 150,
      ghost: { alpha: 0.92, bob: 6, bobMs: 260, wound: 'burn' },
    },
  },
  // A pirate ship: it floats, sails back and forth on water, and fires its cannon
  ship: {
    floats: true,
    burns: true,
    halfWidth: 100,
    height: 150,
    menuScale: 0.5,
    draft: 26,
    colors: { fill: 0x8d5a2b, dark: 0x4e2f12, light: 0xc48a4f, detail: 0xf5efe0 },
    drive: {
      speed: 110,
      damage: 1,
      pushSpeed: 420,
      scale: 1.6,
      wheels: { xs: [], up: 0, radius: 0 },
      seat: { x: -14, up: 24, inFront: true },
      blast: { radius: 200, damage: 3, pushSpeed: 740 },
      hull: 8,
      sails: true,
      cannon: {
        x: 50,
        up: 14,
        tooClose: 170,
        gun: {
          range: 700,
          damage: 0,
          everyMs: 2800,
          autoMs: 2800,
          bulletSpeed: 600,
          muzzle: { x: 0, y: 0 },
          barrelUp: 0,
          shell: {
            blast: { radius: 100, damage: 3, pushSpeed: 600 },
            width: 11,
            height: 11,
            color: 0x212121,
          },
        },
      },
    },
  },
  // A flying saucer to ride in: it takes off with a pilot in it, like the helicopter
  saucer: {
    melts: true,
    metal: true,
    halfWidth: 92,
    height: 70,
    menuScale: 0.6,
    colors: { fill: 0x9aa7b4, dark: 0x3d4852, light: 0xdfe7ee, detail: 0xffeb3b },
    drive: {
      speed: 280,
      damage: 1,
      pushSpeed: 520,
      // Big enough for a doll to sit under the dome
      scale: 2,
      wheels: { xs: [], up: 0, radius: 0 },
      seat: { x: 0, up: 6, inFront: false },
      blast: { radius: 170, damage: 3, pushSpeed: 700 },
      flies: { below: 50, climb: 210, sink: 0.25 },
    },
  },
  // Four steps up to the height of a crate. Dolls walk up them.
  stairs: {
    burns: true,
    floats: true,
    halfWidth: 44,
    height: 56,
    menuScale: 0.75,
    colors: { fill: 0xb07a45, dark: 0x5e3a1a, light: 0xdcaa70, detail: 0x3a2a1a },
    stairs: 4,
  },
  // As big as the wooden crate, but steel: it sinks, a magnet pulls it, lava melts it
  steelCrate: {
    melts: true,
    metal: true,
    halfWidth: 28,
    height: 56,
    menuScale: 1,
    colors: { fill: 0x90a4ae, dark: 0x37474f, light: 0xcfd8dc, detail: 0x546e7a },
  },
  // Low enough for a doll to hop over
  fence: {
    burns: true,
    floats: true,
    halfWidth: 50,
    height: 46,
    menuScale: 0.65,
    colors: { fill: 0xc9a46a, dark: 0x7a5a2e, light: 0xecd2a0, detail: 0x5e3a1a },
  },
  // Castle pieces: gray stone, and they stack like everything else
  tower: {
    halfWidth: 32,
    height: 190,
    menuScale: 0.42,
    colors: { fill: 0x9e9e9e, dark: 0x4a4a4a, light: 0xd0d0d0, detail: 0x757575 },
  },
  rampart: {
    halfWidth: 50,
    height: 90,
    menuScale: 0.6,
    colors: { fill: 0x9e9e9e, dark: 0x4a4a4a, light: 0xd0d0d0, detail: 0x757575 },
  },
  gate: {
    halfWidth: 44,
    height: 170,
    menuScale: 0.45,
    colors: { fill: 0x9e9e9e, dark: 0x4a4a4a, light: 0xd0d0d0, detail: 0x2b2b2b },
    gate: { opening: { halfWidth: 34, height: 130 }, ms: 260 },
  },
  drawbridge: {
    burns: true,
    halfWidth: 8,
    height: 150,
    menuScale: 0.5,
    colors: { fill: 0xb07a45, dark: 0x5e3a1a, light: 0xdcaa70, detail: 0x6f7b83 },
    bridge: true,
  },
  // A siege engine: it hurls boulders at the dolls in front of it
  catapult: {
    burns: true,
    halfWidth: 50,
    height: 58,
    menuScale: 0.7,
    colors: { fill: 0xb07a45, dark: 0x5e3a1a, light: 0xdcaa70, detail: 0x6f7b83 },
    launcher: {
      item: 'boulder',
      everyMs: 2600,
      range: 640,
      tooClose: 130,
      flightMs: 900,
      x: 24,
      up: 84,
      pivot: { x: 6, up: 44 },
      arm: { rest: -1.05, swing: 1.5, backMs: 700, length: 46 },
    },
  },
  banner: {
    burns: true,
    halfWidth: 6,
    height: 112,
    menuScale: 0.65,
    colors: { fill: 0xc62828, dark: 0x5d4037, light: 0xffd54f, detail: 0x8d6e63 },
  },
  toilet: {
    halfWidth: 25,
    height: 58,
    menuScale: 1.05,
    colors: { fill: 0xf4f6f7, dark: 0x8b979e, light: 0xffffff, detail: 0xc3ccd1 },
  },
  tv: {
    melts: true,
    halfWidth: 31,
    height: 46,
    menuScale: 0.95,
    colors: { fill: 0x4a4a55, dark: 0x1f1f26, light: 0x7d7d8a, detail: 0x86b3c9 },
    electric: true,
  },
  trashcan: {
    melts: true,
    metal: true,
    halfWidth: 20,
    height: 50,
    menuScale: 1.15,
    colors: { fill: 0x9aa6ae, dark: 0x4c575e, light: 0xd3dbe0, detail: 0x6b767d },
  },
  armchair: {
    floats: true,
    burns: true,
    halfWidth: 34,
    height: 56,
    menuScale: 0.95,
    colors: { fill: 0xa14040, dark: 0x5a1f1f, light: 0xc96a6a, detail: 0x3b2a20 },
  },
  table: {
    floats: true,
    burns: true,
    halfWidth: 50,
    height: 46,
    menuScale: 0.65,
    colors: { fill: 0xb5814a, dark: 0x60401f, light: 0xdcae78, detail: 0x8a5f33 },
  },
  fridge: {
    melts: true,
    metal: true,
    halfWidth: 27,
    height: 112,
    menuScale: 0.62,
    colors: { fill: 0xe6ebee, dark: 0x7c888f, light: 0xffffff, detail: 0x59646b },
  },
  cone: {
    floats: true,
    burns: true,
    halfWidth: 18,
    height: 42,
    menuScale: 1.35,
    colors: { fill: 0xf57c00, dark: 0x9a4a00, light: 0xffb056, detail: 0xfafafa },
  },
  car: {
    melts: true,
    metal: true,
    halfWidth: 114,
    height: 88,
    menuScale: 1,
    colors: { fill: 0xd32f2f, dark: 0x6d1414, light: 0xff8a80, detail: 0x9fd6f2 },
    drive: {
      speed: 330,
      damage: 1,
      pushSpeed: 520,
      scale: 2.2,
      wheels: { xs: [-30, 30], up: 9, radius: 9 },
      seat: { x: 9, up: 11, inFront: false },
      blast: { radius: 190, damage: 3, pushSpeed: 720 },
    },
  },
  truck: {
    melts: true,
    metal: true,
    halfWidth: 156,
    height: 124,
    menuScale: 1,
    colors: { fill: 0x1976d2, dark: 0x0d3c73, light: 0x7fb8f0, detail: 0xe6ebee },
    drive: {
      speed: 230,
      damage: 2,
      pushSpeed: 640,
      scale: 2,
      wheels: { xs: [-52, -26, 48], up: 11, radius: 11 },
      seat: { x: 52, up: 16, inFront: false },
      blast: { radius: 230, damage: 3, pushSpeed: 780 },
    },
  },
  // Slow and very tough, and its cannon fires shells that explode
  tank: {
    melts: true,
    metal: true,
    halfWidth: 119,
    height: 99,
    menuScale: 1,
    colors: { fill: 0x5b6b3a, dark: 0x2a3118, light: 0x8fa05c, detail: 0x1c1c1f },
    drive: {
      speed: 85,
      damage: 2,
      pushSpeed: 520,
      scale: 1.8,
      wheels: { xs: [-50, -25, 0, 25, 50], up: 10, radius: 9 },
      seat: { x: -2, up: 37, inFront: false },
      blast: { radius: 240, damage: 4, pushSpeed: 820 },
      hull: 12,
      cannon: {
        x: 70,
        up: 46,
        tooClose: 150,
        gun: {
          range: 760,
          damage: 0,
          everyMs: 2400,
          autoMs: 2400,
          bulletSpeed: 640,
          muzzle: { x: 0, y: 0 },
          barrelUp: 0,
          shell: {
            blast: { radius: 105, damage: 3, pushSpeed: 620 },
            width: 18,
            height: 8,
            color: 0x26282b,
          },
        },
      },
    },
  },
  bike: {
    melts: true,
    metal: true,
    halfWidth: 58,
    height: 68,
    menuScale: 1,
    colors: { fill: 0xf9a825, dark: 0x2a2a2e, light: 0xffe082, detail: 0x9aa3ad },
    drive: {
      speed: 430,
      damage: 1,
      pushSpeed: 420,
      scale: 1.7,
      wheels: { xs: [-22, 22], up: 11, radius: 11 },
      seat: { x: -13, up: 30, inFront: true },
      blast: { radius: 140, damage: 2, pushSpeed: 600 },
    },
  },
  skibidi: {
    melts: true,
    halfWidth: 27,
    height: 112,
    // Small enough in the menu for the head to fit in the slot too
    menuScale: 0.44,
    colors: { fill: 0xdfe7ec, dark: 0x66747d, light: 0xffffff, detail: 0x4d5960 },
    monster: {
      range: 560,
      everyMs: 1300,
      damage: 99,
      pushSpeed: 340,
      speed: 55,
      attack: 'laser',
      face: 'skibidi',
      body: 'fridge',
      head: { radius: 17, x: 0, inUp: 92, outUp: 131, popMs: 140 },
      blast: { radius: 150, damage: 3, pushSpeed: 650 },
    },
  },
  skibidiToilet: {
    melts: true,
    halfWidth: 25,
    height: 58,
    menuScale: 0.75,
    colors: { fill: 0xf4f6f7, dark: 0x8b979e, light: 0xffffff, detail: 0xc3ccd1 },
    // Smaller and quicker than the fridge, but it doesn't see as far
    monster: {
      range: 420,
      everyMs: 1100,
      damage: 99,
      pushSpeed: 300,
      speed: 95,
      attack: 'laser',
      face: 'skibidi',
      body: 'toilet',
      head: { radius: 15, x: 6, inUp: 22, outUp: 60, popMs: 140 },
      blast: { radius: 120, damage: 3, pushSpeed: 600 },
    },
  },
  skibidiCone: {
    melts: true,
    halfWidth: 18,
    height: 42,
    menuScale: 0.95,
    colors: { fill: 0xf57c00, dark: 0x9a4a00, light: 0xffb056, detail: 0xfafafa },
    // Tiny and fast, with a weak laser that fires all the time: it takes 1 life a shot
    monster: {
      attack: 'laser',
      range: 360,
      everyMs: 450,
      damage: 1,
      pushSpeed: 200,
      speed: 140,
      face: 'skibidi',
      body: 'cone',
      head: { radius: 16, x: 0, inUp: 12, outUp: 50, popMs: 120, scale: 0.66 },
      blast: { radius: 90, damage: 2, pushSpeed: 480 },
    },
  },
  skibidiTv: {
    melts: true,
    halfWidth: 31,
    height: 46,
    menuScale: 0.9,
    colors: { fill: 0x4a4a55, dark: 0x1f1f26, light: 0x7d7d8a, detail: 0x86b3c9 },
    electric: true,
    // Its TV is on all the time, and its laser takes 2 lives a shot
    monster: {
      attack: 'laser',
      range: 500,
      everyMs: 900,
      damage: 2,
      pushSpeed: 320,
      speed: 75,
      face: 'skibidi',
      body: 'tv',
      head: { radius: 15, x: -4, inUp: 20, outUp: 61, popMs: 140 },
      blast: { radius: 120, damage: 3, pushSpeed: 600 },
    },
  },
  chomper: {
    melts: true,
    halfWidth: 20,
    height: 50,
    menuScale: 0.85,
    colors: { fill: 0x9aa6ae, dark: 0x4c575e, light: 0xd3dbe0, detail: 0x6b767d },
    // It smells dolls from far away, runs at them and swallows them whole
    monster: {
      attack: 'bite',
      range: 1400,
      everyMs: 900,
      damage: 99,
      pushSpeed: 0,
      speed: 150,
      face: 'chomper',
      body: 'trashcan',
      head: { radius: 14, x: 0, inUp: 22, outUp: 58, popMs: 120 },
      blast: { radius: 110, damage: 3, pushSpeed: 560 },
    },
  },
  ghost: {
    halfWidth: 26,
    height: 62,
    menuScale: 0.95,
    colors: { fill: 0xf5f7fa, dark: 0x9aa6b2, light: 0xffffff, detail: 0x263238 },
    // It floats through walls and scares the dolls it touches: 1 life a scare
    monster: {
      attack: 'scare',
      range: 2000,
      everyMs: 1100,
      damage: 1,
      pushSpeed: 260,
      speed: 115,
      ghost: { alpha: 0.82, bob: 7, bobMs: 420 },
    },
  },
  batMonster: {
    halfWidth: 24,
    height: 27,
    menuScale: 1.3,
    colors: { fill: 0x3b2a4a, dark: 0x1a1022, light: 0x6a4d85, detail: 0xff1744 },
    // Quick and small: it flies through everything like the ghost, and bites
    monster: {
      attack: 'scare',
      range: 2000,
      everyMs: 800,
      damage: 1,
      pushSpeed: 90,
      speed: 230,
      ghost: { alpha: 1, bob: 9, bobMs: 130, bite: true, flapMs: 90 },
    },
  },
  ufo: {
    halfWidth: 46,
    height: 37,
    menuScale: 0.8,
    colors: { fill: 0x9aa7b4, dark: 0x3d4852, light: 0xdfe7ee, detail: 0x7cf0c4 },
    // It hovers up under the ceiling and shoots straight down: 2 lives a shot
    monster: {
      attack: 'laser',
      range: 760,
      everyMs: 1000,
      damage: 2,
      pushSpeed: 260,
      speed: 130,
      saucer: { below: 26, aim: 150 },
      blast: { radius: 140, damage: 3, pushSpeed: 650 },
    },
  },
  boss: {
    halfWidth: 58,
    height: 168,
    menuScale: 0.45,
    colors: { fill: 0x6a1b9a, dark: 0x2a0a3f, light: 0xb86fe0, detail: 0xffd54f },
    // The big one: 30 bullets, a stomp that takes 3 lives, a laser that takes 2
    monster: {
      attack: 'laser',
      range: 640,
      everyMs: 2200,
      damage: 2,
      pushSpeed: 420,
      speed: 60,
      blast: { radius: 260, damage: 4, pushSpeed: 900 },
      boss: {
        hull: 30,
        blastHits: 5,
        eyes: { x: 16, up: 141 },
        reach: 70,
        stomp: { everyMs: 1500, damage: 3, pushSpeed: 760, hopMs: 280, hop: 20 },
        smashEveryMs: 550,
      },
    },
  },
  dragon: {
    halfWidth: 62,
    height: 64,
    menuScale: 0.55,
    colors: { fill: 0x2e7d32, dark: 0x1b4d1f, light: 0x9ccc65, detail: 0xffb300 },
    // It flies over the dolls and breathes fire on them. 15 bullets bring it down.
    monster: {
      attack: 'laser',
      range: 760,
      everyMs: 1700,
      damage: 1,
      pushSpeed: 0,
      speed: 150,
      blast: { radius: 170, damage: 3, pushSpeed: 700 },
      dragon: {
        hull: 15,
        below: 46,
        keep: 170,
        breathMs: 900,
        mouth: { x: 64, up: 40 },
        wing: { x: -8, up: 46 },
        flapMs: 520,
        gun: {
          range: 470,
          damage: 1,
          everyMs: 90,
          autoMs: 90,
          bulletSpeed: 560,
          muzzle: { x: 0, y: 0 },
          barrelUp: 0,
          flame: { reach: 470, width: 20, height: 20, color: 0xff7a1a },
        },
      },
    },
  },
  helicopter: {
    melts: true,
    metal: true,
    halfWidth: 96,
    height: 92,
    menuScale: 1,
    colors: { fill: 0x2e7d32, dark: 0x143d17, light: 0x81c784, detail: 0x9fd6f2 },
    drive: {
      speed: 240,
      damage: 1,
      pushSpeed: 520,
      scale: 2,
      wheels: { xs: [], up: 0, radius: 0 },
      seat: { x: 24, up: 1, inFront: false },
      blast: { radius: 210, damage: 3, pushSpeed: 760 },
      flies: { below: 26, climb: 170, sink: 0.22 },
      rotor: { x: 10, up: 45, length: 96, thickness: 3, flat: true },
    },
  },
  plane: {
    melts: true,
    metal: true,
    halfWidth: 112,
    height: 82,
    menuScale: 1,
    colors: { fill: 0xeceff1, dark: 0x546e7a, light: 0xffffff, detail: 0xe53935 },
    drive: {
      speed: 400,
      damage: 1,
      pushSpeed: 600,
      scale: 2,
      wheels: { xs: [-28, 22], up: 4, radius: 4 },
      seat: { x: 16, up: 9, inFront: false },
      blast: { radius: 210, damage: 3, pushSpeed: 760 },
      flies: { below: 150, climb: 150, sink: 0.22 },
      rotor: { x: 55, up: 19, length: 30, thickness: 3, flat: false },
    },
  },
  skateboard: {
    floats: true,
    burns: true,
    halfWidth: 27,
    height: 10,
    menuScale: 1.1,
    colors: { fill: 0x7e57c2, dark: 0x3b2470, light: 0xb39ddb, detail: 0xe0e0e0 },
    drive: {
      speed: 210,
      damage: 0,
      pushSpeed: 260,
      scale: 1,
      wheels: { xs: [-17, 17], up: 3, radius: 3 },
    },
  },
  tire: {
    floats: true,
    burns: true,
    halfWidth: 24,
    height: 48,
    menuScale: 1.2,
    colors: { fill: 0x2a2a2e, dark: 0x0e0e10, light: 0x55555c, detail: 0xa9b1ba },
  },
};

/** How the building pieces are drawn. */
export const BLOCK_LOOK = {
  /** Each board or brick is a little lighter or darker than its neighbors. */
  tones: [-0.1, 0.05, 0.12, -0.04, 0.08, -0.13, 0],
  crate: { boards: 4, frame: 8, brace: 7, nail: 1.7 },
  wall: { brickHeight: 16, brickWidth: 17, mortar: 1.5 },
  plank: { nail: 1.6 },
  girder: { flange: 3.5, rivetEvery: 20, rivet: 1.5 },
  barrel: { round: 7, band: 4, sign: 8 },
} as const;

/** A gun: shoots bullets at dolls that are in front of it. */
export interface GunDef {
  range: number;
  damage: number;
  /** Time between shots when a doll shoots it. */
  everyMs: number;
  /** Time between shots when it is set to fire nonstop by itself. */
  autoMs: number;
  bulletSpeed: number;
  /** Where the bullet comes out in a doll's hand: this far in front of the doll and above its feet. */
  muzzle: { x: number; y: number };
  /** How high the barrel is above the bottom of the gun when it lies around. */
  barrelUp: number;
  /** A shotgun: this many bullets at once, fanned out over `spread` (radians). */
  pellets?: number;
  spread?: number;
  /**
   * A flamethrower: its bullets are puffs of fire that only get `reach` far. They burn
   * the dolls they hit, burn up what is made of wood and set off what explodes.
   */
  flame?: {
    reach: number;
    width: number;
    height: number;
    color: number;
    /** A doll standing in these flames is burnt this often at the most, and not by every puff. */
    burnEveryMs?: number;
    /** They come in bursts: a stream of fire for `ms`, and then a rest of `restMs`. */
    burst?: { ms: number; restMs: number };
  };
  /** Its bullets look different from the usual ones: an arrow, a red ray of light... */
  look?: { width: number; height: number; color: number };
  /** The mark its bullets leave, when not a bullet hole. */
  wound?: WoundKind;
  /** A freeze ray: its bullets are puffs of frost that freeze a doll solid for `ms`. */
  frost?: { ms: number; width: number; height: number; color: number };
  /** A cannon: its bullet is a big shell that goes off with this blast where it hits. */
  shell?: { blast: BlastDef; width: number; height: number; color: number };
}

/**
 * The mark a hit leaves on a doll: a bruise from a fist or something blunt, a slash
 * from a blade, a stab from a point, a hole from a bullet, a burn from a blast. A `cut`
 * goes right through: a part of the doll comes off. Lightning is a `shock`, and a bomb
 * a `blast`: they leave a burn mark too, but they finish a doll off differently. A `saw` cuts it in two at the waist.
 * A monster's `laser` burns too, and what it finishes off turns to ash.
 */
export type WoundKind =
  | 'bruise'
  | 'slash'
  | 'stab'
  | 'hole'
  | 'burn'
  | 'shock'
  | 'laser'
  | 'blast'
  | 'cut'
  | 'saw'
  | 'prongs'
  | 'claw';

/** Something to hit with: reaches further and hurts more than a fist. */
export interface MeleeDef {
  reach: number;
  damage: number;
  /** The mark it leaves. */
  wound: WoundKind;
  /** How fast the one who is hit slides away. */
  pushSpeed: number;
  /** What a hit with it sounds like, when not the usual clang. */
  sound?: 'punch' | 'squeak' | 'zap';
}

export interface BombDef extends BlastDef {
  fuseMs: number;
}

/** An item a doll can hold. `x`, `y` is the middle of its bottom edge when it lies around. */
export interface ItemDef {
  halfWidth: number;
  height: number;
  menuScale: number;
  /** Where its picture goes when it lies around, from the middle of the bottom edge. */
  lie: { x: number; y: number };
  /** A flashlight: a cone of light shines out of its end (`x` along it), the way it points. */
  shines?: { x: number };
  /** How it sits in a doll's hand. */
  hand: { rotation: number; along: number };
  gun?: GunDef;
  melee?: MeleeDef;
  bomb?: BombDef;
  /** It isn't held: a doll puts it on, and it takes the hits for the doll. */
  gear?: GearDef;
  /** It is an orb with a superpower in it: a doll that touches it takes the power. */
  power?: PowerDef;
  /** It smashes to pieces when it hits something at least this fast (pixels per second). */
  breaksAt?: number;
  /**
   * Thrown or swung into a doll, it sinks in and stays there. `out` is how much of
   * it, measured from the grip, is left sticking out of the doll.
   */
  stick?: { out: number };
  /** Dragged along the floor, it wipes stains away. */
  wipes?: boolean;
  /** It is light: in water it comes up and floats. */
  floats?: boolean;
  /** It is made of wood: lava burns it up. */
  burns?: boolean;
  /** Lava melts it: it sinks in and nothing is left of it. */
  melts?: boolean;
  /** It is made of iron or steel: a magnet pulls it. */
  metal?: boolean;
  /**
   * An angry doll throws it at the one it is after, from at least `tooClose` and at
   * most `range` away, so that it gets there in `flightMs`.
   */
  hurl?: { range: number; tooClose: number; flightMs: number };
  /**
   * It is a firework: lit, it waits `fuseMs`, shoots up at `speed` for `flightMs` at
   * most, and bursts into colored sparks.
   */
  rocket?: { fuseMs: number; speed: number; flightMs: number };
  /** It is a magnet: it pulls everything made of metal toward itself, and holds it. */
  magnet?: Pull;
  /**
   * It is a balloon. Let go, it floats up until it is `below` the ceiling, this fast,
   * and a doll that holds it is carried up with it, swaying a little. The doll's
   * raised hand is `armShare` of its height above its head.
   */
  lifts?: { speed: number; below: number; sway: number; swayMs: number; armShare: number };
  /** Struck against the floor at least this fast (pixels per second), it calls down lightning. */
  thunder?: { minSpeed: number };
  /** The colors of the pieces it breaks into. */
  crumbs: readonly number[];
}

/** The items on the weapons page. */
export type WeaponKind =
  | 'pistol'
  | 'mgun'
  | 'shotgun'
  | 'sword'
  | 'katana'
  | 'axe'
  | 'spear'
  | 'bat'
  | 'hammer'
  | 'thunderHammer'
  | 'knife'
  | 'bomb'
  | 'dynamite'
  | 'trident'
  | 'bow'
  | 'rocketLauncher'
  | 'laserGun'
  | 'laserSword';
/** Junk a doll can hold, and hit others with. */
export type JunkItemKind = 'bottle' | 'pan' | 'broom' | 'cane' | 'flashlight';
/** Odd weapons, on the traps page. */
export type OddItemKind =
  | 'glove'
  | 'chicken'
  | 'fish'
  | 'flamethrower'
  | 'freezeRay'
  | 'magnet'
  | 'balloon'
  | 'firework'
  | 'stinkBomb';
/** What a catapult hurls. It isn't in the menu. */
export type AmmoKind = 'boulder';
/** Gear a doll wears: it takes the hits for the doll, until it breaks. */
export type GearKind =
  | 'gasMask'
  | 'armyHelmet'
  | 'spaceHelmet'
  | 'vest'
  | 'knightArmor'
  | 'shield'
  | 'rubberBoots'
  | 'magnetBoots'
  | 'jetpack'
  | 'legArmor'
  | 'gauntlets';
/** Where on a doll a piece of gear goes. A doll wears one piece in each place at the most. */
export type GearSlot = 'face' | 'head' | 'chest' | 'arm' | 'feet' | 'back' | 'legs' | 'hands';
/** Superpowers: a doll that touches one of these orbs takes the power into itself. */
export type PowerKind =
  | 'lightningOrb'
  | 'fireOrb'
  | 'iceOrb'
  | 'laserOrb'
  | 'strengthOrb'
  | 'healingOrb'
  | 'teleportOrb'
  | 'megaOrb';
/**
 * Golden weapons: better than the plain ones, and won in two-player battles. Every
 * match that is won unlocks the next one, and from then on it is in the menu for good.
 */
export type GoldenKind =
  'goldenSword' | 'goldenPistol' | 'goldenHammer' | 'goldenBow' | 'goldenLaser';
export type ItemKind =
  WeaponKind | JunkItemKind | OddItemKind | AmmoKind | GearKind | PowerKind | GoldenKind;

/**
 * A superpower. A doll has one at a time, and glows in its `color`. What it does:
 * - `spell`: angry and empty-handed, the doll shoots this from its hand, like a wizard.
 * - `zap`: angry, it strikes the one it is after from up to `range` away, with lightning
 *   (`spark`) or a laser, from its hand or from its eyes, whatever it holds.
 * - `punch`: its bare fists take this many more lives, and fling the other this fast.
 * - `heal`: it gets a life back every `everyMs`, until it has all of them again.
 * - `teleport`: angry, and further than `from` away from the one it is after, it is
 *   suddenly right next to it. Not more often than every `everyMs`.
 */
export interface PowerDef {
  color: number;
  spell?: GunDef;
  zap?: {
    range: number;
    damage: number;
    pushSpeed: number;
    everyMs: number;
    spark: boolean;
    from: 'hand' | 'eyes';
  };
  punch?: { damage: number; pushSpeed: number };
  heal?: { everyMs: number };
  teleport?: { from: number; everyMs: number };
  /**
   * The mega power: the doll is this many times its size and bulging with muscles, and
   * it has all of these powers, one after the other, each for `turnMs`. What the power
   * itself says (strong fists, healing) it has all the time.
   */
  all?: { size: number; turnMs: number; powers: readonly PowerKind[] };
}

/** The muscles of a doll with the mega power: how much darker their edge and lighter their shine are than the doll. */
export const MUSCLE = { edge: -0.38, shine: 0.32, shineAlpha: 0.55, line: -0.5 } as const;

/**
 * How a doll with a superpower looks: a glow around it, made of a few ovals inside one
 * another. Where its eyes are, for a power that comes out of them. And the sparkles
 * that fly up when a power does something that has no other picture.
 */
export const POWER = {
  aura: { width: 78, height: 156, up: 62, alpha: 0.075, rings: 4 },
  eyes: { x: 9, up: 103 },
  sparkle: {
    count: 8,
    spread: 24,
    rise: 50,
    radius: { min: 1.6, max: 3.6 },
    ms: 750,
    depth: 46,
  },
  /** The sign of the power on an orb is drawn in this color. */
  symbol: 0xffffff,
} as const;

/** A piece of gear: where it is worn, and how many hits it takes before it breaks. */
export interface GearDef {
  slot: GearSlot;
  hits: number;
  /**
   * Its special power: hits that leave these marks do nothing at all to the doll that
   * wears it, and don't wear the piece down either.
   */
  stops?: readonly WoundKind[];
  /** Its special power: the doll that wears it can breathe anywhere, under water and in a stink cloud. */
  air?: true;
  /** Its special power: the bare fists of the doll that wears it take this many more lives. */
  punch?: number;
  /** Its special power: switched on, it carries the doll that wears it through the air. */
  jet?: true;
  /** Its special power: the doll that wears it sticks to the ceiling, feet first, and walks there. */
  clings?: true;
}

/**
 * A jetpack that is switched on. The doll flies this high above the floor, or down
 * or up to the one it is after when it is angry. It climbs and sinks this fast, leans
 * forward this much (radians) when it flies along, and leaves a puff of smoke every
 * `smokeEveryMs`. Its flame flickers between these lengths.
 */
export const JET = {
  height: 200,
  climb: 300,
  lean: 0.24,
  smokeEveryMs: 120,
  smoke: { back: 24, up: 54 },
  flame: { min: 12, max: 22, width: 5, outer: 0xff7a1a, core: 0xffee58 },
} as const;

/**
 * Teleporting: a swirling portal opens a `step` in front of the doll, and another one
 * where it is going. The doll steps into the first, getting thinner and fainter, and
 * out of the second. The whole trip takes `ms`. A portal is a tall oval with a dark
 * middle, a bright rim and arms of light that turn, `turns` times around in all; it
 * opens and closes in `openMs`.
 */
export const PORTAL = {
  ms: 900,
  step: 36,
  width: 50,
  height: 128,
  openMs: 170,
  turns: 2.5,
  rim: 0xb388ff,
  rimWidth: 5,
  fill: 0x150c2e,
  arms: 3,
  dots: 16,
  twist: 0.34,
  colors: [0x7c4dff, 0xb388ff, 0xede7f6],
  depth: 19,
  /** Stepping in, the doll gets this much thinner and shorter at the most. */
  squeeze: { wide: 0.9, tall: 0.12 },
} as const;

/** Magnet boots: a doll whose head gets this close to the ceiling sticks to it, feet first. */
export const CLING = { snap: 16 } as const;

/**
 * Gear on a doll. A hit lands on the outermost piece: the first of these it has on.
 * Every hit leaves a crack of this color, and the last one breaks the piece. A piece
 * that is taken off lands this far in front of the doll.
 */
export const GEAR = {
  order: ['arm', 'hands', 'chest', 'legs', 'back', 'head', 'face', 'feet'],
  crack: 0x101010,
  crackWidth: 1.3,
  /** A crack is a jagged line of this many bits, across about this much of the piece. */
  crackBits: 4,
  crackSpan: 11,
  /** A piece that breaks bursts into this many little pieces. */
  crumbs: 12,
  takeOffGap: 8,
  takeOffUp: 0.55,
} as const satisfies { order: readonly GearSlot[] } & Record<string, unknown>;

export const ITEMS: Record<ItemKind, ItemDef> = {
  pistol: {
    melts: true,
    metal: true,
    crumbs: [0x455a64, 0x1c262b, 0x4e342e],
    halfWidth: 15,
    height: 20,
    menuScale: 2,
    lie: { x: -9.5, y: -13 },
    hand: { rotation: Math.PI / 2, along: 0 },
    gun: {
      range: 430,
      damage: 1,
      everyMs: 1300,
      autoMs: 700,
      bulletSpeed: 760,
      muzzle: { x: 80, y: 86 },
      barrelUp: 16,
    },
  },
  mgun: {
    melts: true,
    metal: true,
    crumbs: [0x455a64, 0x1c262b, 0x4e342e],
    halfWidth: 32,
    height: 24,
    menuScale: 1.05,
    lie: { x: -9, y: -14 },
    hand: { rotation: Math.PI / 2, along: 0 },
    gun: {
      range: 480,
      damage: 1,
      everyMs: 240,
      autoMs: 110,
      bulletSpeed: 900,
      muzzle: { x: 98, y: 86 },
      barrelUp: 17,
    },
  },
  // Three points on a long shaft: angry dolls throw it
  trident: {
    melts: true,
    metal: true,
    crumbs: [0xffd54f, 0xb8860b, 0x4e342e],
    halfWidth: 49,
    height: 18,
    menuScale: 0.68,
    lie: { x: -19, y: -9 },
    hand: { rotation: Math.PI / 4, along: 0 },
    // Thrown or thrust, its three points go right in: three holes, and the doll is out
    melee: { reach: 124, damage: 99, wound: 'prongs', pushSpeed: 300 },
    stick: { out: 46 },
    hurl: { range: 520, tooClose: 70, flightMs: 420 },
  },
  // Its arrows fly far, one at a time
  bow: {
    floats: true,
    burns: true,
    crumbs: [0x8d6e63, 0x4e342e, 0xeeeeee],
    halfWidth: 14,
    height: 46,
    menuScale: 1.05,
    lie: { x: -4, y: -23 },
    hand: { rotation: Math.PI / 2, along: 0 },
    gun: {
      range: 520,
      damage: 1,
      everyMs: 1100,
      autoMs: 650,
      bulletSpeed: 640,
      muzzle: { x: 70, y: 86 },
      barrelUp: 23,
      look: { width: 22, height: 2.5, color: 0x8d6e63 },
      wound: 'stab',
    },
  },
  // Its rocket goes off with a blast where it hits. The one who fires it is safe from it.
  rocketLauncher: {
    melts: true,
    metal: true,
    crumbs: [0x4b5320, 0x23280f, 0xc62828],
    halfWidth: 40,
    height: 22,
    menuScale: 0.85,
    lie: { x: -6, y: -12 },
    hand: { rotation: Math.PI / 2, along: 0 },
    gun: {
      range: 620,
      damage: 0,
      everyMs: 2600,
      autoMs: 1800,
      bulletSpeed: 600,
      muzzle: { x: 108, y: 86 },
      barrelUp: 14,
      shell: {
        blast: { radius: 110, damage: 3, pushSpeed: 640 },
        width: 20,
        height: 8,
        color: 0xc62828,
      },
    },
  },
  // A red ray, very fast: it takes 2 lives, and what it finishes off turns to ash
  laserGun: {
    melts: true,
    crumbs: [0xeceff1, 0x78909c, 0xff1744],
    halfWidth: 22,
    height: 22,
    menuScale: 1.5,
    lie: { x: -15, y: -13 },
    hand: { rotation: Math.PI / 2, along: 0 },
    gun: {
      range: 560,
      damage: 2,
      everyMs: 800,
      autoMs: 380,
      bulletSpeed: 1500,
      muzzle: { x: 92, y: 86 },
      barrelUp: 15,
      look: { width: 30, height: 3, color: 0xff1744 },
      wound: 'laser',
    },
  },
  // A blade of light, with no steel in it: what it finishes off turns to ash
  laserSword: {
    melts: true,
    crumbs: [0x90a4ae, 0x37474f, 0x00e676],
    halfWidth: 39,
    height: 13,
    menuScale: 0.88,
    lie: { x: -26, y: -6.5 },
    hand: { rotation: Math.PI / 4, along: 0 },
    melee: { reach: 94, damage: 2, wound: 'laser', pushSpeed: 220, sound: 'zap' },
  },
  // Slow, and it doesn't reach far, but five bullets fly out at once
  shotgun: {
    melts: true,
    metal: true,
    crumbs: [0x455a64, 0x1c262b, 0x4e342e],
    halfWidth: 37,
    height: 19,
    menuScale: 0.9,
    lie: { x: -12, y: -10 },
    hand: { rotation: Math.PI / 2, along: 0 },
    gun: {
      range: 330,
      damage: 1,
      everyMs: 1600,
      autoMs: 950,
      bulletSpeed: 820,
      muzzle: { x: 106, y: 86 },
      barrelUp: 15,
      pellets: 5,
      spread: 0.34,
    },
  },
  sword: {
    melts: true,
    metal: true,
    crumbs: [0xeef3f6, 0xb4c0c8, 0xffc107],
    halfWidth: 36,
    height: 18,
    menuScale: 0.95,
    lie: { x: -22.5, y: -9 },
    hand: { rotation: Math.PI / 4, along: 0 },
    melee: { reach: 84, damage: 1, wound: 'slash', pushSpeed: 300 },
    stick: { out: 38 },
  },
  // So sharp that one swing takes a part of the doll clean off
  katana: {
    melts: true,
    metal: true,
    crumbs: [0xeef3f6, 0xb4c0c8, 0x1b1b1b],
    halfWidth: 39,
    height: 17,
    menuScale: 0.88,
    lie: { x: -25, y: -6 },
    hand: { rotation: Math.PI / 4, along: 0 },
    melee: { reach: 96, damage: 99, wound: 'cut', pushSpeed: 260 },
  },
  axe: {
    melts: true,
    metal: true,
    crumbs: [0xb4c0c8, 0xc9a46a, 0x7a5a2e],
    halfWidth: 28,
    height: 21,
    menuScale: 1.2,
    lie: { x: -15.5, y: -3 },
    hand: { rotation: Math.PI / 4, along: 0 },
    melee: { reach: 76, damage: 2, wound: 'slash', pushSpeed: 380 },
    stick: { out: 24 },
  },
  spear: {
    floats: true,
    burns: true,
    crumbs: [0xc9a46a, 0x7a5a2e, 0xb4c0c8],
    halfWidth: 49,
    height: 10,
    menuScale: 0.68,
    lie: { x: -19, y: -5 },
    hand: { rotation: Math.PI / 4, along: 0 },
    melee: { reach: 128, damage: 1, wound: 'stab', pushSpeed: 240 },
    stick: { out: 48 },
  },
  bat: {
    floats: true,
    burns: true,
    crumbs: [0xc9a46a, 0x7a5a2e, 0xecd2a0],
    halfWidth: 36,
    height: 12,
    menuScale: 0.95,
    lie: { x: -19, y: -6 },
    hand: { rotation: Math.PI / 4, along: 0 },
    melee: { reach: 78, damage: 1, wound: 'bruise', pushSpeed: 620 },
  },
  // A walking stick with a curved handle: an old man's, and good for a whack
  cane: {
    floats: true,
    burns: true,
    crumbs: [0x6d4c41, 0x3e2723, 0xa1887f],
    halfWidth: 33,
    height: 16,
    menuScale: 1,
    lie: { x: -24, y: -5 },
    hand: { rotation: Math.PI / 4, along: 0 },
    melee: { reach: 82, damage: 1, wound: 'bruise', pushSpeed: 420 },
  },
  flashlight: {
    melts: true,
    metal: true,
    crumbs: [0x263238, 0x546e7a, 0xfff59d],
    halfWidth: 17,
    height: 13,
    menuScale: 1.6,
    lie: { x: -14, y: -6.5 },
    hand: { rotation: Math.PI / 2, along: -4 },
    shines: { x: 31 },
  },
  // Heavy: it takes 2 lives and sends the doll flying
  hammer: {
    melts: true,
    metal: true,
    crumbs: [0xb4c0c8, 0xc9a46a, 0x7a5a2e],
    halfWidth: 27,
    height: 26,
    menuScale: 1.15,
    lie: { x: -15, y: -13 },
    hand: { rotation: Math.PI / 4, along: 0 },
    melee: { reach: 76, damage: 2, wound: 'bruise', pushSpeed: 760 },
  },
  // Slam it on the floor and lightning strikes: everything on the ground is gone
  thunderHammer: {
    metal: true,
    crumbs: [0x78909c, 0xffd54f, 0x5d4037],
    halfWidth: 31,
    height: 30,
    menuScale: 1,
    lie: { x: -15.5, y: -15 },
    hand: { rotation: Math.PI / 4, along: 0 },
    melee: { reach: 78, damage: 3, wound: 'burn', pushSpeed: 820 },
    thunder: { minSpeed: 600 },
  },
  knife: {
    melts: true,
    metal: true,
    crumbs: [0xeef3f6, 0xb4c0c8, 0x5d4037],
    halfWidth: 21,
    height: 11,
    menuScale: 1.4,
    lie: { x: -10, y: -5.5 },
    hand: { rotation: Math.PI / 4, along: 0 },
    melee: { reach: 62, damage: 1, wound: 'stab', pushSpeed: 160 },
    stick: { out: 14 },
  },
  bomb: {
    crumbs: [0x1b1b1b, 0x8a8a8a, 0xff9800],
    halfWidth: 13,
    height: 26,
    menuScale: 1.6,
    lie: { x: 0, y: -13 },
    hand: { rotation: 0, along: 10 },
    bomb: { fuseMs: 4000, radius: 170, damage: 3, pushSpeed: 700 },
  },
  // No blast: it leaves a foul green cloud, and whoever has nothing to breathe through chokes in it
  stinkBomb: {
    floats: true,
    crumbs: [0x558b2f, 0xc5e1a5, 0x8d6e63],
    halfWidth: 13,
    height: 26,
    menuScale: 1.6,
    lie: { x: 0, y: -13 },
    hand: { rotation: 0, along: 10 },
    bomb: {
      fuseMs: 2500,
      radius: 150,
      damage: 0,
      pushSpeed: 0,
      stink: { ms: 8000, everyMs: 1000 },
    },
  },
  // A shorter fuse than the bomb and a much bigger blast
  dynamite: {
    floats: true,
    crumbs: [0xd32f2f, 0x7f1d1d, 0x3e2723],
    halfWidth: 13,
    height: 26,
    menuScale: 1.6,
    lie: { x: 0, y: -13 },
    hand: { rotation: 0, along: 10 },
    bomb: { fuseMs: 3000, radius: 250, damage: 4, pushSpeed: 850 },
  },
  // A boxing glove on a spring: it doesn't hurt at all, but it sends a doll flying
  glove: {
    melts: true,
    crumbs: [0xd32f2f, 0x8a1c1c, 0xb4c0c8],
    halfWidth: 33,
    height: 24,
    menuScale: 1,
    lie: { x: -20, y: -12 },
    hand: { rotation: Math.PI / 2, along: 0 },
    melee: { reach: 84, damage: 0, wound: 'bruise', pushSpeed: 1500, sound: 'punch' },
  },
  // A rubber chicken: no damage, lots of squeaking
  chicken: {
    floats: true,
    burns: true,
    crumbs: [0xffd54f, 0xf9a825, 0xe53935],
    halfWidth: 31,
    height: 22,
    menuScale: 1.05,
    lie: { x: -20, y: -11 },
    hand: { rotation: Math.PI / 4, along: 0 },
    melee: { reach: 72, damage: 0, wound: 'bruise', pushSpeed: 240, sound: 'squeak' },
  },
  // A big wet fish to slap with
  fish: {
    burns: true,
    floats: true,
    crumbs: [0x78909c, 0xb0bec5, 0x455a64],
    halfWidth: 31,
    height: 20,
    menuScale: 1.05,
    lie: { x: -22, y: -10 },
    hand: { rotation: Math.PI / 4, along: 0 },
    melee: { reach: 74, damage: 1, wound: 'bruise', pushSpeed: 440, sound: 'punch' },
  },
  // It doesn't reach far, but what it reaches burns
  flamethrower: {
    melts: true,
    metal: true,
    crumbs: [0xc62828, 0x455a64, 0x1c262b],
    halfWidth: 36,
    height: 23,
    menuScale: 0.95,
    lie: { x: -10, y: -11 },
    hand: { rotation: Math.PI / 2, along: 0 },
    gun: {
      range: 230,
      damage: 1,
      everyMs: 55,
      autoMs: 50,
      bulletSpeed: 440,
      muzzle: { x: 104, y: 86 },
      barrelUp: 14,
      pellets: 2,
      spread: 0.24,
      // Thick with puffs of fire, but a doll in it is only burnt as often as before
      flame: { reach: 250, width: 18, height: 18, color: 0xff7a1a, burnEveryMs: 170 },
    },
  },
  // The golden weapons, in the order they are won
  goldenSword: {
    melts: true,
    metal: true,
    crumbs: [0xffd54f, 0xfffde7, 0xb8860b],
    halfWidth: 36,
    height: 18,
    menuScale: 0.95,
    lie: { x: -22.5, y: -9 },
    hand: { rotation: Math.PI / 4, along: 0 },
    melee: { reach: 92, damage: 3, wound: 'slash', pushSpeed: 420 },
    stick: { out: 38 },
  },
  goldenPistol: {
    melts: true,
    metal: true,
    crumbs: [0xffd54f, 0xfffde7, 0x4e342e],
    halfWidth: 15,
    height: 20,
    menuScale: 2,
    lie: { x: -9.5, y: -13 },
    hand: { rotation: Math.PI / 2, along: 0 },
    gun: {
      range: 540,
      damage: 2,
      everyMs: 450,
      autoMs: 250,
      bulletSpeed: 920,
      muzzle: { x: 80, y: 86 },
      barrelUp: 16,
      look: { width: 12, height: 4, color: 0xffd54f },
    },
  },
  goldenHammer: {
    melts: true,
    metal: true,
    crumbs: [0xffd54f, 0x6d4c41, 0xb8860b],
    halfWidth: 27,
    height: 26,
    menuScale: 1.15,
    lie: { x: -15, y: -13 },
    hand: { rotation: Math.PI / 4, along: 0 },
    melee: { reach: 80, damage: 4, wound: 'bruise', pushSpeed: 1100 },
  },
  goldenBow: {
    floats: true,
    crumbs: [0xffd54f, 0xb8860b, 0xffffff],
    halfWidth: 14,
    height: 46,
    menuScale: 1.05,
    lie: { x: -4, y: -23 },
    hand: { rotation: Math.PI / 2, along: 0 },
    gun: {
      range: 640,
      damage: 3,
      everyMs: 800,
      autoMs: 500,
      bulletSpeed: 820,
      muzzle: { x: 70, y: 86 },
      barrelUp: 23,
      look: { width: 24, height: 3, color: 0xffd54f },
      wound: 'stab',
    },
  },
  goldenLaser: {
    melts: true,
    crumbs: [0xffd54f, 0xb8860b, 0x00e5ff],
    halfWidth: 22,
    height: 22,
    menuScale: 1.5,
    lie: { x: -15, y: -13 },
    hand: { rotation: Math.PI / 2, along: 0 },
    gun: {
      range: 640,
      damage: 3,
      everyMs: 600,
      autoMs: 300,
      bulletSpeed: 1500,
      muzzle: { x: 92, y: 86 },
      barrelUp: 15,
      look: { width: 32, height: 3.5, color: 0xffea00 },
      wound: 'laser',
    },
  },
  // Superpowers: glowing orbs. A doll that touches one has that power from then on
  lightningOrb: {
    floats: true,
    crumbs: [0xffeb3b, 0xfff9c4, 0xfbc02d],
    halfWidth: 13,
    height: 26,
    menuScale: 1.7,
    lie: { x: 0, y: -13 },
    hand: { rotation: 0, along: 0 },
    power: {
      color: 0xffeb3b,
      zap: { range: 380, damage: 2, pushSpeed: 320, everyMs: 1400, spark: true, from: 'hand' },
    },
  },
  fireOrb: {
    floats: true,
    crumbs: [0xff7a1a, 0xffcc80, 0xd84315],
    halfWidth: 13,
    height: 26,
    menuScale: 1.7,
    lie: { x: 0, y: -13 },
    hand: { rotation: 0, along: 0 },
    power: {
      color: 0xff7a1a,
      // A stream of fire, like the wizard's
      spell: FIRE_SPELL,
    },
  },
  iceOrb: {
    floats: true,
    crumbs: [0x81d4fa, 0xe1f5fe, 0x0288d1],
    halfWidth: 13,
    height: 26,
    menuScale: 1.7,
    lie: { x: 0, y: -13 },
    hand: { rotation: 0, along: 0 },
    power: {
      color: 0x81d4fa,
      // A puff of frost: it doesn't hurt, but it freezes the one it hits solid
      spell: {
        range: 420,
        damage: 0,
        everyMs: 1600,
        autoMs: 1600,
        bulletSpeed: 600,
        muzzle: { x: 44, y: 84 },
        barrelUp: 0,
        frost: { ms: 5000, width: 15, height: 11, color: 0xb3e5fc },
      },
    },
  },
  laserOrb: {
    floats: true,
    crumbs: [0xff1744, 0xff8a80, 0xb71c1c],
    halfWidth: 13,
    height: 26,
    menuScale: 1.7,
    lie: { x: 0, y: -13 },
    hand: { rotation: 0, along: 0 },
    power: {
      color: 0xff1744,
      zap: { range: 440, damage: 2, pushSpeed: 150, everyMs: 1700, spark: false, from: 'eyes' },
    },
  },
  strengthOrb: {
    floats: true,
    crumbs: [0xab47bc, 0xe1bee7, 0x6a1b9a],
    halfWidth: 13,
    height: 26,
    menuScale: 1.7,
    lie: { x: 0, y: -13 },
    hand: { rotation: 0, along: 0 },
    power: { color: 0xab47bc, punch: { damage: 2, pushSpeed: 900 } },
  },
  healingOrb: {
    floats: true,
    crumbs: [0x69f0ae, 0xb9f6ca, 0x00c853],
    halfWidth: 13,
    height: 26,
    menuScale: 1.7,
    lie: { x: 0, y: -13 },
    hand: { rotation: 0, along: 0 },
    power: { color: 0x69f0ae, heal: { everyMs: 2500 } },
  },
  teleportOrb: {
    floats: true,
    crumbs: [0x5c6bc0, 0xc5cae9, 0x283593],
    halfWidth: 13,
    height: 26,
    menuScale: 1.7,
    lie: { x: 0, y: -13 },
    hand: { rotation: 0, along: 0 },
    power: { color: 0x7986cb, teleport: { from: 200, everyMs: 2200 } },
  },
  // All of them at once: the doll grows big and muscular, and uses every power in turn
  megaOrb: {
    floats: true,
    crumbs: [0xffd54f, 0xfff8e1, 0xff6f00],
    halfWidth: 13,
    height: 26,
    menuScale: 1.7,
    lie: { x: 0, y: -13 },
    hand: { rotation: 0, along: 0 },
    power: {
      color: 0xffc107,
      punch: { damage: 2, pushSpeed: 900 },
      heal: { everyMs: 2500 },
      all: {
        size: 1.35,
        turnMs: 2400,
        powers: ['lightningOrb', 'fireOrb', 'iceOrb', 'laserOrb', 'teleportOrb'],
      },
    },
  },
  // Gear: a doll that touches a piece puts it on. The middle of each picture is its own middle
  gasMask: {
    melts: true,
    crumbs: [0x3f4a3c, 0x1f2520, 0x4dd0e1],
    halfWidth: 17,
    height: 28,
    menuScale: 1.7,
    lie: { x: 0, y: -15 },
    hand: { rotation: 0, along: 0 },
    // Its power: air to breathe. It is tough, too
    gear: { slot: 'face', hits: 12, air: true },
  },
  armyHelmet: {
    melts: true,
    metal: true,
    crumbs: [0x556b2f, 0x33401c, 0x8a9a5b],
    halfWidth: 20,
    height: 22,
    menuScale: 1.6,
    lie: { x: 0, y: -9 },
    hand: { rotation: 0, along: 0 },
    gear: { slot: 'head', hits: 3 },
  },
  vest: {
    melts: true,
    metal: true,
    crumbs: [0x37474f, 0x1c262b, 0x90a4ae],
    halfWidth: 17,
    height: 32,
    menuScale: 1.5,
    lie: { x: 0, y: -15 },
    hand: { rotation: 0, along: 0 },
    // Its power: fire does nothing
    gear: { slot: 'chest', hits: 5, stops: ['burn'] },
  },
  // A steel breastplate, instead of the vest. Its power: blades don't get through
  knightArmor: {
    melts: true,
    metal: true,
    crumbs: [0xb0bec5, 0x546e7a, 0xffc107],
    halfWidth: 22,
    height: 34,
    menuScale: 1.4,
    lie: { x: 0, y: -16 },
    hand: { rotation: 0, along: 0 },
    gear: { slot: 'chest', hits: 8, stops: ['slash', 'stab', 'cut'] },
  },
  // A glass bubble, instead of the army helmet. Its power: air to breathe
  spaceHelmet: {
    melts: true,
    floats: true,
    crumbs: [0xeceff1, 0x81d4fa, 0x90a4ae],
    halfWidth: 20,
    height: 40,
    menuScale: 1.2,
    lie: { x: 0, y: -29 },
    hand: { rotation: 0, along: 0 },
    gear: { slot: 'head', hits: 4, air: true },
  },
  // Its power: lightning does nothing
  rubberBoots: {
    melts: true,
    floats: true,
    crumbs: [0xfdd835, 0xb8960c, 0x37474f],
    halfWidth: 16,
    height: 21,
    menuScale: 1.7,
    lie: { x: 0, y: -10 },
    hand: { rotation: 0, along: 0 },
    gear: { slot: 'feet', hits: 2, stops: ['shock'] },
  },
  // Steel boots with a magnet in each sole, instead of the rubber boots. Their power: walking on the ceiling
  magnetBoots: {
    melts: true,
    metal: true,
    crumbs: [0x78909c, 0x37474f, 0xe53935],
    halfWidth: 16,
    height: 21,
    menuScale: 1.7,
    lie: { x: 0, y: -10 },
    hand: { rotation: 0, along: 0 },
    gear: { slot: 'feet', hits: 3, clings: true },
  },
  // Steel plates on the thighs and the shins of both legs
  legArmor: {
    melts: true,
    metal: true,
    crumbs: [0x90a4ae, 0x455a64, 0xffc107],
    halfWidth: 15,
    height: 38,
    menuScale: 1.25,
    lie: { x: 0, y: -19 },
    hand: { rotation: 0, along: 0 },
    gear: { slot: 'legs', hits: 5 },
  },
  // Iron gloves, one on each hand. Their power: bare fists hit harder
  gauntlets: {
    melts: true,
    metal: true,
    crumbs: [0x78909c, 0x37474f, 0xffc107],
    halfWidth: 15,
    height: 19,
    menuScale: 1.8,
    lie: { x: 0, y: -9.5 },
    hand: { rotation: 0, along: 0 },
    gear: { slot: 'hands', hits: 3, punch: 1 },
  },
  // Worn on the back. Its power: flying, when it is switched on
  jetpack: {
    melts: true,
    metal: true,
    crumbs: [0xcfd8dc, 0x455a64, 0xe53935],
    halfWidth: 9,
    height: 32,
    menuScale: 1.5,
    lie: { x: 0, y: -16 },
    hand: { rotation: 0, along: 0 },
    gear: { slot: 'back', hits: 3, jet: true },
  },
  shield: {
    melts: true,
    metal: true,
    crumbs: [0x1e88e5, 0xb0bec5, 0xffc107],
    halfWidth: 14,
    height: 40,
    menuScale: 1.3,
    lie: { x: 0, y: -19 },
    hand: { rotation: 0, along: 0 },
    // Its power: bullets and arrows bounce off
    gear: { slot: 'arm', hits: 4, stops: ['hole'] },
  },
  // A catapult's boulder: it knocks down the doll it hits, and smashes when it lands
  boulder: {
    crumbs: [0x9e9e9e, 0x616161, 0xd0d0d0],
    halfWidth: 13,
    height: 26,
    menuScale: 1.5,
    lie: { x: 0, y: -13 },
    hand: { rotation: 0, along: 10 },
    melee: { reach: 60, damage: 2, wound: 'bruise', pushSpeed: 700, sound: 'punch' },
    breaksAt: 260,
  },
  // Light its fuse and stand back: it shoots up and bursts into colors
  firework: {
    burns: true,
    floats: true,
    crumbs: [0xe53935, 0xffd54f, 0x8d6e63],
    halfWidth: 26,
    height: 14,
    menuScale: 1.3,
    lie: { x: -10, y: -7 },
    hand: { rotation: Math.PI / 2, along: 0 },
    rocket: { fuseMs: 700, speed: 620, flightMs: 520 },
  },
  // A puff of frost from it freezes a doll solid for a while
  freezeRay: {
    melts: true,
    crumbs: [0x4fc3f7, 0xe1f5fe, 0x0277bd],
    halfWidth: 22,
    height: 22,
    menuScale: 1.5,
    lie: { x: -15, y: -13 },
    hand: { rotation: Math.PI / 2, along: 0 },
    gun: {
      range: 420,
      damage: 0,
      everyMs: 1000,
      autoMs: 550,
      bulletSpeed: 700,
      muzzle: { x: 92, y: 86 },
      barrelUp: 15,
      frost: { ms: 6000, width: 14, height: 9, color: 0xb3e5fc },
    },
  },
  // It pulls in everything made of metal: weapons, cars, steel beams, robots and knights
  magnet: {
    melts: true,
    crumbs: [0xd32f2f, 0xb4c0c8, 0x7f1d1d],
    halfWidth: 23,
    height: 26,
    menuScale: 1.3,
    lie: { x: -7.5, y: -13 },
    hand: { rotation: Math.PI / 2, along: 0 },
    magnet: { radius: 250, speed: 430, least: 30, eat: 34 },
  },
  // It floats up, and takes the doll that holds it along
  balloon: {
    floats: true,
    burns: true,
    crumbs: [0xe53935, 0xff8a80, 0xfafafa],
    halfWidth: 37,
    height: 34,
    menuScale: 0.85,
    lie: { x: -37, y: -17 },
    hand: { rotation: Math.PI / 2, along: 0 },
    lifts: { speed: 130, below: 26, sway: 0.12, swayMs: 2300, armShare: 0.3 },
  },
  bottle: {
    melts: true,
    floats: true,
    crumbs: [0x2e7d4f, 0xa5e0bd, 0x174428],
    halfWidth: 26,
    height: 16,
    menuScale: 1.3,
    lie: { x: -19, y: -8 },
    hand: { rotation: Math.PI / 4, along: 0 },
    melee: { reach: 70, damage: 1, wound: 'bruise', pushSpeed: 300 },
    breaksAt: 520,
  },
  pan: {
    melts: true,
    metal: true,
    crumbs: [0x3a3f44, 0x8b959c, 0x5d4037],
    halfWidth: 30,
    height: 32,
    menuScale: 1.15,
    lie: { x: -19, y: -16 },
    hand: { rotation: Math.PI / 4, along: 0 },
    melee: { reach: 74, damage: 1, wound: 'bruise', pushSpeed: 540 },
  },
  broom: {
    floats: true,
    burns: true,
    crumbs: [0xc9a46a, 0x7a5a2e, 0xd9b44a],
    halfWidth: 42,
    height: 26,
    menuScale: 0.8,
    lie: { x: -11, y: -13 },
    hand: { rotation: Math.PI / 4, along: 0 },
    // A broom knocks a doll over but doesn't hurt it, so sweeping makes no new mess
    melee: { reach: 96, damage: 0, wound: 'bruise', pushSpeed: 420 },
    wipes: true,
  },
};

/** What is on the weapons page, the building page and the junk page of the menu. */
export const WEAPON_KINDS: readonly WeaponKind[] = [
  'pistol',
  'mgun',
  'shotgun',
  'sword',
  'katana',
  'axe',
  'spear',
  'bat',
  'hammer',
  'thunderHammer',
  'knife',
  'trident',
  'bow',
  'laserGun',
  'laserSword',
  'rocketLauncher',
];
/** The traps page: the traps, the things with a fuse, and the odd weapons. */
export const TRAP_KINDS: readonly (
  { type: 'block'; kind: TrapKind } | { type: 'item'; kind: WeaponKind | OddItemKind }
)[] = [
  { type: 'block', kind: 'cactus' },
  { type: 'block', kind: 'spikes' },
  { type: 'block', kind: 'saw' },
  { type: 'block', kind: 'burner' },
  { type: 'block', kind: 'tesla' },
  { type: 'block', kind: 'laserTower' },
  { type: 'block', kind: 'mine' },
  { type: 'item', kind: 'bomb' },
  { type: 'item', kind: 'dynamite' },
  { type: 'item', kind: 'stinkBomb' },
  { type: 'item', kind: 'glove' },
  { type: 'item', kind: 'chicken' },
  { type: 'item', kind: 'fish' },
  { type: 'item', kind: 'flamethrower' },
];
/** The castle page. */
export const CASTLE_KINDS: readonly CastleKind[] = [
  'tower',
  'rampart',
  'gate',
  'drawbridge',
  'catapult',
  'cannon',
  'banner',
];
/** The page of forces of nature, and of things with strange powers. */
export const ELEMENT_KINDS: readonly (
  { type: 'block'; kind: ElementKind | BuildKind } | { type: 'item'; kind: OddItemKind }
)[] = [
  { type: 'block', kind: 'lava' },
  { type: 'block', kind: 'water' },
  { type: 'block', kind: 'blackHole' },
  { type: 'block', kind: 'cloud' },
  { type: 'block', kind: 'island' },
  { type: 'item', kind: 'firework' },
  { type: 'item', kind: 'freezeRay' },
  { type: 'item', kind: 'magnet' },
  { type: 'item', kind: 'balloon' },
];
export const BUILD_KINDS: readonly BuildKind[] = [
  'crate',
  'hay',
  'steelCrate',
  'stairs',
  'fence',
  'wall',
  'plank',
  'stone',
  'girder',
  'pillar',
  'glass',
  'trampoline',
  'barrel',
  'tnt',
];
export const MONSTER_KINDS: readonly MonsterKind[] = [
  'skibidi',
  'skibidiToilet',
  'skibidiCone',
  'skibidiTv',
  'chomper',
  'ghost',
  'batMonster',
  'ufo',
  'dragon',
  'wisp',
  'shark',
  'boss',
];
export const VEHICLE_KINDS: readonly VehicleKind[] = [
  'car',
  'truck',
  'tank',
  'bike',
  'skateboard',
  'helicopter',
  'plane',
  'saucer',
  'ship',
];
/** The gear page. */
/** The weapons that can fall from the sky in a two-player battle. */
export const DROP_WEAPONS: readonly WeaponKind[] = [
  'pistol',
  'mgun',
  'shotgun',
  'sword',
  'katana',
  'axe',
  'spear',
  'bat',
  'hammer',
  'thunderHammer',
  'knife',
  'bow',
  'laserGun',
  'laserSword',
  'rocketLauncher',
];
/** The golden weapons, in the order they are won. */
export const GOLDEN_KINDS: readonly GoldenKind[] = [
  'goldenSword',
  'goldenPistol',
  'goldenHammer',
  'goldenBow',
  'goldenLaser',
];
/** The superpowers page. */
export const POWER_KINDS: readonly PowerKind[] = [
  'lightningOrb',
  'fireOrb',
  'iceOrb',
  'laserOrb',
  'strengthOrb',
  'healingOrb',
  'teleportOrb',
  'megaOrb',
];
export const GEAR_KINDS: readonly GearKind[] = [
  'gasMask',
  'armyHelmet',
  'spaceHelmet',
  'vest',
  'knightArmor',
  'shield',
  'rubberBoots',
  'magnetBoots',
  'jetpack',
  'legArmor',
  'gauntlets',
];
export const JUNK_KINDS: readonly (
  { type: 'block'; kind: JunkBlockKind } | { type: 'item'; kind: JunkItemKind }
)[] = [
  { type: 'block', kind: 'toilet' },
  { type: 'item', kind: 'bottle' },
  { type: 'block', kind: 'tv' },
  { type: 'block', kind: 'trashcan' },
  { type: 'block', kind: 'armchair' },
  { type: 'block', kind: 'table' },
  { type: 'block', kind: 'fridge' },
  { type: 'block', kind: 'cone' },
  { type: 'item', kind: 'pan' },
  { type: 'block', kind: 'tire' },
  { type: 'item', kind: 'broom' },
  { type: 'item', kind: 'cane' },
  { type: 'item', kind: 'flashlight' },
  { type: 'block', kind: 'piano' },
];

/** The colors of the items. */
export const ITEM_COLORS = {
  gun: { body: 0x455a64, dark: 0x1c262b, shine: 0xa7b8c0, grip: 0x4e342e, gripDark: 0x2b1b17 },
  /** The same parts as the plain weapons have, in gold. */
  golden: {
    gun: { body: 0xffd54f, dark: 0xb8860b, shine: 0xfffde7, grip: 0x4e342e, gripDark: 0x2b1b17 },
    blade: { light: 0xfffde7, steel: 0xffd54f, dark: 0xb8860b },
    sword: { guard: 0xe53935, guardDark: 0x8a1c1c, grip: 0x4e342e, wrap: 0x2b1b17 },
    wood: { fill: 0x6d4c41, dark: 0x3e2723, light: 0x8d6e63, wrap: 0xffd54f },
    bow: { wood: 0xffd54f, dark: 0xb8860b, string: 0xffffff, tip: 0xfffde7, feather: 0xe53935 },
    laser: { body: 0xffd54f, dark: 0xb8860b, shine: 0xfffde7, crystal: 0x00e5ff, grip: 0x4e342e },
  },
  blade: { light: 0xeef3f6, steel: 0xb4c0c8, dark: 0x6f7b83 },
  sword: { guard: 0xffc107, guardDark: 0xb8860b, grip: 0x5d4037, wrap: 0x3e2723 },
  wood: { fill: 0xc9a46a, dark: 0x7a5a2e, light: 0xecd2a0, wrap: 0x3e2723 },
  bomb: { body: 0x1b1b1b, shine: 0x8a8a8a, cap: 0x9e9e9e, fuse: 0xbcaaa4, spark: 0xffb300 },
  dynamite: { stick: 0xd32f2f, dark: 0x7f1d1d, light: 0xff8a80, band: 0x3e2723, fuse: 0xbcaaa4 },
  katana: { grip: 0x1b1b1b, wrap: 0xffd54f, guard: 0xb8860b, guardLight: 0xffd54f },
  glove: { red: 0xd32f2f, dark: 0x8a1c1c, shine: 0xff8a80, spring: 0xb4c0c8, springDark: 0x6f7b83 },
  chicken: { body: 0xffd54f, dark: 0xc79a1a, comb: 0xe53935, beak: 0xff9800, eye: 0x1b1b1b },
  fish: { body: 0x78909c, dark: 0x37474f, belly: 0xcfd8dc, eye: 0x1b1b1b, fin: 0x546e7a },
  flamethrower: { tank: 0xc62828, tankDark: 0x7f1d1d, flame: 0xff7a1a, flameCore: 0xffee58 },
  firework: { tube: 0xe53935, dark: 0x8a1c1c, stripe: 0xffffff, cone: 0xffd54f, stick: 0x8d6e63 },
  boulder: { fill: 0x9e9e9e, dark: 0x616161, light: 0xd0d0d0 },
  gasMask: {
    rubber: 0x4b5a47,
    dark: 0x1f2520,
    light: 0x7d8f78,
    glass: 0x4dd0e1,
    filter: 0xb0bec5,
    ring: 0xfbc02d,
  },
  armyHelmet: { fill: 0x556b2f, dark: 0x33401c, shine: 0xc5d39a },
  vest: { fill: 0x37474f, dark: 0x1c262b, plate: 0x78909c, shine: 0xffffff },
  shield: { fill: 0x1e88e5, dark: 0x263238, rim: 0xb0bec5, cross: 0xffc107 },
  knightArmor: { fill: 0xb0bec5, dark: 0x546e7a, shine: 0xffffff, trim: 0xffc107 },
  spaceHelmet: { white: 0xeceff1, dark: 0x90a4ae, glass: 0x81d4fa },
  rubberBoots: { fill: 0xfdd835, dark: 0xb8960c, sole: 0x37474f, shine: 0xfff59d },
  magnetBoots: { fill: 0x90a4ae, dark: 0x455a64, sole: 0xe53935, shine: 0xeceff1 },
  jetpack: { fill: 0xcfd8dc, dark: 0x455a64, shine: 0xffffff, stripe: 0xe53935 },
  legArmor: { fill: 0x90a4ae, dark: 0x455a64, shine: 0xeceff1, trim: 0xffc107 },
  gauntlets: { fill: 0x78909c, dark: 0x37474f, shine: 0xcfd8dc, trim: 0xffc107 },
  stinkBomb: { body: 0x558b2f, shine: 0xc5e1a5, cap: 0x8d6e63, fuse: 0xbcaaa4 },
  trident: { gold: 0xffd54f, dark: 0xb8860b, shaft: 0x4e342e, shaftLight: 0x8d6e63 },
  bow: { wood: 0x8d6e63, dark: 0x4e342e, string: 0xeeeeee, tip: 0xb4c0c8, feather: 0xe53935 },
  rocket: { tube: 0x5b6628, dark: 0x23280f, shine: 0x9aab55, nose: 0xc62828, grip: 0x3e2723 },
  laser: { body: 0xeceff1, dark: 0x78909c, glow: 0xff1744, grip: 0x37474f },
  laserSword: { grip: 0x90a4ae, dark: 0x37474f, glow: 0x00e676, core: 0xffffff, button: 0xff1744 },
  freezeRay: { body: 0x4fc3f7, dark: 0x0277bd, shine: 0xe1f5fe, crystal: 0xffffff, grip: 0x37474f },
  magnet: { red: 0xd32f2f, dark: 0x7f1d1d, shine: 0xff8a80, tip: 0xcfd8dc, tipDark: 0x78909c },
  balloon: { red: 0xe53935, dark: 0x9a1b1b, shine: 0xffcdd2, string: 0xfafafa },
  thunder: {
    steel: 0x78909c,
    dark: 0x37474f,
    light: 0xcfd8dc,
    gold: 0xffd54f,
    goldDark: 0xb8860b,
    grip: 0x5d4037,
    wrap: 0x3e2723,
  },
  bottle: { glass: 0x2e7d4f, dark: 0x174428, shine: 0xa5e0bd, label: 0xf3ead2, cap: 0xc9a227 },
  pan: { metal: 0x3a3f44, dark: 0x1a1d20, shine: 0x8b959c, handle: 0x5d4037, inside: 0x23272b },
  broom: { bristle: 0xd9b44a, bristleDark: 0x9a7a1e, band: 0xc62828, bandDark: 0x7f1d1d },
  cane: { wood: 0x6d4c41, dark: 0x3e2723, light: 0xa1887f, tip: 0x212121 },
  flashlight: {
    body: 0x263238,
    grip: 0x37474f,
    shine: 0x78909c,
    ring: 0xb0bec5,
    lens: 0xfff59d,
    button: 0xe53935,
  },
} as const;

/** Throwing an item: it flies like a thrown doll, and hurts the doll it hits. */
export const ITEM_TOSS = {
  /** A thrown thing to hit with has to fly at least this fast to hurt a doll. */
  hitSpeed: 320,
  /** How much speed it keeps when it bounces off a wall, or off the doll it hit. */
  bounce: 0.35,
  /** On the ground it slides to a stop in about this long. */
  slideMs: 220,
  stopSpeed: 15,
} as const;

/** The small pieces that things break into. */
export const DEBRIS = {
  /** One piece for every this many square pixels of the thing, between the least and the most. */
  areaPerCrumb: 190,
  least: 7,
  most: 26,
  burst: { spread: 240, size: { min: 4, max: 9 }, spin: 9 },
  /** Pieces from a blast fly away from it this fast, and a bit upward. */
  blastPush: 330,
  blastLift: 260,
  physics: { gravity: 1500, bounce: 0.38, restSpeed: 90, slideMs: 240 },
  /** They lie there this long, then take this long to fade away. */
  lieMs: 2600,
  fadeMs: 1600,
  /** At most this many pieces at once. The oldest go first. */
  max: 320,
  depth: 15,
} as const;

/**
 * What a thing breaks into, by what it is made of: wood into planks and splinters,
 * straw into stalks, brick into bricks and grit, stone into chunks, metal into plates,
 * chips and bolts, glass into sharp see-through shards, and anything else into crumbs.
 * `more` is how many more pieces than usual there are, and `dust` the color of the
 * little cloud that goes up where it broke (none when left out).
 */
export const SHARDS: Record<
  Material,
  { kinds: readonly ShardKind[]; more: number; dust?: number }
> = {
  wood: {
    kinds: [
      { share: 6, shape: 'bar', long: { min: 14, max: 30 }, wide: { min: 4, max: 6.5 } },
      { share: 4, shape: 'bar', long: { min: 6, max: 13 }, wide: { min: 1.4, max: 2.6 } },
    ],
    more: 1.3,
    dust: 0xc9a46a,
  },
  straw: {
    kinds: [{ share: 1, shape: 'bar', long: { min: 9, max: 22 }, wide: { min: 1.2, max: 2.2 } }],
    more: 1.9,
    dust: 0xe6c35c,
  },
  brick: {
    kinds: [
      { share: 7, shape: 'bar', long: { min: 11, max: 13.5 }, wide: { min: 5.5, max: 6.8 } },
      { share: 2, shape: 'chip', long: { min: 5, max: 9 }, wide: { min: 4, max: 7 } },
      { share: 2, shape: 'dot', long: { min: 2.4, max: 4.4 }, wide: { min: 2.4, max: 4.4 } },
    ],
    more: 1.5,
    dust: 0xc98a6e,
  },
  stone: {
    kinds: [
      { share: 6, shape: 'chip', long: { min: 9, max: 18 }, wide: { min: 7, max: 13 } },
      { share: 3, shape: 'bar', long: { min: 5, max: 10 }, wide: { min: 4.5, max: 8 } },
      { share: 2, shape: 'dot', long: { min: 2.4, max: 4.6 }, wide: { min: 2.4, max: 4.6 } },
    ],
    more: 1.2,
    dust: 0xbdbdbd,
  },
  metal: {
    kinds: [
      { share: 6, shape: 'bar', long: { min: 9, max: 21 }, wide: { min: 5, max: 11 } },
      { share: 2, shape: 'chip', long: { min: 6, max: 13 }, wide: { min: 5, max: 9 } },
      { share: 2, shape: 'dot', long: { min: 2.6, max: 4 }, wide: { min: 2.6, max: 4 } },
    ],
    more: 1.1,
    dust: 0xffe082,
  },
  glass: {
    kinds: [
      {
        share: 7,
        shape: 'chip',
        long: { min: 7, max: 19 },
        wide: { min: 4, max: 11 },
        alpha: 0.72,
      },
      {
        share: 3,
        shape: 'chip',
        long: { min: 3, max: 6 },
        wide: { min: 2, max: 4 },
        alpha: 0.85,
      },
    ],
    more: 1.8,
    dust: 0xe1f5fe,
  },
  other: {
    kinds: [{ share: 1, shape: 'bar', long: { min: 4, max: 9 }, wide: { min: 4, max: 9 } }],
    more: 1,
  },
};

/**
 * A vehicle that is wrecked falls apart into parts as well: its wheels drop off and
 * roll away, and the big sheets of its body (doors, a hood, wings) are flung off,
 * spinning. A helicopter loses its rotor blades. The parts lie where they stop for
 * `lieMs` and then fade; a wheel rolls on for about `rollMs`.
 */
export const WRECK = {
  burst: {
    roll: { min: 140, max: 360 },
    hop: { min: 120, max: 300 },
    fling: 320,
    lift: { min: 240, max: 470 },
    spin: 9,
  },
  lieMs: 4200,
  fadeMs: 1700,
  rollMs: 2400,
  tire: 0x1b1b1b,
  hub: 0x9e9e9e,
  cap: 0x424242,
} as const;

export const WRECKS: Partial<Record<BlockKind, WreckSpec>> = {
  car: { wheels: 2, wheelRadius: 13, panels: 3, panel: { long: 30, wide: 16 } },
  truck: { wheels: 3, wheelRadius: 14, panels: 4, panel: { long: 40, wide: 20 } },
  tank: { wheels: 4, wheelRadius: 8, panels: 4, panel: { long: 40, wide: 18 } },
  bike: { wheels: 2, wheelRadius: 15, panels: 1, panel: { long: 24, wide: 10 } },
  skateboard: { wheels: 4, wheelRadius: 4, panels: 1, panel: { long: 42, wide: 5 } },
  plane: { wheels: 2, wheelRadius: 7, panels: 4, panel: { long: 58, wide: 10 } },
  saucer: { wheels: 0, wheelRadius: 0, panels: 4, panel: { long: 38, wide: 12 } },
  helicopter: {
    wheels: 0,
    wheelRadius: 0,
    panels: 3,
    panel: { long: 34, wide: 18 },
    blades: 2,
    blade: { long: 72, wide: 4 },
  },
};

/**
 * What the things are made of, where that can't be told from what they do (what burns
 * is wood, what a magnet pulls is metal, what breaks at a touch is glass).
 */
export const MADE_OF: Partial<Record<BlockKind | ItemKind, Material>> = {
  wall: 'brick',
  tower: 'brick',
  rampart: 'brick',
  gate: 'brick',
  stone: 'stone',
  pillar: 'stone',
  island: 'stone',
  toilet: 'stone',
  boulder: 'stone',
  hay: 'straw',
  broom: 'straw',
  bottle: 'glass',
  tv: 'glass',
  // Rubber, plastic and cloth just crumble
  tire: 'other',
  cone: 'other',
  trampoline: 'other',
  banner: 'other',
  cactus: 'other',
};

/** Wounds and blood. Hurt dolls bleed, and the drops stain the floor until they are wiped away. */
export const BLOOD = {
  color: 0xb71c1c,
  /**
   * How much each kind of wound bleeds: how many drops spray out at once, and how
   * long it drips after that. A slash bleeds the most, a bruise hardly at all.
   */
  byWound: {
    bruise: { burst: 5, bleedMs: 1200 },
    slash: { burst: 34, bleedMs: 9000 },
    stab: { burst: 22, bleedMs: 7500 },
    hole: { burst: 18, bleedMs: 6000 },
    burn: { burst: 9, bleedMs: 2200 },
    shock: { burst: 0, bleedMs: 0 },
    laser: { burst: 9, bleedMs: 2200 },
    blast: { burst: 12, bleedMs: 3000 },
    cut: { burst: 70, bleedMs: 14000 },
    saw: { burst: 70, bleedMs: 14000 },
    prongs: { burst: 40, bleedMs: 9000 },
    claw: { burst: 24, bleedMs: 6000 },
  },
  /** Where a part is cut off, this many more drops spray out, and the cut end looks like this. */
  cutSpray: 60,
  stump: { radius: 6, rim: 0.5 },
  /** The colors of marks that aren't blood: bruises, burns and the dark inside of a hole. */
  marks: {
    bruise: 0x4a2a5e,
    bruiseEdge: 0x7d8a3a,
    burn: 0x17120e,
    ember: 0xff8a1e,
    hole: 0x120a0a,
  },
  /** How far the drops fly. */
  spray: { spread: 230, size: { min: 2.2, max: 4.2 }, spin: 0 },
  /** While a wound drips, a drop falls this often. */
  dripEveryMs: 70,
  drip: { spread: 45, size: { min: 2, max: 3.6 }, spin: 0 },
  /** The wound is about this far up the doll's body, as a part of its height. */
  woundHeight: 0.68,
  /** At most this many wound marks are drawn on one doll. */
  maxWounds: 7,
  stain: { start: 5, grow: 1.1, most: 30, near: 7, max: 520 },
  /** How thick a stain looks, and how far below the floor's edge it lies. */
  stainHeight: 5,
  stainDrop: 3,
  stainAlpha: 0.92,
  /** The broom wipes when its bottom is at most this far above the floor. */
  sweepHeight: 16,
  /** A spray of blood starts off upward this fast (pixels per second). */
  sprayLift: -140,
} as const;

/** The TV plays these programs one after the other, with a blink of snow in between. */
export const TV = {
  /** Where the glass of the screen is on the TV, from the middle of its bottom edge. */
  screen: { x: -25, y: -39, width: 38, height: 28 },
  channels: 4,
  channelMs: 7000,
  snowMs: 350,
  cartoon: { sky: 0x7ec8f0, sun: 0xffe14d, grass: 0x58a946, cloud: 0xffffff, doll: 0x2b2b33 },
  pong: { field: 0x10241a, line: 0x2f6b4c, ball: 0xffffff, paddle: 0xe0e0e0 },
  music: { back: 0x23204a, bars: [0xff5d73, 0xffb84d, 0xfff06a, 0x67e28c, 0x5cc8ff, 0xb388ff] },
  /**
   * A show from Leo's first game: a black stick figure with a pale edge walks through
   * old ruins at night and shoots the white stick figures. One round takes `roundMs`.
   */
  stick: {
    roundMs: 2300,
    sky: 0x1d1f2b,
    moon: 0xe8e2d0,
    ruin: 0x3a3d52,
    ground: 0x2a2620,
    hero: 0x000000,
    heroEdge: 0xd8cfe0,
    enemy: 0xffffff,
    shot: 0xffcc66,
    flash: 0xfff3c4,
    blood: 0xe53935,
  },
  snow: [0x1c1c1c, 0x6e6e6e, 0xb8b8b8, 0xf2f2f2],
  /**
   * Under water a TV breaks little by little: for this long its program glitches more
   * and more, and then the screen is dead for good.
   */
  soakMs: 4500,
  dead: { glass: 0x0b0d10, shine: 0x2a2f36 },
  /** The wild colors on a TV that lightning has hit. */
  haywire: [0xff1744, 0x00e5ff, 0xffea00, 0x76ff03, 0xd500f9],
} as const;

/** A doll that has just let go of an item doesn't grab it again for this long. */
export const PICKUP_WAIT_MS = 1500;

/** At most this many items and building pieces at once; the oldest leaves first. */
export const THINGS_MAX = 150;

/**
 * Things you can click are a bit bigger than they look, so small items are easy to grab.
 * A finger is much thicker than a mouse pointer, so for a touch they are bigger still.
 */
export const PICK_PADDING = 8;
export const PICK_PADDING_TOUCH = 18;

/** A bullet from a gun. */
export const BULLET = { width: 12, height: 3, color: 0xffe082 } as const;

/** The big bang of a bomb. */
/**
 * The cloud a stink bomb leaves: green puffs that drift and swell and fade, one about
 * every `puffEveryMs`, in front of the dolls. A doll that chokes in it shows it.
 */
export const STINK = {
  colors: [0x9ccc65, 0x7cb342, 0xc0ca33],
  alpha: 0.42,
  puffEveryMs: 60,
  radius: { min: 9, max: 19 },
  drift: 30,
  grow: 1.9,
  puffMs: 1400,
  depth: 44,
  emoji: '🤢',
  fontSize: '28px',
  emojiMs: 800,
  emojiGrow: 1.3,
  /** A doll goes on choking for this long after its last breath of the cloud. */
  gagMs: 300,
} as const;

export const BLAST = {
  emoji: '💥',
  fontSize: '110px',
  ms: 520,
  grow: 1.5,
  /** Another bomb caught in the blast goes off this soon after. */
  chainMs: 160,
  /** The spark on a lit fuse blinks this fast. */
  blinkMs: 140,
} as const;

/**
 * The sounds, all made with code. A tone slides from one pitch to another (in Hz); a
 * hiss is a burst of noise through a filter that closes from one pitch to another.
 */
export const SOUND = {
  /** How loud everything is, from 0 to 1. */
  volume: 0.5,
  /** The same sound isn't started again sooner than this. */
  gapSeconds: 0.04,
  hissSeconds: 1,
  punch: {
    tone: { wave: 'sine', from: 170, to: 55, seconds: 0.13, volume: 0.9 },
    hiss: { from: 1800, to: 300, seconds: 0.06, volume: 0.35 },
  },
  clang: {
    tone: { wave: 'sine', from: 190, to: 60, seconds: 0.12, volume: 0.7 },
    ring: { wave: 'triangle', from: 1500, to: 900, seconds: 0.16, volume: 0.22 },
    hiss: { from: 5000, to: 800, seconds: 0.07, volume: 0.3 },
  },
  shot: {
    tone: { wave: 'square', from: 320, to: 70, seconds: 0.07, volume: 0.3 },
    hiss: { from: 6000, to: 500, seconds: 0.11, volume: 0.55 },
  },
  blast: {
    tone: { wave: 'sine', from: 110, to: 28, seconds: 0.7, volume: 1 },
    hiss: { from: 2600, to: 60, seconds: 0.85, volume: 0.95 },
  },
  thud: {
    tone: { wave: 'sine', from: 95, to: 42, seconds: 0.11, volume: 0.8 },
    /** A fall this fast (pixels per second) makes the loudest thud. */
    loudestFall: 900,
    /** Slower falls than this make no sound. */
    quietestFall: 220,
  },
  out: {
    tone: { wave: 'triangle', from: 330, to: 70, seconds: 0.4, volume: 0.4 },
  },
  /**
   * The little tune the skibidis bop along to: an own tune, one note per beat (in
   * Hz, 0 is a rest), played over and over while one of them is around.
   */
  chant: {
    beatMs: 210,
    wave: 'square',
    seconds: 0.13,
    volume: 0.11,
    notes: [147, 147, 0, 196, 147, 0, 220, 196, 147, 147, 0, 262, 247, 196, 175, 0],
  },
  /** A doll being swallowed whole: a wet gulp. */
  gulp: {
    tone: { wave: 'sine', from: 420, to: 70, seconds: 0.22, volume: 0.7 },
    hiss: { from: 900, to: 150, seconds: 0.12, volume: 0.3 },
  },
  /** A ghost scaring a doll: an eerie rising howl. */
  /** A doll in horror mode leaps at somebody: a thin, high shriek sliding down, with a hiss. */
  screech: {
    tone: { wave: 'sawtooth', from: 1400, to: 420, seconds: 0.4, volume: 0.09 },
    hiss: { from: 2400, to: 900, seconds: 0.3, volume: 0.18 },
  },
  spook: {
    tone: { wave: 'sine', from: 260, to: 720, seconds: 0.35, volume: 0.3 },
  },
  /** A rubber chicken: a short, silly squeak. */
  squeak: {
    tone: { wave: 'square', from: 900, to: 1700, seconds: 0.13, volume: 0.25 },
  },
  /** Something falls into water: a soft, wet splash. */
  splash: {
    hiss: { from: 3200, to: 500, seconds: 0.28, volume: 0.5 },
  },
  /** A trampoline: a springy tone that jumps up. */
  boing: {
    tone: { wave: 'sine', from: 170, to: 560, seconds: 0.2, volume: 0.45 },
  },
  /** Thunder: a long low boom under a sharp crack. */
  thunder: {
    tone: { wave: 'sawtooth', from: 120, to: 28, seconds: 1.1, volume: 0.9 },
    hiss: { from: 7000, to: 200, seconds: 0.7, volume: 0.9 },
  },
  /** A laser: a bright tone that drops fast. */
  zap: {
    tone: { wave: 'sawtooth', from: 2200, to: 260, seconds: 0.2, volume: 0.3 },
    hiss: { from: 8000, to: 1200, seconds: 0.12, volume: 0.25 },
  },
  /** Glass breaking: a sharp crack and a bright tinkle. */
  shatter: {
    tone: { wave: 'triangle', from: 3400, to: 1700, seconds: 0.16, volume: 0.25 },
    hiss: { from: 9000, to: 2500, seconds: 0.2, volume: 0.6 },
  },
  /** Something crumbling to pieces: a dull crunch. */
  crumble: {
    hiss: { from: 1400, to: 180, seconds: 0.28, volume: 0.6 },
  },
  /** The wind blowing ash away: a long, soft whoosh. */
  wind: {
    hiss: { from: 500, to: 1600, seconds: 1.5, volume: 0.35 },
  },
} as const satisfies Record<string, unknown>;
