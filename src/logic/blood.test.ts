import { describe, expect, it } from 'vitest';
import { addDrop, wipe } from './blood';

const growth = { start: 4, grow: 2, most: 10, near: 6, max: 3 };
const red = 0xaa0000;
const green = 0x00aa00;

describe('addDrop', () => {
  it('starts a new stain on a clean floor', () => {
    expect(addDrop([], 100, red, growth)).toEqual([{ x: 100, halfWidth: 4, color: red }]);
  });

  it('widens a stain of the same color that is already there', () => {
    const stains = [{ x: 100, halfWidth: 4, color: red }];
    expect(addDrop(stains, 103, red, growth)).toEqual([{ x: 100, halfWidth: 6, color: red }]);
  });

  it('does not widen a stain past the most', () => {
    const stains = [{ x: 100, halfWidth: 9, color: red }];
    expect(addDrop(stains, 100, red, growth)[0]?.halfWidth).toBe(10);
  });

  it('starts a new stain beside one that is as wide as it gets', () => {
    const stains = [{ x: 100, halfWidth: 10, color: red }];
    expect(addDrop(stains, 100, red, growth)).toHaveLength(2);
  });

  it('keeps stains of different colors apart', () => {
    const stains = [{ x: 100, halfWidth: 4, color: red }];
    expect(addDrop(stains, 100, green, growth)).toHaveLength(2);
  });

  it('starts a new stain further away', () => {
    const stains = [{ x: 100, halfWidth: 4, color: red }];
    expect(addDrop(stains, 130, red, growth)).toHaveLength(2);
  });

  it('lets the oldest stain go when there are too many', () => {
    let stains = addDrop([], 100, red, growth);
    stains = addDrop(stains, 200, red, growth);
    stains = addDrop(stains, 300, red, growth);
    stains = addDrop(stains, 400, red, growth);
    expect(stains.map((stain) => stain.x)).toEqual([200, 300, 400]);
  });

  it('does not change the list it is given', () => {
    const stains = [{ x: 100, halfWidth: 4, color: red }];
    addDrop(stains, 100, red, growth);
    expect(stains).toEqual([{ x: 100, halfWidth: 4, color: red }]);
  });
});

describe('wipe', () => {
  const stains = [
    { x: 100, halfWidth: 5, color: red },
    { x: 200, halfWidth: 5, color: red },
    { x: 300, halfWidth: 5, color: green },
  ];

  it('takes away the stains under the broom', () => {
    expect(wipe(stains, 180, 240).map((stain) => stain.x)).toEqual([100, 300]);
  });

  it('also takes a stain that only reaches in from the side', () => {
    expect(wipe(stains, 104, 150).map((stain) => stain.x)).toEqual([200, 300]);
  });

  it('leaves everything when the broom is somewhere else', () => {
    expect(wipe(stains, 400, 500)).toEqual(stains);
  });
});
