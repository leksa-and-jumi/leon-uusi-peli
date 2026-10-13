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

export type PoseKind =
  | 'stand'
  | 'walk'
  | 'run'
  | 'swim'
  | 'dance'
  | 'held'
  | 'punch'
  | 'push'
  | 'sweep'
  | 'choke'
  | 'slam'
  | 'sit'
  | 'drive';

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

/** A pose with everything at zero. Also used for "no joint is turning". */
export const STILL: Pose = {
  frontArm: 0,
  backArm: 0,
  frontLeg: 0,
  backLeg: 0,
  frontElbow: 0,
  backElbow: 0,
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
  /**
   * Pushing something out with both hands: both arms stretched out in front, one a
   * little lower than the other, the feet wide apart, leaning into it. The arms
   * tremble a little with the effort.
   */
  push: {
    arm: -Math.PI / 2,
    lower: 0.16,
    leg: 0.32,
    knee: 0.3,
    waist: 0.1,
    lean: 0.1,
    tremble: 0.05,
    trembleMs: 110,
  },
  /**
   * Swimming: lying forward in the water, the arms reaching out in front and pulling
   * back in turn, the legs kicking.
   */
  swim: {
    strokeMs: 760,
    lean: 1.2,
    reach: -2.5,
    pull: 0.9,
    elbow: -0.35,
    kick: 0.4,
    knee: 0.35,
    head: -0.6,
  },
  /**
   * Sweeping with a broom: short, slow steps, the back bent, and the arm with the broom
   * going forward and back so that the broom brushes along the floor.
   */
  sweep: {
    stepMs: 900,
    leg: 0.24,
    knee: 0.35,
    arm: 0.12,
    stroke: 0.3,
    strokeMs: 620,
    elbow: -0.12,
    backArm: -0.55,
    backElbow: -0.7,
  },
  /** Breathing while standing: the chest rises and falls a little, and the arms with it. */
  breath: { ms: 3200, waist: 0.016, arms: 0.028, lift: 0.5 },
  /**
   * Choking on something foul: down on both knees, both hands at the throat, the
   * back and the head heaving forward and back with every cough.
   */
  choke: {
    leg: -0.22,
    backLeg: 0.12,
    knee: 1.75,
    backKnee: 1.55,
    drop: 26,
    arm: -0.62,
    backArm: -0.45,
    elbow: -2.25,
    waist: 0.28,
    head: 0.22,
    heave: 0.16,
    coughMs: 420,
  },
  /** Crouching to slam something into the floor: knees bent, back bent, the arm down in front. */
  slam: {
    leg: -0.7,
    knee: 1.4,
    arm: -0.75,
    elbow: -0.2,
    backArm: 0.45,
    waist: 0.55,
    head: 0.15,
    drop: 11,
  },
  /** Sitting on a motorbike: thighs out in front, shins down, hands on the handlebar. */
  sit: { leg: -1.4, knee: 1.35, arm: -0.95, elbow: -0.5, waist: 0.08 },
  /** Sitting inside a car: legs stretched out in front, hands on the wheel. */
  drive: { leg: -1.5, knee: 0.15, arm: -0.45, elbow: -1.5, waist: 0.05 },
  /** A limp doll: how far each joint can flop, at most. */
  limp: { arm: 2.9, leg: 1.2, elbow: 2.2, knee: 2, waist: 1, head: 1 },
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
    case 'swim': {
      const move = MOVES.swim;
      const stroke = Math.sin((timeMs / move.strokeMs) * Math.PI * 2);
      return {
        frontArm: move.reach + move.pull * stroke,
        backArm: move.reach - move.pull * stroke,
        frontLeg: move.kick * stroke,
        backLeg: -move.kick * stroke,
        frontElbow: move.elbow,
        backElbow: move.elbow,
        frontKnee: move.knee * Math.max(0, stroke),
        backKnee: move.knee * Math.max(0, -stroke),
        waist: 0,
        // It holds its head up, to see where it is going
        head: move.head,
        lift: 0,
        lean: move.lean,
      };
    }
    case 'sweep': {
      const move = MOVES.sweep;
      const phase = (timeMs / move.stepMs) * Math.PI * 2;
      const swing = Math.sin(phase);
      const lifting = Math.cos(phase);
      const stroke = Math.sin((timeMs / move.strokeMs) * Math.PI * 2) * move.stroke;
      return {
        frontArm: move.arm + stroke,
        backArm: move.backArm + stroke * 0.6,
        frontLeg: -move.leg * swing,
        backLeg: move.leg * swing,
        frontElbow: move.elbow,
        backElbow: move.backElbow,
        frontKnee: move.knee * Math.max(0, lifting),
        backKnee: move.knee * Math.max(0, -lifting),
        waist: 0,
        head: 0,
        lift: 0,
        lean: 0,
      };
    }
    case 'choke': {
      const move = MOVES.choke;
      const cough = Math.sin((timeMs / move.coughMs) * Math.PI * 2);
      return {
        frontArm: move.arm,
        backArm: move.backArm,
        frontLeg: move.leg,
        backLeg: move.backLeg,
        frontElbow: move.elbow,
        backElbow: move.elbow,
        frontKnee: move.knee,
        backKnee: move.backKnee,
        waist: move.waist + move.heave * cough,
        head: move.head + move.heave * cough,
        // On its knees the doll is that much lower
        lift: -move.drop,
        lean: 0,
      };
    }
    case 'slam': {
      const move = MOVES.slam;
      return {
        frontArm: move.arm,
        backArm: move.backArm,
        frontLeg: move.leg,
        backLeg: move.leg,
        frontElbow: move.elbow,
        backElbow: move.elbow,
        frontKnee: move.knee,
        backKnee: move.knee,
        waist: move.waist,
        head: move.head,
        // Bent legs are shorter: the whole doll comes down so its feet stay on the ground
        lift: -move.drop,
        lean: 0,
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
    case 'sit':
    case 'drive': {
      const move = MOVES[kind];
      return {
        frontArm: move.arm,
        backArm: move.arm,
        frontLeg: move.leg,
        backLeg: move.leg,
        frontElbow: move.elbow,
        backElbow: move.elbow,
        frontKnee: move.knee,
        backKnee: move.knee,
        waist: move.waist,
        head: 0,
        lift: 0,
        lean: 0,
      };
    }
    case 'push': {
      const move = MOVES.push;
      const tremble = Math.sin((timeMs / move.trembleMs) * Math.PI * 2) * move.tremble;
      return {
        frontArm: move.arm + tremble,
        backArm: move.arm + move.lower - tremble,
        frontLeg: -move.leg,
        backLeg: move.leg,
        frontElbow: 0,
        backElbow: 0,
        frontKnee: move.knee,
        backKnee: 0,
        waist: move.waist,
        head: 0,
        lift: 0,
        lean: move.lean,
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
 * A standing doll that breathes: its chest rises and falls a little, and its arms move
 * with it. Give it the pose it stands in, and the time.
 */
export function breathing(pose: Pose, timeMs: number): Pose {
  const { ms, waist, arms, lift } = MOVES.breath;
  const breath = Math.sin((timeMs / ms) * Math.PI * 2);
  return {
    ...pose,
    waist: pose.waist - waist * breath,
    frontArm: pose.frontArm + arms * breath,
    backArm: pose.backArm - arms * breath,
    lift: pose.lift + lift * breath,
  };
}

/** A bent back: the same pose, stooping this much (radians), with the head hanging a little too. */
export function stooping(pose: Pose, stoop: number): Pose {
  return { ...pose, waist: pose.waist + stoop, head: pose.head + stoop * 0.45 };
}
