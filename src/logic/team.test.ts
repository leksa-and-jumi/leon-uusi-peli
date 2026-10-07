import { describe, expect, it } from 'vitest';
import { sameTeam } from './team';

describe('sameTeam', () => {
  it('puts dolls of the same color on the same side', () => {
    expect(sameTeam({ body: 0xff0000 }, { body: 0xff0000 })).toBe(true);
  });

  it('puts dolls of different colors on different sides', () => {
    expect(sameTeam({ body: 0xff0000 }, { body: 0x00ff00 })).toBe(false);
  });
});
