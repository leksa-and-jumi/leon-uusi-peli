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
  /** Bumps this low don't stop a walking doll. */
  stepUp: 4,
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

/** Getting punched: slide back, tip over, lie on the floor, get back up. */
export const KNOCK = {
  fallMs: 260,
  lieMs: 1300,
  riseMs: 420,
  /** How fast the person slides back while tipping over (pixels per second). */
  pushSpeed: 260,
} as const;

/** How a doll that is knocked over flops, like a loose ragdoll. */
export const FLOP = {
  /** It doesn't lie perfectly flat: up to this much less, in radians. */
  lieSpread: 0.22,
  /** How the arms, legs and head wobble when it hits the floor. */
  wobble: { size: 0.5, fadeMs: 260, beatMs: 240 },
  /** How much of the wobble the whole body does. */
  bodyWobble: 0.12,
} as const;

/** A doll with no lives left is a limp ragdoll: every joint swings loosely. */
export const LIMP = {
  /** Arms, elbows and the head: light and loose. */
  loose: { stiffness: 60, damping: 5 },
  /** Legs, knees and the waist: heavier, so they calm down sooner. */
  heavy: { stiffness: 85, damping: 8 },
  /** The whole body swinging from the hand that holds it. */
  hangBody: { stiffness: 38, damping: 5 },
  /** The whole body flopping down flat on the ground. */
  settle: { stiffness: 130, damping: 15 },
  /** How far limbs trail behind when the doll is moved (radians per pixel per second). */
  limbTrail: 0.0026,
  limbTrailMax: 1.3,
  /** The same for the whole body hanging from the hand. */
  bodyTrail: 0.0013,
  bodyTrailMax: 0.9,
  hang: { armMax: 2.9, legMax: 1.1, spread: 0.15, bend: 0.35, head: 0.5, waist: 0.25 },
  /** Grabbed lower than this part of its height, a limp doll hangs upside down. */
  upsideDownBelow: 0.4,
  /** How fast it starts to tip over when the last hit lands (radians per second). */
  deathSpin: 5,
  /** A hit on a doll that is already limp pushes it this much of the usual push. */
  corpsePush: 0.6,
  /** How fast a limp doll lying half outside the area scoots back in (pixels per second). */
  scootSpeed: 320,
} as const;

/** Throwing a doll: let go of it while moving the mouse. */
export const TOSS = {
  /** Slower than this (pixels per second) is just letting go, not a throw. */
  minSpeed: 220,
  maxSpeed: 1500,
  /** A thrown doll at least this fast knocks over the dolls it hits. */
  knockSpeed: 260,
  /** How fast a doll that is hit by a thrown one slides away. */
  pushSpeed: 300,
  /** How much speed the thrown doll keeps after hitting someone, or bouncing off a wall. */
  keep: 0.6,
  bounce: 0.3,
  /** On the ground it slides to a stop in about this long. */
  slideMs: 180,
  stopSpeed: 15,
  /** How fast a limp doll spins in the air (radians per pixel flown). */
  spin: 0.008,
  /** How much a living doll leans into its flight (radians per pixel per second). */
  lean: 0.0005,
  leanMax: 0.5,
  /** How much the newest frame counts when measuring how fast the mouse moves. */
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

/** A building piece: others can stand on it and can't walk through it. */
export interface BlockDef {
  halfWidth: number;
  height: number;
  /** Does a bomb blow it to bits? */
  breakable: boolean;
  /** How much smaller it is drawn in the menu. */
  menuScale: number;
  colors: { fill: number; dark: number; light: number };
}

export type BlockKind = 'crate' | 'wall' | 'plank';

export const BLOCKS: Record<BlockKind, BlockDef> = {
  crate: {
    halfWidth: 28,
    height: 56,
    breakable: true,
    menuScale: 1,
    colors: { fill: 0xa9713c, dark: 0x6e4420, light: 0xcf9a62 },
  },
  wall: {
    halfWidth: 17,
    height: 128,
    breakable: false,
    menuScale: 0.55,
    colors: { fill: 0x9c4a3c, dark: 0x5a2a22, light: 0xc0705f },
  },
  plank: {
    halfWidth: 70,
    height: 18,
    breakable: true,
    menuScale: 0.45,
    colors: { fill: 0xc9a46a, dark: 0x8a6a3a, light: 0xe3c592 },
  },
};

/** A gun: shoots bullets at dolls that are in front of it. */
export interface GunDef {
  range: number;
  damage: number;
  /** Time between shots. */
  everyMs: number;
  bulletSpeed: number;
  /** Where the bullet comes out: this far in front of the doll and above its feet. */
  muzzle: { x: number; y: number };
}

/** Something to hit with: reaches further and hurts more than a fist. */
export interface MeleeDef {
  reach: number;
  damage: number;
  /** How fast the one who is hit slides away. */
  pushSpeed: number;
}

export interface BombDef {
  fuseMs: number;
  radius: number;
  damage: number;
  pushSpeed: number;
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

export type ItemKind = 'pistol' | 'sword' | 'bat' | 'bomb';

export const ITEMS: Record<ItemKind, ItemDef> = {
  pistol: {
    halfWidth: 12,
    height: 17,
    menuScale: 2.2,
    lie: { x: -9, y: -12 },
    hand: { rotation: Math.PI / 2, along: 0 },
    gun: { range: 430, damage: 1, everyMs: 900, bulletSpeed: 760, muzzle: { x: 78, y: 86 } },
  },
  sword: {
    halfWidth: 31,
    height: 14,
    menuScale: 1.05,
    lie: { x: -21, y: -7 },
    hand: { rotation: Math.PI / 4, along: 0 },
    melee: { reach: 84, damage: 1, pushSpeed: 300 },
  },
  bat: {
    halfWidth: 32,
    height: 10,
    menuScale: 1.05,
    lie: { x: -18, y: -5 },
    hand: { rotation: Math.PI / 4, along: 0 },
    melee: { reach: 78, damage: 1, pushSpeed: 620 },
  },
  bomb: {
    halfWidth: 12,
    height: 24,
    menuScale: 1.7,
    lie: { x: 0, y: -12 },
    hand: { rotation: 0, along: 10 },
    bomb: { fuseMs: 4000, radius: 170, damage: 3, pushSpeed: 700 },
  },
};

/** The colors of the items. */
export const ITEM_COLORS = {
  pistol: { body: 0x37474f, dark: 0x1c262b, shine: 0x90a4ae },
  sword: { blade: 0xdfe6ea, edge: 0x8d99a1, guard: 0xffc107, handle: 0x6d4c41 },
  bat: { wood: 0xc9a46a, dark: 0x8a6a3a, grip: 0x3e2723 },
  bomb: { body: 0x212121, shine: 0x757575, cap: 0x9e9e9e, fuse: 0xbcaaa4, spark: 0xffb300 },
} as const;

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
  /** The spark on a lit fuse blinks this fast. */
  blinkMs: 140,
} as const;
