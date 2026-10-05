import { describe, expect, it } from 'vitest';
import { isDoubleClick, personAt } from './pick';

const size = { height: 120, halfWidth: 20 };

describe('personAt', () => {
  it('finds the person under the point', () => {
    const feet = [
      { x: 100, y: 500 },
      { x: 300, y: 500 },
    ];
    expect(personAt(feet, 110, 450, size)).toBe(0);
    expect(personAt(feet, 300, 381, size)).toBe(1);
  });

  it('finds nobody beside, above or below a person', () => {
    const feet = [{ x: 100, y: 500 }];
    expect(personAt(feet, 130, 450, size)).toBeNull();
    expect(personAt(feet, 100, 370, size)).toBeNull();
    expect(personAt(feet, 100, 510, size)).toBeNull();
  });

  it('picks the one on top when two overlap', () => {
    const feet = [
      { x: 100, y: 500 },
      { x: 110, y: 500 },
    ];
    expect(personAt(feet, 105, 450, size)).toBe(1);
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
