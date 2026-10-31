import { describe, expect, it } from 'vitest';
import { Lockstep } from './lockstep';
import type { TurnInput } from './protocol';

const turnOf = (slot: number, turn: number, keys: number): TurnInput => ({
  slot,
  turn,
  frames: [
    { keys, events: [] },
    { keys: keys + 1, events: [] },
  ],
  check: null,
  resync: false,
});

describe('playing in step', () => {
  it('plays the first turns without waiting: nobody has said anything yet', () => {
    const step = new Lockstep(2, 2, 2);
    for (let frame = 0; frame < 4; frame++) {
      expect(step.ready).toBe(true);
      expect(step.inputs()).toEqual([
        { keys: 0, events: [] },
        { keys: 0, events: [] },
      ]);
      step.advance();
    }
    expect(step.turn).toBe(2);
    expect(step.ready).toBe(false);
  });

  it('waits for everybody, then plays their input frame by frame', () => {
    const step = new Lockstep(2, 2, 2);
    step.frame = 4;
    step.put(turnOf(0, 2, 10));
    expect(step.ready).toBe(false);
    step.put(turnOf(1, 2, 20));
    expect(step.ready).toBe(true);
    expect(step.inputs().map((input) => input.keys)).toEqual([10, 20]);
    expect(step.endsTurn).toBe(false);
    step.advance();
    expect(step.inputs().map((input) => input.keys)).toEqual([11, 21]);
    expect(step.endsTurn).toBe(true);
    expect(step.sendingTurn).toBe(4);
  });

  it('forgets input for turns that are already over', () => {
    const step = new Lockstep(2, 2, 2);
    step.frame = 6;
    step.put(turnOf(0, 2, 10));
    step.put(turnOf(1, 3, 10));
    step.put(turnOf(0, 3, 10));
    expect(step.ready).toBe(true);
    expect(step.turnInputs()).toHaveLength(2);
  });
});
