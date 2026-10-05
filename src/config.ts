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
    '👆 Pick + click = 🧍   🖐️ Drag   👆👆 Double-click = actions   🗑️ = all away\n' +
    '👆 Valitse + klikkaa = 🧍   🖐️ Raahaa   👆👆 Tuplaklikkaa = toiminnot   🗑️ = kaikki pois',
  fontSize: '13px',
  /** How far above the bottom of the screen the middle of the text is. */
  fromBottom: 36,
} as const;

/** How a person looks. Hair can be short, long, spiky, a cap, or none at all. */
export interface PersonLook {
  skin: number;
  hairStyle: 'short' | 'long' | 'spiky' | 'cap' | 'bald';
  hair: number;
  shirt: number;
  pants: number;
  shoes: number;
}

/** The different-looking people you can pick from the menu. */
export const PEOPLE: readonly PersonLook[] = [
  {
    skin: 0xf2c9a0,
    hairStyle: 'short',
    hair: 0x5d4037,
    shirt: 0xe53935,
    pants: 0x1e3a8a,
    shoes: 0xffffff,
  },
  {
    skin: 0x8d5a3b,
    hairStyle: 'long',
    hair: 0x1b1b1b,
    shirt: 0xfdd835,
    pants: 0x6a1b9a,
    shoes: 0xffffff,
  },
  {
    skin: 0xffdfc4,
    hairStyle: 'spiky',
    hair: 0xff8f00,
    shirt: 0x43a047,
    pants: 0x5d4037,
    shoes: 0xeeeeee,
  },
  {
    skin: 0xc68642,
    hairStyle: 'cap',
    hair: 0x1e88e5,
    shirt: 0xffffff,
    pants: 0xc62828,
    shoes: 0xfdd835,
  },
  {
    skin: 0xe0ac69,
    hairStyle: 'bald',
    hair: 0x000000,
    shirt: 0xfb8c00,
    pants: 0x00695c,
    shoes: 0xffffff,
  },
  {
    skin: 0x6b4226,
    hairStyle: 'long',
    hair: 0xf06292,
    shirt: 0x00acc1,
    pants: 0xf5f5f5,
    shoes: 0xe53935,
  },
];

/** A person standing in the area. `x`, `y` is always the spot between the feet. */
export const PERSON = {
  height: 120,
  halfWidth: 24,
  /** How hard people are pulled down when you drop them (pixels per second²). */
  gravity: 1800,
  /** At most this many people at once; the oldest one leaves when a new one comes. */
  max: 100,
  face: { eye: 0x1b1b1b, mouth: 0x7a2e2e, angryBrow: 0x1b1b1b },
  /** A lying person is lifted this much, so they lie on the floor and not in it. */
  lyingLift: 16,
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
} as const;

/** Getting punched: slide back, tip over, lie on the floor, get back up. */
export const KNOCK = {
  fallMs: 260,
  lieMs: 1300,
  riseMs: 420,
  /** How fast the person slides back while tipping over (pixels per second). */
  pushSpeed: 260,
} as const;

/** The 💥 that pops up where a punch lands. */
export const HIT_FX = { emoji: '💥', fontSize: '34px', ms: 380, grow: 1.6, depth: 80 } as const;

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

/** What the bubbles above a person do. Walk, dance and angry stay on until pressed again. */
export const ACTIONS = [
  { id: 'throw', emoji: '🚀' },
  { id: 'turn', emoji: '🔄' },
  { id: 'walk', emoji: '🚶' },
  { id: 'dance', emoji: '💃' },
  { id: 'angry', emoji: '😡' },
] as const;

export type ActionId = (typeof ACTIONS)[number]['id'];

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
  slots: { x: 16, y: 10, width: 72, height: 80, gap: 12 },
  slotColor: 0x9e9e9e,
  slotRadius: 10,
  selected: { color: 0xffd54f, width: 5 },
  /** People in the menu are drawn this much smaller. */
  personScale: 0.56,
  /** How far above the slot's bottom edge the feet stand. */
  feetInset: 7,
  /** The button that takes everybody away. */
  clear: { x: GAME_WIDTH - 88, y: 10, width: 72, height: 80, gap: 0 },
  clearColor: 0xc62828,
  clearEmoji: '🗑️',
  clearFontSize: '34px',
  /** Drawn above the people in the area. */
  depth: 100,
} as const;
