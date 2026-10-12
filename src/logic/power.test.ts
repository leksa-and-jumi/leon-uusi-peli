import { describe, expect, it } from 'vitest';
import { turnStep } from './power';

describe('turnStep', () => {
  it('stays with the same one until its time is up', () => {
    expect(turnStep({ turn: 1, ms: 100 }, 50, 1000, 5)).toEqual({ turn: 1, ms: 150 });
  });

  it('goes on to the next one when the time is up, keeping what is left over', () => {
    expect(turnStep({ turn: 1, ms: 980 }, 50, 1000, 5)).toEqual({ turn: 2, ms: 30 });
  });

  it('goes from the last one back to the first', () => {
    expect(turnStep({ turn: 4, ms: 990 }, 20, 1000, 5)).toEqual({ turn: 0, ms: 10 });
  });

  it('gives every one a turn', () => {
    let now = { turn: 0, ms: 0 };
    const seen = new Set<number>();
    for (let i = 0; i < 40; i++) {
      now = turnStep(now, 100, 300, 4);
      seen.add(now.turn);
    }
    expect([...seen].sort()).toEqual([0, 1, 2, 3]);
  });

  it('is at the first one when there is nothing to take turns', () => {
    expect(turnStep({ turn: 3, ms: 5 }, 16, 1000, 0)).toEqual({ turn: 0, ms: 0 });
  });
});
