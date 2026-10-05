import { describe, expect, it } from 'vitest';
import { slotAt, slotRect } from './menu';

const row = { x: 10, y: 5, width: 50, height: 60, gap: 10 };

describe('slotRect', () => {
  it('puts the slots side by side with a gap', () => {
    expect(slotRect(row, 0)).toEqual({ x: 10, y: 5, width: 50, height: 60 });
    expect(slotRect(row, 2)).toEqual({ x: 130, y: 5, width: 50, height: 60 });
  });
});

describe('slotAt', () => {
  it('finds the slot under the point', () => {
    expect(slotAt(row, 3, 10, 5)).toBe(0);
    expect(slotAt(row, 3, 75, 30)).toBe(1);
    expect(slotAt(row, 3, 179, 64)).toBe(2);
  });

  it('finds nothing in the gaps or outside the row', () => {
    expect(slotAt(row, 3, 65, 30)).toBeNull();
    expect(slotAt(row, 3, 30, 70)).toBeNull();
    expect(slotAt(row, 3, 5, 30)).toBeNull();
  });

  it('ignores slots that are not there', () => {
    expect(slotAt(row, 2, 150, 30)).toBeNull();
  });
});
