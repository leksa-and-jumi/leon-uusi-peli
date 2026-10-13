import { describe, expect, it } from 'vitest';
import { steerFrom, takeSeat } from './duel';

describe('steerFrom', () => {
  it('goes the way of the key that is held down', () => {
    expect(steerFrom(true, false, false, false).x).toBe(-1);
    expect(steerFrom(false, true, false, false).x).toBe(1);
  });

  it('stays put with no key, or with both at once', () => {
    expect(steerFrom(false, false, false, false).x).toBe(0);
    expect(steerFrom(true, true, false, false).x).toBe(0);
  });

  it('passes on jumping and hitting', () => {
    expect(steerFrom(false, false, true, false)).toEqual({ x: 0, jump: true, hit: false });
    expect(steerFrom(false, true, false, true)).toEqual({ x: 1, jump: false, hit: true });
  });
});

describe('takeSeat', () => {
  it('sits down in the first free seat', () => {
    expect(takeSeat([null, null], 'a')).toEqual(['a', null]);
    expect(takeSeat(['a', null], 'b')).toEqual(['a', 'b']);
    expect(takeSeat([null, 'b'], 'a')).toEqual(['a', 'b']);
  });

  it('gets up again from the seat it has', () => {
    expect(takeSeat(['a', 'b'], 'a')).toEqual([null, 'b']);
    expect(takeSeat(['a', 'b'], 'b')).toEqual(['a', null]);
  });

  it('changes nothing when every seat is taken by somebody else', () => {
    expect(takeSeat(['a', 'b'], 'c')).toEqual(['a', 'b']);
  });
});
