import { describe, expect, it } from 'vitest';
import { blastDirection, inBlast } from './blast';

describe('inBlast', () => {
  const box = { left: 100, right: 140, top: 380, bottom: 500 };

  it('catches a box whose middle is close enough', () => {
    expect(inBlast(200, 440, box, 100)).toBe(true);
  });

  it('misses a box that is too far', () => {
    expect(inBlast(300, 440, box, 100)).toBe(false);
    expect(inBlast(120, 200, box, 100)).toBe(false);
  });
});

describe('blastDirection', () => {
  it('throws things away from the blast', () => {
    expect(blastDirection(200, 150)).toBe(-1);
    expect(blastDirection(200, 250)).toBe(1);
  });

  it('throws right when exactly on the blast', () => {
    expect(blastDirection(200, 200)).toBe(1);
  });
});
