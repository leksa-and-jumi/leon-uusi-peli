import { describe, expect, it } from 'vitest';
import { placeFeet } from './place';

const area = { left: 0, right: 800, top: 100, floorY: 500 };
const size = { height: 120, halfWidth: 20 };

describe('placeFeet', () => {
  it('puts the person around the click', () => {
    expect(placeFeet(400, 300, area, size)).toEqual({ x: 400, y: 360 });
  });

  it('keeps the person inside the left and right edges', () => {
    expect(placeFeet(3, 300, area, size).x).toBe(20);
    expect(placeFeet(799, 300, area, size).x).toBe(780);
  });

  it('never puts the feet below the floor', () => {
    expect(placeFeet(400, 590, area, size).y).toBe(500);
  });

  it('keeps the head below the top of the area', () => {
    expect(placeFeet(400, 105, area, size).y).toBe(220);
  });
});
