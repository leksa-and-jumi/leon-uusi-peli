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
  /** It never turns faster than this (radians per second), however hard it is flung. */
  maxSpeed?: number;
}

/** Longer frames are cut to this, so a slow frame can't make joints fly off. */
const MAX_STEP_MS = 33;

/** Move a loose joint forward in time: it swings toward `rest`, past it, and settles. */
export function dangleStep(swinger: Swinger, rest: number, joint: Joint, deltaMs: number): Swinger {
  const seconds = Math.min(deltaMs, MAX_STEP_MS) / 1000;
  const pull = -joint.stiffness * (swinger.angle - rest) - joint.damping * swinger.speed;
  const most = joint.maxSpeed ?? Infinity;
  const speed = clamp(swinger.speed + pull * seconds, -most, most);
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
  /** Thighs can't swing further than this from straight along the body. Arms turn freely. */
  legMax: number;
  /** Elbows only bend forward and knees only back, at most this far. */
  elbowMax: number;
  kneeMax: number;
  /** The head and the waist can't tip further than this. */
  headMax: number;
  waistMax: number;
  /** How much of its own random flop each limb keeps, so they don't hang side by side. */
  spread: number;
  /** How far arms and legs fly apart when the doll drops fast. */
  armFloat: number;
  legFloat: number;
}

/**
 * Where the joints of a limp doll want to be while it hangs in the air: everything
 * hangs straight down as far as its joint lets it. `down` is the way straight down,
 * seen from the doll (0 when it hangs upright and still). `float` goes from 0 to 1 as
 * the doll drops faster: its arms and legs fly up and apart.
 *
 * `current` is the pose the doll is in now. The same direction can be written with
 * whole turns added, and each limb goes for the one closest to where it already is.
 * Without that, a doll hanging upside down would have "down" jump from one side to
 * the other all the time, and its arms would whip around in circles.
 */
export function hangingRest(
  flop: Pose,
  down: number,
  hang: Hang,
  float = 0,
  current: Pose = ZERO,
): Pose {
  // Arms turn freely at the shoulder; the other joints only go so far
  const free = (now: number): number => nearestTurn(down, now);
  const limited = (now: number, max: number): number => clamp(free(now), -max, max);
  const frontArm = free(current.frontArm) + flop.frontArm * hang.spread - float * hang.armFloat;
  const backArm = free(current.backArm) + flop.backArm * hang.spread + float * hang.armFloat;
  const frontLeg =
    limited(current.frontLeg, hang.legMax) + flop.frontLeg * hang.spread - float * hang.legFloat;
  const backLeg =
    limited(current.backLeg, hang.legMax) + flop.backLeg * hang.spread + float * hang.legFloat;
  // Forearms and shins hang down from the elbow and the knee, as far as those bend
  const elbow = (arm: number): number => clamp(wrapAngle(down - arm), -hang.elbowMax, 0);
  const knee = (leg: number): number => clamp(wrapAngle(down - leg), 0, hang.kneeMax);
  return {
    frontArm,
    backArm,
    frontLeg,
    backLeg,
    frontElbow: elbow(frontArm),
    backElbow: elbow(backArm),
    frontKnee: knee(frontLeg),
    backKnee: knee(backLeg),
    waist: limited(current.waist, hang.waistMax),
    head: limited(current.head, hang.headMax),
    lift: 0,
    lean: 0,
  };
}

/** The same angle as `angle`, with whole turns added so it is as close to `near` as it can be. */
export function nearestTurn(angle: number, near: number): number {
  const turn = Math.PI * 2;
  return angle + Math.round((near - angle) / turn) * turn;
}

/**
 * Where the joints of a limp doll want to be once it lies on the ground: nothing
 * sticks up. Every arm and leg drops flat onto the ground on the side it is already
 * leaning toward, and sags a little toward the floor.
 *
 * `turned` is how far the whole body has tipped over (π/2 is flat on its side),
 * `facing` is 1 or -1, and `sag` holds a small amount for each joint.
 */
export function lyingRest(
  current: Pose,
  turned: number,
  facing: 1 | -1,
  sag: Pose,
  hang: Hang,
): Pose {
  // Seen from outside, 0 points straight down and ±π/2 lies flat along the ground
  const flat = (pointsNow: number, sagBy: number): number => {
    const now = wrapAngle(pointsNow);
    const side = Math.abs(now) < 1e-6 ? (Math.sin(turned) < 0 ? -1 : 1) : Math.sign(now);
    return side * (Math.PI / 2 - sagBy);
  };
  const upper = (angle: number, sagBy: number, max: number): number => {
    const target = facing * (flat(turned + facing * angle, sagBy) - turned);
    return clamp(nearestTurn(target, angle), -max, max);
  };
  const lower = (upperNow: number, bend: number, upperRest: number, sagBy: number): number => {
    const target = facing * (flat(turned + facing * (upperNow + bend), sagBy) - turned);
    return wrapAngle(target - upperRest);
  };

  // Arms turn freely, so they lie down the short way from wherever they are
  const frontArm = upper(current.frontArm, sag.frontArm, Infinity);
  const backArm = upper(current.backArm, sag.backArm, Infinity);
  const frontLeg = upper(current.frontLeg, sag.frontLeg, hang.legMax);
  const backLeg = upper(current.backLeg, sag.backLeg, hang.legMax);
  const elbow = (now: number, bend: number, rest: number, sagBy: number): number =>
    clamp(lower(now, bend, rest, sagBy), -hang.elbowMax, 0);
  const knee = (now: number, bend: number, rest: number, sagBy: number): number =>
    clamp(lower(now, bend, rest, sagBy), 0, hang.kneeMax);
  // The head droops toward the floor
  const headDown = facing * (Math.sin(turned) < 0 ? -1 : 1) * sag.head;
  return {
    frontArm,
    backArm,
    frontLeg,
    backLeg,
    frontElbow: elbow(current.frontArm, current.frontElbow, frontArm, sag.frontElbow),
    backElbow: elbow(current.backArm, current.backElbow, backArm, sag.backElbow),
    frontKnee: knee(current.frontLeg, current.frontKnee, frontLeg, sag.frontKnee),
    backKnee: knee(current.backLeg, current.backKnee, backLeg, sag.backKnee),
    waist: 0,
    head: clamp(headDown, -hang.headMax, hang.headMax),
    lift: 0,
    lean: 0,
  };
}

/** A small random sag for every joint, from 0 to `most`. */
export function randomSag(most: number, random: () => number = Math.random): Pose {
  const sag = { ...ZERO };
  for (const key of JOINT_KEYS) {
    sag[key] = random() * most;
  }
  return sag;
}

const ZERO: Pose = {
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
