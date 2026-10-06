import { describe, expect, it } from 'vitest';
import { boxAt, isDoubleClick } from './pick';

const first = { left: 80, right: 120, top: 380, bottom: 500 };
const second = { left: 280, right: 320, top: 380, bottom: 500 };

describe('boxAt', () => {
  it('finds the box under the point', () => {
    expect(boxAt([first, second], 110, 450)).toBe(0);
    expect(boxAt([first, second], 300, 381)).toBe(1);
  });

  it('finds nothing beside, above or below a box', () => {
    expect(boxAt([first], 130, 450)).toBeNull();
    expect(boxAt([first], 100, 370)).toBeNull();
    expect(boxAt([first], 100, 510)).toBeNull();
  });

  it('picks the one on top when two overlap', () => {
    const over = { left: 90, right: 130, top: 380, bottom: 500 };
    expect(boxAt([first, over], 105, 450)).toBe(1);
  });
});

describe('isDoubleClick', () => {
  const who = {};

  it('needs two quick clicks on the same thing', () => {
    expect(isDoubleClick({ timeMs: 1000, target: who }, { timeMs: 1200, target: who }, 350)).toBe(
      true,
    );
  });

  it('is not a double-click when too slow', () => {
    expect(isDoubleClick({ timeMs: 1000, target: who }, { timeMs: 1500, target: who }, 350)).toBe(
      false,
    );
  });

  it('is not a double-click on two different things', () => {
    expect(isDoubleClick({ timeMs: 1000, target: who }, { timeMs: 1100, target: {} }, 350)).toBe(
      false,
    );
  });

  it('is not a double-click without a first click', () => {
    expect(isDoubleClick(null, { timeMs: 1100, target: who }, 350)).toBe(false);
  });
});
