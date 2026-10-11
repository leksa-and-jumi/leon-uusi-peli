/** What the TV shows at a moment in time. */
export interface TvMoment {
  /** Which program is on, counting from 0. */
  channel: number;
  /** How long this program has been on. */
  sinceMs: number;
  /** Just switched: the screen shows snow for a blink. */
  snow: boolean;
}

/**
 * The TV plays its programs one after the other, each for `channelMs`, and shows
 * snow for `snowMs` every time it switches.
 */
export function tvMoment(
  timeMs: number,
  channels: number,
  channelMs: number,
  snowMs: number,
): TvMoment {
  const time = Math.max(0, timeMs);
  const sinceMs = time % channelMs;
  return {
    channel: Math.floor(time / channelMs) % channels,
    sinceMs,
    snow: sinceMs < snowMs,
  };
}

/** Back and forth between 0 and `span`: 0 at the start, `span` half way, 0 again, and so on. */
export function pingPong(distance: number, span: number): number {
  if (span <= 0) return 0;
  const there = Math.abs(distance) % (span * 2);
  return there <= span ? there : span * 2 - there;
}

/** A moment of the stick fight on TV. Places are shares of the screen's width, 0 to 1. */
export interface StickFight {
  /** Where the hero is, and where the white stick figure is. */
  heroX: number;
  enemyX: number;
  /** The hero is firing right now: the muzzle flashes and the bullet is on its way. */
  shooting: boolean;
  /** How far the white one has fallen over: 0 standing, 1 flat on the ground. */
  fallen: number;
  /** How far along the step both are, 0 to 1, while they walk. */
  stride: number;
}

/**
 * The stick fight, `sinceMs` into the program. It goes in rounds of `roundMs`: the
 * hero walks in from the left while a white stick figure comes from the right, the
 * hero stops and shoots, the white one falls over, and it starts again.
 */
export function stickFight(sinceMs: number, roundMs: number): StickFight {
  const part = (Math.max(0, sinceMs) % roundMs) / roundMs;
  const walking = Math.min(1, part / STICK_FIGHT.walk);
  const shooting = part >= STICK_FIGHT.walk && part < STICK_FIGHT.shot;
  const fallen = part < STICK_FIGHT.walk ? 0 : Math.min(1, (part - STICK_FIGHT.walk) / 0.2);
  return {
    heroX: 0.1 + 0.25 * walking,
    enemyX: 0.95 - 0.25 * walking,
    shooting,
    fallen,
    stride: part < STICK_FIGHT.walk ? (part * 8) % 1 : 0,
  };
}

/** The parts of a round, as shares of it: walking ends at `walk`, and the shot is over at `shot`. */
const STICK_FIGHT = { walk: 0.5, shot: 0.62 };
