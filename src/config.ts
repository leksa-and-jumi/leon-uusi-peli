/** Shared game constants. Tweak values here instead of inside scenes. */
export const GAME_WIDTH = 1120;
export const GAME_HEIGHT = 660;

export const COLORS = {
  background: 0x808080,
  text: '#ffffff',
} as const;

/** The black floor along the bottom of the screen. */
export const FLOOR = {
  height: 110,
  color: 0x000000,
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
  /** A doll lying on the ground is behind the building pieces: it lies under them. */
  downDoll: 8,
  /** A doll sitting inside a vehicle is behind it, and shows through its windows. */
  driver: 9,
  block: 10,
  /** A doll sitting on a motorbike is in front of it. */
  rider: 11,
  person: 20,
  item: 30,
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
  extra?: 'antenna' | 'headband' | 'helmet' | 'patches';
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
}

/**
 * The dolls you can pick from the menu. First six plain ones in different colors.
 * Then four special ones that are always angry, have more lives than the plain ones
 * and hit harder: a robot, a ninja (fast), a knight (toughest, slow) and a zombie
 * (slow, arms out).
 */
export const PEOPLE: readonly PersonLook[] = [
  { body: 0xd9b382, joint: 0x8a6a45 },
  { body: 0x6fbf4a, joint: 0x2e7d32 },
  { body: 0x4a90d9, joint: 0x1e4f8a },
  { body: 0xd9534f, joint: 0x7f1d1d },
  { body: 0xe8c84a, joint: 0x9a7b12 },
  { body: 0xa9b1ba, joint: 0x4a5560 },
  {
    body: 0x607d8b,
    joint: 0x263238,
    eye: 0xff1744,
    extra: 'antenna',
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
];

/** The colors of the extras that the special dolls wear. */
export const EXTRA_COLORS = {
  antenna: { rod: 0x263238, ball: 0xff1744 },
  headband: { band: 0xd32f2f, dark: 0x8e1c1c },
  helmet: { visor: 0x263238, crest: 0x1e88e5, crestDark: 0x0d47a1 },
  patches: { blotch: 0x5a6e38 },
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
];
/** The bubbles of a building piece or an item, and of a bomb. */
export const THING_ACTIONS: readonly ActionId[] = ['throw'];
export const BOMB_ACTIONS: readonly ActionId[] = ['throw', 'fuse'];
/** A barrel can be set off the same way. */
export const BARREL_ACTIONS: readonly ActionId[] = ['throw', 'fuse'];
/** The bubbles of a vehicle: turn it around, and make it drive. */
export const VEHICLE_ACTIONS: readonly ActionId[] = ['throw', 'turn', 'drive'];
/** The bubbles of a gun: turn it around, and make it fire nonstop. */
export const GUN_ACTIONS: readonly ActionId[] = ['throw', 'turn', 'fire'];
/** The most bubbles anything has. */
export const MAX_BUBBLES = 6;

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
  // Six big buttons, two under each other in three columns: easy to hit with a finger
  tabs: { x: 6, y: 7, width: 46, height: 41, gap: 4, vertical: true, wrap: 2 },
  tabColor: 0x555555,
  tabSelectedColor: 0xffd54f,
  tabRadius: 7,
  tabFontSize: '24px',
  slots: { x: 160, y: 10, width: 61, height: 80, gap: 7 },
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
] as const;

export type TabId = (typeof TABS)[number]['id'];

/** What a blast does to the dolls it catches. */
export interface BlastDef {
  radius: number;
  damage: number;
  pushSpeed: number;
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
}

/** The pieces on the building page. */
export type BuildKind =
  'crate' | 'wall' | 'plank' | 'stone' | 'girder' | 'barrel' | 'glass' | 'tnt' | 'pillar';
/** Junk that is solid like a building piece: you can stack it and stand on it. */
export type JunkBlockKind =
  'toilet' | 'tv' | 'trashcan' | 'armchair' | 'table' | 'fridge' | 'cone' | 'tire';
/** The things on the vehicles page. They are solid like building pieces, and they drive. */
export type VehicleKind = 'car' | 'truck' | 'bike' | 'skateboard' | 'helicopter' | 'plane';
/** Things that are alive in their own way and go after the dolls. */
export type MonsterKind =
  | 'skibidi'
  | 'skibidiToilet'
  | 'skibidiCone'
  | 'skibidiTv'
  | 'chomper'
  | 'ghost'
  | 'batMonster'
  | 'ufo';
export type BlockKind = BuildKind | JunkBlockKind | VehicleKind | MonsterKind;

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
  };
  /**
   * A flying saucer: it hovers `below` the ceiling, flies over the closest doll and
   * shoots straight down at it once it is at most `aim` pixels off to the side.
   */
  saucer?: { below: number; aim: number };
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

/** The laser a monster shoots from its eyes. */
export const LASER = {
  color: 0xff1744,
  core: 0xffffff,
  width: 7,
  coreWidth: 2.5,
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
    halfWidth: 90,
    height: 14,
    menuScale: 0.36,
    colors: { fill: 0x6f7f8c, dark: 0x2f3a43, light: 0xb1c1cc, detail: 0x232b31 },
  },
  barrel: {
    halfWidth: 19,
    height: 50,
    menuScale: 1.2,
    colors: { fill: 0xc62828, dark: 0x6d1414, light: 0xf08a85, detail: 0xffd54f },
    blast: { fuseMs: 1500, radius: 150, damage: 3, pushSpeed: 700 },
  },
  glass: {
    halfWidth: 7,
    height: 120,
    menuScale: 0.6,
    colors: { fill: 0xa9d6e8, dark: 0x4f7f93, light: 0xeaf8ff, detail: 0xffffff },
    fragile: true,
  },
  // A bigger bang than the barrel, and a longer fuse to get away from it
  tnt: {
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
  toilet: {
    halfWidth: 25,
    height: 58,
    menuScale: 1.05,
    colors: { fill: 0xf4f6f7, dark: 0x8b979e, light: 0xffffff, detail: 0xc3ccd1 },
  },
  tv: {
    halfWidth: 31,
    height: 46,
    menuScale: 0.95,
    colors: { fill: 0x4a4a55, dark: 0x1f1f26, light: 0x7d7d8a, detail: 0x86b3c9 },
  },
  trashcan: {
    halfWidth: 20,
    height: 50,
    menuScale: 1.15,
    colors: { fill: 0x9aa6ae, dark: 0x4c575e, light: 0xd3dbe0, detail: 0x6b767d },
  },
  armchair: {
    halfWidth: 34,
    height: 56,
    menuScale: 0.95,
    colors: { fill: 0xa14040, dark: 0x5a1f1f, light: 0xc96a6a, detail: 0x3b2a20 },
  },
  table: {
    halfWidth: 50,
    height: 46,
    menuScale: 0.65,
    colors: { fill: 0xb5814a, dark: 0x60401f, light: 0xdcae78, detail: 0x8a5f33 },
  },
  fridge: {
    halfWidth: 27,
    height: 112,
    menuScale: 0.62,
    colors: { fill: 0xe6ebee, dark: 0x7c888f, light: 0xffffff, detail: 0x59646b },
  },
  cone: {
    halfWidth: 18,
    height: 42,
    menuScale: 1.35,
    colors: { fill: 0xf57c00, dark: 0x9a4a00, light: 0xffb056, detail: 0xfafafa },
  },
  car: {
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
  bike: {
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
    halfWidth: 31,
    height: 46,
    menuScale: 0.9,
    colors: { fill: 0x4a4a55, dark: 0x1f1f26, light: 0x7d7d8a, detail: 0x86b3c9 },
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
  helicopter: {
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
}

/**
 * The mark a hit leaves on a doll: a bruise from a fist or something blunt, a slash
 * from a blade, a stab from a point, a hole from a bullet, a burn from a blast.
 */
export type WoundKind = 'bruise' | 'slash' | 'stab' | 'hole' | 'burn';

/** Something to hit with: reaches further and hurts more than a fist. */
export interface MeleeDef {
  reach: number;
  damage: number;
  /** The mark it leaves. */
  wound: WoundKind;
  /** How fast the one who is hit slides away. */
  pushSpeed: number;
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
  /** How it sits in a doll's hand. */
  hand: { rotation: number; along: number };
  gun?: GunDef;
  melee?: MeleeDef;
  bomb?: BombDef;
  /** It smashes to pieces when it hits something at least this fast (pixels per second). */
  breaksAt?: number;
  /**
   * Thrown or swung into a doll, it sinks in and stays there. `out` is how much of
   * it, measured from the grip, is left sticking out of the doll.
   */
  stick?: { out: number };
  /** Dragged along the floor, it wipes stains away. */
  wipes?: boolean;
  /** The colors of the pieces it breaks into. */
  crumbs: readonly number[];
}

/** The items on the weapons page. */
export type WeaponKind =
  | 'pistol'
  | 'mgun'
  | 'shotgun'
  | 'sword'
  | 'axe'
  | 'spear'
  | 'bat'
  | 'hammer'
  | 'knife'
  | 'bomb'
  | 'dynamite';
/** Junk a doll can hold, and hit others with. */
export type JunkItemKind = 'bottle' | 'pan' | 'broom';
export type ItemKind = WeaponKind | JunkItemKind;

export const ITEMS: Record<ItemKind, ItemDef> = {
  pistol: {
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
  // Slow, and it doesn't reach far, but five bullets fly out at once
  shotgun: {
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
    crumbs: [0xeef3f6, 0xb4c0c8, 0xffc107],
    halfWidth: 36,
    height: 18,
    menuScale: 0.95,
    lie: { x: -22.5, y: -9 },
    hand: { rotation: Math.PI / 4, along: 0 },
    melee: { reach: 84, damage: 1, wound: 'slash', pushSpeed: 300 },
    stick: { out: 38 },
  },
  axe: {
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
    crumbs: [0xc9a46a, 0x7a5a2e, 0xecd2a0],
    halfWidth: 36,
    height: 12,
    menuScale: 0.95,
    lie: { x: -19, y: -6 },
    hand: { rotation: Math.PI / 4, along: 0 },
    melee: { reach: 78, damage: 1, wound: 'bruise', pushSpeed: 620 },
  },
  // Heavy: it takes 2 lives and sends the doll flying
  hammer: {
    crumbs: [0xb4c0c8, 0xc9a46a, 0x7a5a2e],
    halfWidth: 27,
    height: 26,
    menuScale: 1.15,
    lie: { x: -15, y: -13 },
    hand: { rotation: Math.PI / 4, along: 0 },
    melee: { reach: 76, damage: 2, wound: 'bruise', pushSpeed: 760 },
  },
  knife: {
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
  // A shorter fuse than the bomb and a much bigger blast
  dynamite: {
    crumbs: [0xd32f2f, 0x7f1d1d, 0x3e2723],
    halfWidth: 13,
    height: 26,
    menuScale: 1.6,
    lie: { x: 0, y: -13 },
    hand: { rotation: 0, along: 10 },
    bomb: { fuseMs: 3000, radius: 250, damage: 4, pushSpeed: 850 },
  },
  bottle: {
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
    crumbs: [0x3a3f44, 0x8b959c, 0x5d4037],
    halfWidth: 30,
    height: 32,
    menuScale: 1.15,
    lie: { x: -19, y: -16 },
    hand: { rotation: Math.PI / 4, along: 0 },
    melee: { reach: 74, damage: 1, wound: 'bruise', pushSpeed: 540 },
  },
  broom: {
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
  'axe',
  'spear',
  'bat',
  'hammer',
  'knife',
  'bomb',
  'dynamite',
];
export const BUILD_KINDS: readonly BuildKind[] = [
  'crate',
  'wall',
  'plank',
  'stone',
  'girder',
  'pillar',
  'glass',
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
];
export const VEHICLE_KINDS: readonly VehicleKind[] = [
  'car',
  'truck',
  'bike',
  'skateboard',
  'helicopter',
  'plane',
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
];

/** The colors of the items. */
export const ITEM_COLORS = {
  gun: { body: 0x455a64, dark: 0x1c262b, shine: 0xa7b8c0, grip: 0x4e342e, gripDark: 0x2b1b17 },
  blade: { light: 0xeef3f6, steel: 0xb4c0c8, dark: 0x6f7b83 },
  sword: { guard: 0xffc107, guardDark: 0xb8860b, grip: 0x5d4037, wrap: 0x3e2723 },
  wood: { fill: 0xc9a46a, dark: 0x7a5a2e, light: 0xecd2a0, wrap: 0x3e2723 },
  bomb: { body: 0x1b1b1b, shine: 0x8a8a8a, cap: 0x9e9e9e, fuse: 0xbcaaa4, spark: 0xffb300 },
  dynamite: { stick: 0xd32f2f, dark: 0x7f1d1d, light: 0xff8a80, band: 0x3e2723, fuse: 0xbcaaa4 },
  bottle: { glass: 0x2e7d4f, dark: 0x174428, shine: 0xa5e0bd, label: 0xf3ead2, cap: 0xc9a227 },
  pan: { metal: 0x3a3f44, dark: 0x1a1d20, shine: 0x8b959c, handle: 0x5d4037, inside: 0x23272b },
  broom: { bristle: 0xd9b44a, bristleDark: 0x9a7a1e, band: 0xc62828, bandDark: 0x7f1d1d },
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
  },
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
  depth: 5,
} as const;

/** The TV plays these programs one after the other, with a blink of snow in between. */
export const TV = {
  /** Where the glass of the screen is on the TV, from the middle of its bottom edge. */
  screen: { x: -25, y: -39, width: 38, height: 28 },
  channels: 3,
  channelMs: 7000,
  snowMs: 350,
  cartoon: { sky: 0x7ec8f0, sun: 0xffe14d, grass: 0x58a946, cloud: 0xffffff, doll: 0x2b2b33 },
  pong: { field: 0x10241a, line: 0x2f6b4c, ball: 0xffffff, paddle: 0xe0e0e0 },
  music: { back: 0x23204a, bars: [0xff5d73, 0xffb84d, 0xfff06a, 0x67e28c, 0x5cc8ff, 0xb388ff] },
  snow: [0x1c1c1c, 0x6e6e6e, 0xb8b8b8, 0xf2f2f2],
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
  spook: {
    tone: { wave: 'sine', from: 260, to: 720, seconds: 0.35, volume: 0.3 },
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
} as const satisfies Record<string, unknown>;
