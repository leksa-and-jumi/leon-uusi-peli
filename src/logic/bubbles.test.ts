import { describe, expect, it } from 'vitest';
import { bubbleAt, bubbleCenters } from './bubbles';

const row = { radius: 20, gap: 10, above: 10 };

describe('bubbleCenters', () => {
  it('centers the row above the head', () => {
    expect(bubbleCenters(3, 400, 300, row, 0, 800, 0)).toEqual([
      { x: 350, y: 270 },
      { x: 400, y: 270 },
      { x: 450, y: 270 },
    ]);
  });

  it('slides the row in from the left and right edges', () => {
    expect(bubbleCenters(3, 10, 300, row, 0, 800, 0).map((c) => c.x)).toEqual([20, 70, 120]);
    expect(bubbleCenters(3, 795, 300, row, 0, 800, 0).map((c) => c.x)).toEqual([680, 730, 780]);
  });

  it('stays below the top of the area', () => {
    expect(bubbleCenters(1, 400, 110, row, 0, 800, 100)[0]).toEqual({ x: 400, y: 120 });
  });
});

describe('bubbleAt', () => {
  const centers = bubbleCenters(3, 400, 300, row, 0, 800, 0);

  it('finds the bubble under the point', () => {
    expect(bubbleAt(centers, row.radius, 352, 275)).toBe(0);
    expect(bubbleAt(centers, row.radius, 450, 289)).toBe(2);
  });

  it('finds nothing between or outside the bubbles', () => {
    expect(bubbleAt(centers, row.radius, 375, 270)).toBeNull();
    expect(bubbleAt(centers, row.radius, 400, 320)).toBeNull();
  });
});
