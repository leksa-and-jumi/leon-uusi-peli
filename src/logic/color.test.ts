import { describe, expect, it } from 'vitest';
import { shade } from './color';

describe('shade', () => {
  it('keeps the color when the amount is zero', () => {
    expect(shade(0x336699, 0)).toBe(0x336699);
  });

  it('goes all the way to black or white', () => {
    expect(shade(0x336699, -1)).toBe(0x000000);
    expect(shade(0x336699, 1)).toBe(0xffffff);
    expect(shade(0x336699, -5)).toBe(0x000000);
  });

  it('darkens and lightens every channel part of the way', () => {
    expect(shade(0x804020, -0.5)).toBe(0x402010);
    expect(shade(0x000000, 0.5)).toBe(0x808080);
  });
});
