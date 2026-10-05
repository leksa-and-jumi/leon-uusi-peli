/**
 * How a person holds their arms and legs. Angles are in radians: 0 hangs straight
 * down, a negative angle swings forward (the way the person faces). "Front" is the
 * arm and leg on the side the person faces.
 */
export interface Pose {
  frontArm: number;
  backArm: number;
  frontLeg: number;
  backLeg: number;
  /** How many pixels the whole person hops up. */
  lift: number;
  /** How much the whole person leans, in radians. */
  lean: number;
}

export type PoseKind = 'stand' | 'walk' | 'run' | 'dance' | 'held' | 'punch';

export const STAND: Pose = { frontArm: 0, backArm: 0, frontLeg: 0, backLeg: 0, lift: 0, lean: 0 };

/** How big the moves are. Tweak these to change how people move. */
export const MOVES = {
  walk: { stepMs: 520, leg: 0.5, arm: 0.4 },
  run: { stepMs: 300, leg: 0.75, arm: 0.9 },
  dance: { beatMs: 460, armsUp: 2.5, wave: 0.45, leg: 0.3, hop: 16, lean: 0.14 },
  held: { armsUp: 2.9, swingMs: 900, leg: 0.18 },
  punch: { arm: -Math.PI / 2, backArm: 0.5, lean: 0.12 },
} as const;

/** The pose at a moment in time. `timeMs` keeps counting, so moves repeat smoothly. */
export function poseFor(kind: PoseKind, timeMs: number): Pose {
  switch (kind) {
    case 'stand':
      return STAND;
    case 'walk':
    case 'run': {
      const move = MOVES[kind];
      const swing = Math.sin((timeMs / move.stepMs) * Math.PI * 2);
      return {
        frontArm: move.arm * swing,
        backArm: -move.arm * swing,
        frontLeg: -move.leg * swing,
        backLeg: move.leg * swing,
        lift: 0,
        lean: 0,
      };
    }
    case 'dance': {
      const move = MOVES.dance;
      const beat = Math.sin((timeMs / move.beatMs) * Math.PI);
      const sway = Math.sin((timeMs / move.beatMs) * Math.PI * 0.5);
      return {
        frontArm: -move.armsUp + move.wave * sway,
        backArm: move.armsUp + move.wave * sway,
        frontLeg: -move.leg * sway,
        backLeg: move.leg * sway,
        lift: move.hop * Math.abs(beat),
        lean: move.lean * sway,
      };
    }
    case 'held': {
      const move = MOVES.held;
      const swing = Math.sin((timeMs / move.swingMs) * Math.PI * 2);
      return {
        frontArm: -move.armsUp,
        backArm: move.armsUp,
        frontLeg: move.leg * swing,
        backLeg: -move.leg * swing,
        lift: 0,
        lean: 0,
      };
    }
    case 'punch':
      return {
        frontArm: MOVES.punch.arm,
        backArm: MOVES.punch.backArm,
        frontLeg: -0.25,
        backLeg: 0.25,
        lift: 0,
        lean: MOVES.punch.lean,
      };
  }
}
