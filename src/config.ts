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
export const HINT_TEXT = '👆 Pick a person, then click! 🧍\n👆 Valitse ihminen ja klikkaa! 🧍';

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
  face: { eye: 0x1b1b1b, mouth: 0x7a2e2e },
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
  /** Drawn above the people in the area. */
  depth: 100,
} as const;
