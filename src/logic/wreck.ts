import type { Crumb } from './debris';
import type { Box } from './ground';

/** What a vehicle falls apart into when it is wrecked, besides the small pieces. */
export interface WreckSpec {
  /** Its wheels, which roll away: how many, and how big. */
  wheels: number;
  wheelRadius: number;
  /** The big sheets of its body that fly off: doors, a hood, wings. How many, and how big. */
  panels: number;
  panel: { long: number; wide: number };
  /** Long thin blades: a helicopter's rotor. */
  blades?: number;
  blade?: { long: number; wide: number };
}

/** How the parts of a wreck fly: how fast to the sides and upward, and how fast panels and blades spin. */
export interface WreckBurst {
  roll: { min: number; max: number };
  hop: { min: number; max: number };
  fling: number;
  lift: { min: number; max: number };
  spin: number;
}

/** A part of a wreck on its way: what it is, how big, and how it flies. */
export interface WreckPart {
  kind: 'wheel' | 'panel' | 'blade';
  long: number;
  wide: number;
  crumb: Crumb;
}

/**
 * The parts a wrecked vehicle falls apart into. Its wheels drop off along its bottom
 * and roll away, by turns to the left and to the right, turning as fast as they roll.
 * Its panels and blades are flung off from its middle, spinning. `pushX` is the push
 * everything gets from what wrecked it. `random` gives numbers from 0 up to 1.
 */
export function wreckParts(
  spec: WreckSpec,
  box: Box,
  pushX: number,
  burst: WreckBurst,
  random: () => number = Math.random,
): WreckPart[] {
  const between = (range: { min: number; max: number }): number =>
    range.min + random() * (range.max - range.min);
  const width = box.right - box.left;
  const parts: WreckPart[] = [];
  for (let wheel = 0; wheel < spec.wheels; wheel++) {
    const radius = spec.wheelRadius;
    const side = wheel % 2 === 0 ? -1 : 1;
    const vx = pushX * 0.4 + side * between(burst.roll);
    parts.push({
      kind: 'wheel',
      long: radius * 2,
      wide: radius * 2,
      crumb: {
        x: box.left + (width * (wheel + 0.5)) / spec.wheels,
        y: box.bottom - radius,
        vx,
        vy: -between(burst.hop),
        size: radius,
        turn: 0,
        // A wheel that rolls turns as fast as it goes
        spin: vx / radius,
        ageMs: 0,
      },
    });
  }
  const flung = (kind: 'panel' | 'blade', size: { long: number; wide: number }): WreckPart => ({
    kind,
    long: size.long,
    wide: size.wide,
    crumb: {
      x: box.left + width * (0.2 + random() * 0.6),
      y: box.top + (box.bottom - box.top) * (0.2 + random() * 0.5),
      vx: pushX * 0.6 + (random() * 2 - 1) * burst.fling,
      vy: -between(burst.lift),
      size: size.wide,
      turn: random() * Math.PI,
      spin: (random() * 2 - 1) * burst.spin,
      ageMs: 0,
    },
  });
  for (let panel = 0; panel < spec.panels; panel++) parts.push(flung('panel', spec.panel));
  const blade = spec.blade;
  if (blade) for (let one = 0; one < (spec.blades ?? 0); one++) parts.push(flung('blade', blade));
  return parts;
}
