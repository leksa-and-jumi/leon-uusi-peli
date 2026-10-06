/**
 * How a doll holds its arms and legs. Angles are in radians: 0 hangs straight
 * down, a negative angle swings forward (the way the doll faces). "Front" is the
 * arm and leg on the side the doll faces. Elbows and knees are how much the lower
 * half bends from the upper half: elbows bend forward (negative), knees back (positive).
 */
export interface Pose {
  frontArm: number;
  backArm: number;
  frontLeg: number;
  backLeg: number;
  frontElbow: number;
  backElbow: number;
  frontKnee: number;
  backKnee: number;
  /** How much the upper body bends at the waist: positive bends forward. */
  waist: number;
  /** How much the head tips: positive nods forward. */
  head: number;
  /** How many pixels the whole doll hops up. */
  lift: number;
  /** How much the whole doll leans, in radians. */
  lean: number;
}

export type PoseKind = 'stand' | 'walk' | 'run' | 'dance' | 'held' | 'punch';

export const STAND: Pose = {
  frontArm: 0,
  backArm: 0,
  frontLeg: 0,
  backLeg: 0,
  frontElbow: -0.15,
  backElbow: -0.15,
  frontKnee: 0,
  backKnee: 0,
  waist: 0,
  head: 0,
  lift: 0,
  lean: 0,
};

/** How big the moves are. Tweak these to change how dolls move. */
export const MOVES = {
  walk: { stepMs: 520, leg: 0.5, arm: 0.4, elbow: -0.5, knee: 0.7 },
  run: { stepMs: 300, leg: 0.75, arm: 0.9, elbow: -1.3, knee: 1.2 },
  dance: {
    beatMs: 460,
    armsUp: 2.5,
    wave: 0.45,
    elbow: -0.7,
    leg: 0.3,
    knee: 0.5,
    hop: 16,
    lean: 0.14,
    waist: 0.2,
  },
  held: { armsUp: 2.9, swingMs: 900, leg: 0.18, elbow: -0.2, knee: 0.35 },
  punch: { arm: -Math.PI / 2, backArm: 0.5, backElbow: -1.5, lean: 0.12 },
  /** A limp doll: how far each joint can flop, at most. */
  limp: { arm: 2.2, leg: 0.7, elbow: 1.4, knee: 1.3, waist: 0.55, head: 0.6 },
} as const;

/** The pose at a moment in time. `timeMs` keeps counting, so moves repeat smoothly. */
export function poseFor(kind: PoseKind, timeMs: number): Pose {
  switch (kind) {
    case 'stand':
      return STAND;
    case 'walk':
    case 'run': {
      const move = MOVES[kind];
      const phase = (timeMs / move.stepMs) * Math.PI * 2;
      const swing = Math.sin(phase);
      const lifting = Math.cos(phase);
      return {
        frontArm: move.arm * swing,
        backArm: -move.arm * swing,
        frontLeg: -move.leg * swing,
        backLeg: move.leg * swing,
        frontElbow: move.elbow,
        backElbow: move.elbow,
        // The leg that is on its way forward bends at the knee
        frontKnee: move.knee * Math.max(0, lifting),
        backKnee: move.knee * Math.max(0, -lifting),
        waist: 0,
        head: 0,
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
        frontElbow: move.elbow * (1 + sway) * 0.5,
        backElbow: -move.elbow * (1 - sway) * 0.5,
        frontKnee: move.knee * Math.max(0, sway),
        backKnee: move.knee * Math.max(0, -sway),
        waist: move.waist * sway,
        head: -move.waist * sway,
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
        frontElbow: move.elbow,
        backElbow: -move.elbow,
        frontKnee: move.knee,
        backKnee: move.knee,
        waist: 0,
        head: 0,
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
        frontElbow: 0,
        backElbow: MOVES.punch.backElbow,
        frontKnee: 0.2,
        backKnee: 0,
        waist: 0,
        head: 0,
        lift: 0,
        lean: MOVES.punch.lean,
      };
  }
}

/**
 * A limp pose for a doll that has no lives left: every joint flops somewhere at
 * random. `random` gives numbers from 0 to 1, like `Math.random`.
 */
export function limpPose(random: () => number = Math.random): Pose {
  const flop = (most: number): number => (random() * 2 - 1) * most;
  const { arm, leg, elbow, knee, waist, head } = MOVES.limp;
  return {
    frontArm: flop(arm),
    backArm: flop(arm),
    frontLeg: flop(leg),
    backLeg: flop(leg),
    frontElbow: -random() * elbow,
    backElbow: -random() * elbow,
    frontKnee: random() * knee,
    backKnee: random() * knee,
    waist: flop(waist),
    head: flop(head),
    lift: 0,
    lean: 0,
  };
}

const ANGLES = [
  'frontArm',
  'backArm',
  'frontLeg',
  'backLeg',
  'frontElbow',
  'backElbow',
  'frontKnee',
  'backKnee',
  'waist',
  'head',
  'lift',
  'lean',
] as const satisfies readonly (keyof Pose)[];

/** A pose part of the way from one pose to another: 0 is `from`, 1 is `to`. */
export function blendPose(from: Pose, to: Pose, amount: number): Pose {
  const t = Math.min(Math.max(amount, 0), 1);
  const pose = { ...from };
  for (const key of ANGLES) {
    pose[key] = from[key] + (to[key] - from[key]) * t;
  }
  return pose;
}

/**
 * Shake a pose a little: arms, legs and head swing by `amount` radians, each its own
 * way. Used for the wobble of a limp doll that has just hit the floor.
 */
export function shakePose(pose: Pose, amount: number): Pose {
  return {
    ...pose,
    frontArm: pose.frontArm + amount,
    backArm: pose.backArm - amount,
    frontLeg: pose.frontLeg - amount * 0.5,
    backLeg: pose.backLeg + amount * 0.5,
    head: pose.head + amount * 0.6,
  };
}
