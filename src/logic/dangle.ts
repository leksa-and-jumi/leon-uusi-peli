import { clamp } from './bounds';
import type { Pose } from './pose';

/** Something that swings loosely: where it is, and how fast it is turning (per second). */
export interface Swinger {
  angle: number;
  speed: number;
}

/** How a loose joint behaves: how hard it is pulled to rest, and how fast it calms down. */
export interface Joint {
  stiffness: number;
  damping: number;
}

/** Longer frames are cut to this, so a slow frame can't make joints fly off. */
const MAX_STEP_MS = 33;

/** Move a loose joint forward in time: it swings toward `rest`, past it, and settles. */
export function dangleStep(swinger: Swinger, rest: number, joint: Joint, deltaMs: number): Swinger {
  const seconds = Math.min(deltaMs, MAX_STEP_MS) / 1000;
  const pull = -joint.stiffness * (swinger.angle - rest) - joint.damping * swinger.speed;
  const speed = swinger.speed + pull * seconds;
  return { angle: swinger.angle + speed * seconds, speed };
}

/** The same angle, written between -π and π. */
export function wrapAngle(angle: number): number {
  const turn = Math.PI * 2;
  const wrapped = ((((angle + Math.PI) % turn) + turn) % turn) - Math.PI;
  return wrapped === -Math.PI ? Math.PI : wrapped;
}

/** How far something loose trails behind when it is moved at `speed`, at most `max`. */
export function trail(speed: number, pull: number, max: number): number {
  return clamp(speed * pull, -max, max);
}

/** The parts of a pose that are joints (everything but the hop and the lean). */
export type JointKey = Exclude<keyof Pose, 'lift' | 'lean'>;

export const JOINT_KEYS = [
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
] as const satisfies readonly JointKey[];

/** How a limp doll hangs in the air. */
export interface Hang {
  /** Arms and legs can't swing further than this from straight along the body. */
  armMax: number;
  legMax: number;
  /** How much of its own random flop each limb keeps, so they don't hang side by side. */
  spread: number;
  /** How much the elbows and knees stay bent. */
  bend: number;
  /** How much the head and the waist follow the pull. */
  head: number;
  waist: number;
  /** How far arms and legs fly apart when the doll drops fast. */
  armFloat: number;
  legFloat: number;
}

/**
 * Where the joints of a limp doll want to be while it hangs in the air. `down` is the
 * way straight down, seen from the doll (0 when it hangs upright and still). `float`
 * goes from 0 to 1 as the doll drops faster: its arms and legs fly up and apart.
 */
export function hangingRest(flop: Pose, down: number, hang: Hang, float = 0): Pose {
  const arm = clamp(down, -hang.armMax, hang.armMax);
  const leg = clamp(down, -hang.legMax, hang.legMax);
  const armsApart = float * hang.armFloat;
  const legsApart = float * hang.legFloat;
  return {
    frontArm: arm + flop.frontArm * hang.spread - armsApart,
    backArm: arm + flop.backArm * hang.spread + armsApart,
    frontLeg: leg + flop.frontLeg * hang.spread - legsApart,
    backLeg: leg + flop.backLeg * hang.spread + legsApart,
    frontElbow: flop.frontElbow * hang.bend,
    backElbow: flop.backElbow * hang.bend,
    frontKnee: flop.frontKnee * hang.bend,
    backKnee: flop.backKnee * hang.bend,
    waist: leg * hang.waist,
    head: leg * hang.head,
    lift: 0,
    lean: 0,
  };
}

/**
 * Let every joint of a pose swing loosely toward `rest`. `speeds` holds how fast
 * each joint is turning. Gives the new pose and the new speeds.
 */
export function swingPose(
  pose: Pose,
  speeds: Pose,
  rest: Pose,
  joints: Record<JointKey, Joint>,
  deltaMs: number,
): { pose: Pose; speeds: Pose } {
  const nextPose = { ...pose, lift: rest.lift, lean: rest.lean };
  const nextSpeeds = { ...speeds };
  for (const key of JOINT_KEYS) {
    const swung = dangleStep(
      { angle: pose[key], speed: speeds[key] },
      rest[key],
      joints[key],
      deltaMs,
    );
    nextPose[key] = swung.angle;
    nextSpeeds[key] = swung.speed;
  }
  return { pose: nextPose, speeds: nextSpeeds };
}

/**
 * Give every joint a random shove, at most `size` (radians per second) either way.
 * Makes a limp doll flop when it hits the ground or gets hit. `random` gives
 * numbers from 0 to 1, like `Math.random`.
 */
export function kickJoints(speeds: Pose, size: number, random: () => number = Math.random): Pose {
  const kicked = { ...speeds };
  for (const key of JOINT_KEYS) {
    kicked[key] = speeds[key] + (random() * 2 - 1) * size;
  }
  return kicked;
}
