import { describe, expect, it } from 'vitest';
import { cleanerDue, heartsFor, NEW_MATCH, nextMatch, roundWon, unlockNext } from './match';

describe('roundWon', () => {
  it('gives the winner a point and remembers who won last', () => {
    const { match, won } = roundWon(NEW_MATCH, 1, 5);
    expect(match).toEqual({ score: [0, 1], last: 1 });
    expect(won).toBe(false);
  });

  it('counts each player on its own', () => {
    let match = NEW_MATCH;
    match = roundWon(match, 0, 5).match;
    match = roundWon(match, 1, 5).match;
    match = roundWon(match, 0, 5).match;
    expect(match).toEqual({ score: [2, 1], last: 0 });
  });

  it('says when a player has won the whole match', () => {
    const before = { score: [4, 3] as const, last: 1 as const };
    expect(roundWon(before, 1, 5).won).toBe(false);
    const { match, won } = roundWon(before, 0, 5);
    expect(won).toBe(true);
    expect(match.score).toEqual([5, 3]);
  });
});

describe('nextMatch', () => {
  it('starts from nothing, but keeps who won last', () => {
    expect(nextMatch({ score: [5, 2], last: 0 })).toEqual({ score: [0, 0], last: 0 });
  });
});

describe('cleanerDue', () => {
  it('is time after every fifth round', () => {
    expect(cleanerDue(5, 5, 0)).toBe(true);
    expect(cleanerDue(10, 5, 5)).toBe(true);
  });

  it('is not time in between, or before the first round', () => {
    expect(cleanerDue(0, 5, 0)).toBe(false);
    expect(cleanerDue(4, 5, 0)).toBe(false);
    expect(cleanerDue(6, 5, 5)).toBe(false);
  });

  it('is not time twice for the same round', () => {
    expect(cleanerDue(5, 5, 5)).toBe(false);
  });
});

describe('heartsFor', () => {
  it('shows a heart for every life', () => {
    expect(heartsFor(3, '♥', 6)).toBe('♥♥♥');
    expect(heartsFor(1, '♥', 6)).toBe('♥');
  });

  it('shows one heart and the number when there are too many', () => {
    expect(heartsFor(8, '♥', 6)).toBe('♥×8');
  });

  it('shows nothing when no life is left', () => {
    expect(heartsFor(0, '♥', 6)).toBe('');
    expect(heartsFor(-2, '♥', 6)).toBe('');
  });
});

describe('unlockNext', () => {
  it('unlocks one more', () => {
    expect(unlockNext(0, 5)).toBe(1);
    expect(unlockNext(3, 5)).toBe(4);
  });

  it('stops when everything is unlocked', () => {
    expect(unlockNext(5, 5)).toBe(5);
    expect(unlockNext(9, 5)).toBe(5);
  });

  it('makes sense of a number that is no good', () => {
    expect(unlockNext(-3, 5)).toBe(1);
    expect(unlockNext(1.7, 5)).toBe(2);
  });
});
