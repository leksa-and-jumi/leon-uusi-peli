/**
 * The messages of an online game, as small as they can be: bytes, not text. The
 * room on the server only passes the players' turns on to each other, so it never
 * has to look inside them.
 */

/** What kind of message it is: its first byte. */
export const MESSAGE = {
  /** To a player who has come in: the seat that is theirs. */
  welcome: 1,
  /** To everybody, once the room is full: start a new game together, with this seed. */
  start: 2,
  /** To the one left behind: the other player has gone. */
  left: 3,
  /** To a player who came too late: the room is full. */
  full: 4,
  /** A player's input for one turn, passed on as it is. */
  turn: 5,
} as const;

/** How the online game goes: two players, a turn every few frames, played a few turns late. */
export const ROOM = {
  players: 2,
  /** A turn is this many frames of the game, and a frame is this long. */
  turnFrames: 3,
  frameMs: 1000 / 60,
  /** What a player does is played this many turns later, so it has time to get to the others. */
  delayTurns: 2,
  /** Both players check every this many frames that their games are still the same. */
  hashEveryFrames: 60,
  /** A room code: this many of these letters (no 0/O or 1/I, which look alike). */
  codeLength: 4,
  codeLetters: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  /** Kept alive with a tiny text message this often, which the server answers without waking the room. */
  pingMs: 20000,
} as const;

/** The things one player can make happen in a frame, besides the keys. */
export type NetEvent =
  | { kind: 'down'; x: number; y: number; touch: boolean; choice: string }
  | { kind: 'move'; x: number; y: number }
  | { kind: 'up' }
  | { kind: 'command'; command: Command };

/** The buttons along the top that change the game for everybody. */
export type Command = 'clear' | 'duel' | 'horror' | 'crazy';
const COMMANDS: readonly Command[] = ['clear', 'duel', 'horror', 'crazy'];

/** One frame of one player: which keys are down (one bit each), and what else happened. */
export interface FrameInput {
  keys: number;
  events: NetEvent[];
}

/** One player's turn: its frames, a check of the game if one is due, and whether to start over. */
export interface TurnInput {
  slot: number;
  turn: number;
  frames: FrameInput[];
  /** The game as it was on frame `frame`, boiled down to one number, or `null`. */
  check: { frame: number; hash: number } | null;
  /** The games are no longer the same: both clear everything on this turn. */
  resync: boolean;
}

/** The keys a player can hold down: one bit each. */
export const KEY = { left: 1, right: 2, jump: 4, hit: 8, drop: 16 } as const;

const EVENT = { down: 1, move: 2, up: 3, command: 4 } as const;
/** Positions go as whole eighths of a pixel. */
const STEPS = 8;
const NO_CHECK = 0xffffffff;

/** A position as it goes over the network, and as both players then use it. */
export function quantize(value: number): number {
  return Math.round(value * STEPS) / STEPS;
}

export function encodeTurn(input: TurnInput): Uint8Array {
  const bytes: number[] = [];
  const u8 = (value: number): void => {
    bytes.push(value & 0xff);
  };
  const u16 = (value: number): void => {
    u8(value >> 8);
    u8(value);
  };
  const u32 = (value: number): void => {
    u16(value >>> 16);
    u16(value & 0xffff);
  };
  const spot = (x: number, y: number): void => {
    u16(Math.round(x * STEPS) & 0xffff);
    u16(Math.round(y * STEPS) & 0xffff);
  };
  u8(MESSAGE.turn);
  u8(input.slot);
  u32(input.turn);
  u8(input.resync ? 1 : 0);
  u32(input.check?.frame ?? NO_CHECK);
  u32(input.check?.hash ?? 0);
  u8(input.frames.length);
  for (const frame of input.frames) {
    u8(frame.keys);
    u8(frame.events.length);
    for (const event of frame.events) {
      u8(EVENT[event.kind]);
      if (event.kind === 'down') {
        spot(event.x, event.y);
        u8(event.touch ? 1 : 0);
        const text = new TextEncoder().encode(event.choice).slice(0, 255);
        u8(text.length);
        bytes.push(...text);
      } else if (event.kind === 'move') {
        spot(event.x, event.y);
      } else if (event.kind === 'command') {
        u8(COMMANDS.indexOf(event.command));
      }
    }
  }
  return Uint8Array.from(bytes);
}

/** Reads a turn, or `null` if the bytes aren't one. */
export function decodeTurn(data: Uint8Array): TurnInput | null {
  let at = 0;
  const u8 = (): number => {
    const value = data[at];
    if (value === undefined) throw new RangeError('short');
    at += 1;
    return value;
  };
  const u16 = (): number => (u8() << 8) | u8();
  const i16 = (): number => {
    const value = u16();
    return value >= 0x8000 ? value - 0x10000 : value;
  };
  const u32 = (): number => ((u16() << 16) | u16()) >>> 0;
  try {
    if (u8() !== MESSAGE.turn) return null;
    const slot = u8();
    const turn = u32();
    const resync = u8() === 1;
    const checkFrame = u32();
    const hash = u32();
    const check = checkFrame === NO_CHECK ? null : { frame: checkFrame, hash };
    const frames: FrameInput[] = [];
    const frameCount = u8();
    for (let f = 0; f < frameCount; f++) {
      const keys = u8();
      const events: NetEvent[] = [];
      const count = u8();
      for (let e = 0; e < count; e++) {
        const kind = u8();
        if (kind === EVENT.down) {
          const x = i16() / STEPS;
          const y = i16() / STEPS;
          const touch = u8() === 1;
          const length = u8();
          const choice = new TextDecoder().decode(data.slice(at, at + length));
          at += length;
          events.push({ kind: 'down', x, y, touch, choice });
        } else if (kind === EVENT.move) {
          const x = i16() / STEPS;
          const y = i16() / STEPS;
          events.push({ kind: 'move', x, y });
        } else if (kind === EVENT.up) {
          events.push({ kind: 'up' });
        } else if (kind === EVENT.command) {
          const command = COMMANDS[u8()];
          if (command) events.push({ kind: 'command', command });
        } else {
          return null;
        }
      }
      frames.push({ keys, events });
    }
    return { slot, turn, frames, check, resync };
  } catch {
    return null;
  }
}

/** A new room code: a few letters that are easy to read out and type. */
export function newRoomCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < ROOM.codeLength; i++) {
    code += ROOM.codeLetters[Math.floor(random() * ROOM.codeLetters.length)] ?? 'A';
  }
  return code;
}

/** A room code as typed in: upper case, without spaces. `null` if it can't be one. */
export function cleanRoomCode(typed: string): string | null {
  const code = typed.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== ROOM.codeLength) return null;
  return [...code].every((letter) => ROOM.codeLetters.includes(letter)) ? code : null;
}
