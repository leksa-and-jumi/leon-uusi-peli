import { describe, expect, it } from 'vitest';
import {
  cleanRoomCode,
  decodeTurn,
  encodeTurn,
  newRoomCode,
  quantize,
  ROOM,
  type TurnInput,
} from './protocol';

describe('a turn over the network', () => {
  const turn: TurnInput = {
    slot: 1,
    turn: 123456,
    resync: false,
    check: { frame: 600, hash: 0xdeadbeef },
    frames: [
      {
        keys: 5,
        events: [
          { kind: 'down', x: 512.25, y: 300.5, touch: true, choice: 'person:knight' },
          { kind: 'move', x: 520.125, y: 290 },
        ],
      },
      { keys: 0, events: [{ kind: 'up' }, { kind: 'command', command: 'crazy' }] },
      { keys: 31, events: [] },
    ],
  };

  it('comes out just as it went in', () => {
    expect(decodeTurn(encodeTurn(turn))).toEqual(turn);
  });

  it('is small', () => {
    const quiet: TurnInput = {
      slot: 0,
      turn: 9,
      resync: false,
      check: null,
      frames: [0, 0, 0].map(() => ({ keys: 0, events: [] })),
    };
    expect(encodeTurn(quiet).length).toBeLessThanOrEqual(22);
    expect(decodeTurn(encodeTurn(quiet))).toEqual(quiet);
  });

  it('turns down what is not a turn', () => {
    expect(decodeTurn(Uint8Array.from([1, 0]))).toBeNull();
    expect(decodeTurn(encodeTurn(turn).slice(0, 20))).toBeNull();
  });

  it('sends positions as whole eighths of a pixel', () => {
    expect(quantize(10.07)).toBe(10.125);
    const moved = decodeTurn(
      encodeTurn({ ...turn, frames: [{ keys: 0, events: [{ kind: 'move', x: 10.07, y: 3 }] }] }),
    );
    expect(moved?.frames[0]?.events[0]).toEqual({ kind: 'move', x: 10.125, y: 3 });
  });
});

describe('room codes', () => {
  it('are made of letters that are easy to tell apart', () => {
    const code = newRoomCode();
    expect(code).toHaveLength(ROOM.codeLength);
    expect([...code].every((letter) => ROOM.codeLetters.includes(letter))).toBe(true);
  });

  it('are cleaned up as typed in', () => {
    expect(cleanRoomCode(' k7 qx ')).toBe('K7QX');
    expect(cleanRoomCode('KOOX')).toBeNull();
    expect(cleanRoomCode('ABC')).toBeNull();
  });
});
