import { describe, expect, it } from 'vitest';
import { waveKinds, waveSize } from './waves';

const rules = { first: 2, everyWaves: 2, most: 6, kindsFirst: 3 };

describe('waveSize', () => {
  it('starts small and grows by one every few waves', () => {
    expect(waveSize(1, rules)).toBe(2);
    expect(waveSize(2, rules)).toBe(2);
    expect(waveSize(3, rules)).toBe(3);
    expect(waveSize(5, rules)).toBe(4);
  });

  it('never has more than the most', () => {
    expect(waveSize(40, rules)).toBe(6);
  });

  it('makes sense of a wave number that is no good', () => {
    expect(waveSize(0, rules)).toBe(2);
    expect(waveSize(-3, rules)).toBe(2);
  });
});

describe('waveKinds', () => {
  it('adds a kind of enemy with every wave', () => {
    expect(waveKinds(1, rules, 10)).toBe(3);
    expect(waveKinds(2, rules, 10)).toBe(4);
    expect(waveKinds(6, rules, 10)).toBe(8);
  });

  it('stops at all the kinds there are', () => {
    expect(waveKinds(30, rules, 10)).toBe(10);
    expect(waveKinds(1, rules, 2)).toBe(2);
  });
});
