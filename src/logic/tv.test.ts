import { describe, expect, it } from 'vitest';
import { pingPong, tvMoment } from './tv';

describe('tvMoment', () => {
  it('plays the programs one after the other and starts over', () => {
    expect(tvMoment(500, 3, 1000, 100).channel).toBe(0);
    expect(tvMoment(1500, 3, 1000, 100).channel).toBe(1);
    expect(tvMoment(2500, 3, 1000, 100).channel).toBe(2);
    expect(tvMoment(3500, 3, 1000, 100).channel).toBe(0);
  });

  it('shows snow right after switching', () => {
    expect(tvMoment(1050, 3, 1000, 100).snow).toBe(true);
    expect(tvMoment(1150, 3, 1000, 100).snow).toBe(false);
  });

  it('counts how long the program has been on', () => {
    expect(tvMoment(2300, 3, 1000, 100).sinceMs).toBe(300);
  });
});

describe('pingPong', () => {
  it('goes there and back again', () => {
    expect(pingPong(0, 10)).toBe(0);
    expect(pingPong(4, 10)).toBe(4);
    expect(pingPong(10, 10)).toBe(10);
    expect(pingPong(14, 10)).toBe(6);
    expect(pingPong(20, 10)).toBe(0);
    expect(pingPong(23, 10)).toBe(3);
  });

  it('stays at zero when there is nowhere to go', () => {
    expect(pingPong(5, 0)).toBe(0);
  });
});
