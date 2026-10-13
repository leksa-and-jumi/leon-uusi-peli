import { describe, expect, it } from 'vitest';
import { pickDrop } from './drops';

/** A stand-in for `Math.random` that gives these numbers, one after the other. */
const rolls = (...numbers: number[]): (() => number) => {
  let next = 0;
  return () => numbers[next++ % numbers.length] ?? 0;
};

describe('pickDrop', () => {
  const groups = [
    { share: 3, things: ['sword', 'bat'] },
    { share: 1, things: ['orb'] },
  ];

  it('picks a group by its share, and then a thing of that group', () => {
    expect(pickDrop(groups, rolls(0, 0))).toBe('sword');
    expect(pickDrop(groups, rolls(0.5, 0.6))).toBe('bat');
    expect(pickDrop(groups, rolls(0.8, 0))).toBe('orb');
  });

  it('never picks from a group with nothing in it, or with no share', () => {
    const some = [
      { share: 5, things: [] as string[] },
      { share: 0, things: ['never'] },
      { share: 1, things: ['only'] },
    ];
    for (const roll of [0, 0.3, 0.7, 0.999]) {
      expect(pickDrop(some, rolls(roll, roll))).toBe('only');
    }
  });

  it('gives nothing when there is nothing to pick from', () => {
    expect(pickDrop([], rolls(0.5))).toBeNull();
    expect(pickDrop([{ share: 2, things: [] }], rolls(0.5))).toBeNull();
  });

  it('copes with the very top of the range', () => {
    expect(pickDrop(groups, rolls(0.999999, 0.999999))).toBe('orb');
  });

  it('gives every group its share over many picks', () => {
    let seed = 7;
    const random = (): number => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    let orbs = 0;
    for (let i = 0; i < 4000; i++) if (pickDrop(groups, random) === 'orb') orbs++;
    expect(orbs / 4000).toBeGreaterThan(0.2);
    expect(orbs / 4000).toBeLessThan(0.3);
  });
});
