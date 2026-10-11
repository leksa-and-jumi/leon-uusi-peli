import { describe, expect, it } from 'vitest';
import { pingPong, stickFight, tvMoment } from './tv';

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

describe('stickFight', () => {
  it('starts with the two far apart and nobody shooting', () => {
    const start = stickFight(0, 2000);
    expect(start.heroX).toBeCloseTo(0.1);
    expect(start.enemyX).toBeCloseTo(0.95);
    expect(start.shooting).toBe(false);
    expect(start.fallen).toBe(0);
  });

  it('lets them walk toward each other', () => {
    const later = stickFight(600, 2000);
    expect(later.heroX).toBeGreaterThan(0.1);
    expect(later.enemyX).toBeLessThan(0.95);
    expect(later.enemyX).toBeGreaterThan(later.heroX);
  });

  it('has the hero stop and shoot, and the white one fall over', () => {
    const shot = stickFight(1100, 2000);
    expect(shot.shooting).toBe(true);
    expect(shot.fallen).toBeGreaterThan(0);
    const after = stickFight(1700, 2000);
    expect(after.shooting).toBe(false);
    expect(after.fallen).toBe(1);
  });

  it('starts over with every round', () => {
    expect(stickFight(2000, 2000)).toEqual(stickFight(0, 2000));
    expect(stickFight(2600, 2000)).toEqual(stickFight(600, 2000));
  });
});
