/** Shared game constants. Tweak values here instead of inside scenes. */
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export const COLORS = {
  background: 0x808080,
  text: '#ffffff',
} as const;

/** The black floor along the bottom of the screen. */
export const FLOOR = {
  height: 110,
  color: 0x000000,
} as const;

/** Every text in the game is shown in English and Finnish. */
export const HINT = {
  text:
    '👆 Pick + click   🖐️ Drag (🔫 onto a doll!)   👆👆 Double-click = actions   🗑️ = all away\n' +
    '👆 Valitse + klikkaa   🖐️ Raahaa (🔫 nuken päälle!)   👆👆 Tuplaklikkaa = toiminnot   🗑️ = kaikki pois',
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
  /** Things this low don't stop a walking doll: it steps up onto them (a plank, not a crate). */
  stepUp: 20,
} as const;

/** What is drawn in front of what: bigger numbers are in front. */
export const DEPTH = { block: 10, person: 20, item: 30, bullet: 40 } as const;

/** How a doll looks: the color it is made of, and the color of its ball joints. */
export interface PersonLook {
  body: number;
  joint: number;
}

/** The different-looking dolls you can pick from the menu. */
export const PEOPLE: readonly PersonLook[] = [
  { body: 0xd9b382, joint: 0x8a6a45 },
  { body: 0x6fbf4a, joint: 0x2e7d32 },
  { body: 0x4a90d9, joint: 0x1e4f8a },
  { body: 0xd9534f, joint: 0x7f1d1d },
  { body: 0xe8c84a, joint: 0x9a7b12 },
  { body: 0xa9b1ba, joint: 0x4a5560 },
];

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
  /** A doll is out after this many punches. */
  lives: 3,
  /** A lying person is lifted this much, so they lie on the floor and not in it. */
  lyingLift: 16,
  /** Roughly where the front hand is: this far in front of the middle and above the feet. */
  hand: { x: 22, y: 48 },
} as const;

/** Two quick clicks this close together are a double-click. */
export const DOUBLE_CLICK_MS = 350;

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
  loose: { stiffness: 17, damping: 1.4 },
  /** Legs, knees and the waist: heavier, so they calm down a bit sooner. */
  heavy: { stiffness: 25, damping: 2.2 },
  /** The whole body swinging from the hand that holds it. */
  hangBody: { stiffness: 14, damping: 1.6 },
  /** Every joint once the doll lies on the ground: it drops flat and stays there. */
  ground: { stiffness: 70, damping: 12 },
  /** How much arms and legs sag toward the floor when lying, at most (radians). */
  sag: 0.16,
  /** The whole body flopping down flat on the ground. */
  settle: { stiffness: 110, damping: 13 },
  /** How far limbs trail behind when the doll is moved (radians per pixel per second). */
  limbTrail: 0.005,
  limbTrailMax: 2.4,
  /** The same for the whole body hanging from the hand. */
  bodyTrail: 0.0026,
  bodyTrailMax: 1.5,
  /** How soon arms and legs fly apart when the doll drops (per pixel per second). */
  floatTrail: 0.0022,
  hang: {
    armMax: 2.9,
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
  /** The throw goes the way the mouse moved over this last stretch of time. */
  windowMs: 110,
  /** How much harder than the mouse moved the doll flies. */
  power: 1.25,
  /** Slower than this (pixels per second) is just letting go, not a throw. */
  minSpeed: 200,
  maxSpeed: 1900,
  /** A thrown doll at least this fast knocks over the dolls it hits. */
  knockSpeed: 170,
  /** A doll that is hit slides away at least this fast, or this much of the thrown doll's speed. */
  pushSpeed: 260,
  pushShare: 0.55,
  /** How much speed the thrown doll keeps after hitting someone, or bouncing off a wall. */
  keep: 0.82,
  bounce: 0.45,
  /** On the ground it slides to a stop in about this long. */
  slideMs: 300,
  stopSpeed: 15,
  /** How fast a limp doll spins in the air (radians per pixel flown). */
  spin: 0.008,
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
/** The bubbles of a gun: turn it around, and make it fire nonstop. */
export const GUN_ACTIONS: readonly ActionId[] = ['throw', 'turn', 'fire'];
/** The most bubbles anything has. */
export const MAX_BUBBLES = 6;

/** The round action bubbles that come up above a double-clicked person. */
export const BUBBLES = {
  row: { radius: 22, gap: 8, above: 10 },
  color: 0xffffff,
  edge: 0x1b1b1b,
  edgeWidth: 2,
  fontSize: '22px',
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
  tabs: { x: 8, y: 9, width: 46, height: 25, gap: 3, vertical: true },
  tabColor: 0x555555,
  tabSelectedColor: 0xffd54f,
  tabRadius: 7,
  tabFontSize: '16px',
  slots: { x: 66, y: 10, width: 72, height: 80, gap: 12 },
  slotColor: 0x9e9e9e,
  slotRadius: 10,
  selected: { color: 0xffd54f, width: 5 },
  /** Dolls in the menu are drawn this much smaller. */
  personScale: 0.56,
  /** How far above the slot's bottom edge the feet stand. */
  feetInset: 7,
  /** The button that takes everything away. */
  clear: { x: GAME_WIDTH - 88, y: 10, width: 72, height: 80, gap: 0 },
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
  blast?: BlastDef;
}

export type BlockKind = 'crate' | 'wall' | 'plank' | 'stone' | 'girder' | 'barrel';

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
    blast: { radius: 150, damage: 3, pushSpeed: 700 },
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
}

/** Something to hit with: reaches further and hurts more than a fist. */
export interface MeleeDef {
  reach: number;
  damage: number;
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
}

export type ItemKind = 'pistol' | 'mgun' | 'sword' | 'axe' | 'spear' | 'bat' | 'bomb';

export const ITEMS: Record<ItemKind, ItemDef> = {
  pistol: {
    halfWidth: 15,
    height: 20,
    menuScale: 2,
    lie: { x: -9.5, y: -13 },
    hand: { rotation: Math.PI / 2, along: 0 },
    gun: {
      range: 430,
      damage: 1,
      everyMs: 900,
      autoMs: 260,
      bulletSpeed: 760,
      muzzle: { x: 80, y: 86 },
      barrelUp: 16,
    },
  },
  mgun: {
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
  sword: {
    halfWidth: 36,
    height: 18,
    menuScale: 0.95,
    lie: { x: -22.5, y: -9 },
    hand: { rotation: Math.PI / 4, along: 0 },
    melee: { reach: 84, damage: 1, pushSpeed: 300 },
  },
  axe: {
    halfWidth: 28,
    height: 21,
    menuScale: 1.2,
    lie: { x: -15.5, y: -3 },
    hand: { rotation: Math.PI / 4, along: 0 },
    melee: { reach: 76, damage: 2, pushSpeed: 380 },
  },
  spear: {
    halfWidth: 49,
    height: 10,
    menuScale: 0.68,
    lie: { x: -19, y: -5 },
    hand: { rotation: Math.PI / 4, along: 0 },
    melee: { reach: 128, damage: 1, pushSpeed: 240 },
  },
  bat: {
    halfWidth: 36,
    height: 12,
    menuScale: 0.95,
    lie: { x: -19, y: -6 },
    hand: { rotation: Math.PI / 4, along: 0 },
    melee: { reach: 78, damage: 1, pushSpeed: 620 },
  },
  bomb: {
    halfWidth: 13,
    height: 26,
    menuScale: 1.6,
    lie: { x: 0, y: -13 },
    hand: { rotation: 0, along: 10 },
    bomb: { fuseMs: 4000, radius: 170, damage: 3, pushSpeed: 700 },
  },
};

/** The colors of the items. */
export const ITEM_COLORS = {
  gun: { body: 0x455a64, dark: 0x1c262b, shine: 0xa7b8c0, grip: 0x4e342e, gripDark: 0x2b1b17 },
  blade: { light: 0xeef3f6, steel: 0xb4c0c8, dark: 0x6f7b83 },
  sword: { guard: 0xffc107, guardDark: 0xb8860b, grip: 0x5d4037, wrap: 0x3e2723 },
  wood: { fill: 0xc9a46a, dark: 0x7a5a2e, light: 0xecd2a0, wrap: 0x3e2723 },
  bomb: { body: 0x1b1b1b, shine: 0x8a8a8a, cap: 0x9e9e9e, fuse: 0xbcaaa4, spark: 0xffb300 },
} as const;

/** A doll that has just let go of an item doesn't grab it again for this long. */
export const PICKUP_WAIT_MS = 1500;

/** At most this many items and building pieces at once; the oldest leaves first. */
export const THINGS_MAX = 150;

/** Things you can click are a bit bigger than they look, so small items are easy to grab. */
export const PICK_PADDING = 8;

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
