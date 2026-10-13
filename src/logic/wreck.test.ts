import { describe, expect, it } from 'vitest';
import { wreckParts } from './wreck';

const box = { left: 100, right: 220, top: 400, bottom: 460 };
const burst = {
  roll: { min: 120, max: 300 },
  hop: { min: 100, max: 260 },
  fling: 300,
  lift: { min: 200, max: 420 },
  spin: 8,
};
const car = { wheels: 2, wheelRadius: 13, panels: 3, panel: { long: 30, wide: 16 } };

describe('wreckParts', () => {
  it('gives every wheel, panel and blade it is told to', () => {
    const parts = wreckParts(car, box, 0, burst);
    expect(parts.filter((part) => part.kind === 'wheel')).toHaveLength(2);
    expect(parts.filter((part) => part.kind === 'panel')).toHaveLength(3);
    const chopper = { ...car, wheels: 0, blades: 2, blade: { long: 60, wide: 4 } };
    expect(wreckParts(chopper, box, 0, burst).filter((part) => part.kind === 'blade')).toHaveLength(
      2,
    );
  });

  it('lets the wheels roll away to both sides, turning as fast as they roll', () => {
    const wheels = wreckParts(car, box, 0, burst).filter((part) => part.kind === 'wheel');
    expect(wheels[0]?.crumb.vx).toBeLessThan(0);
    expect(wheels[1]?.crumb.vx).toBeGreaterThan(0);
    for (const { crumb } of wheels) {
      expect(Math.abs(crumb.vx)).toBeGreaterThanOrEqual(120);
      expect(crumb.spin).toBeCloseTo(crumb.vx / 13);
    }
  });

  it('starts the wheels along the bottom of the vehicle, and the rest inside it', () => {
    for (const { kind, crumb } of wreckParts(car, box, 0, burst)) {
      expect(crumb.x).toBeGreaterThanOrEqual(box.left);
      expect(crumb.x).toBeLessThanOrEqual(box.right);
      if (kind === 'wheel') expect(crumb.y).toBe(box.bottom - 13);
      else expect(crumb.y).toBeLessThan(box.bottom);
    }
  });

  it('throws everything upward', () => {
    for (const { crumb } of wreckParts(car, box, 0, burst)) expect(crumb.vy).toBeLessThan(0);
  });

  it('carries the parts along with the push of what wrecked it', () => {
    const still = wreckParts(car, box, 0, burst, () => 0.5);
    const pushed = wreckParts(car, box, 500, burst, () => 0.5);
    pushed.forEach((part, index) => {
      expect(part.crumb.vx).toBeGreaterThan(still[index]?.crumb.vx ?? 0);
    });
  });

  it('gives nothing for a thing with no parts', () => {
    const none = { wheels: 0, wheelRadius: 0, panels: 0, panel: { long: 0, wide: 0 } };
    expect(wreckParts(none, box, 0, burst)).toEqual([]);
  });
});
