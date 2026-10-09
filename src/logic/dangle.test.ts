import { describe, expect, it } from 'vitest';
import {
  dangleStep,
  hangingRest,
  JOINT_KEYS,
  kickJoints,
  lyingRest,
  nearestTurn,
  randomSag,
  swingPose,
  trail,
  wrapAngle,
  type Joint,
  type JointKey,
} from './dangle';
import { limpPose, STAND, STILL } from './pose';

const joint: Joint = { stiffness: 60, damping: 5 };

describe('dangleStep', () => {
  it('starts swinging toward rest', () => {
    const next = dangleStep({ angle: 1, speed: 0 }, 0, joint, 16);
    expect(next.speed).toBeLessThan(0);
    expect(next.angle).toBeLessThan(1);
  });

  it('stays put when already at rest', () => {
    expect(dangleStep({ angle: 0.5, speed: 0 }, 0.5, joint, 16)).toEqual({ angle: 0.5, speed: 0 });
  });

  it('swings past rest before it settles', () => {
    let swinger = { angle: 1, speed: 0 };
    let lowest = 1;
    for (let i = 0; i < 400; i++) {
      swinger = dangleStep(swinger, 0, joint, 16);
      lowest = Math.min(lowest, swinger.angle);
    }
    expect(lowest).toBeLessThan(-0.1);
    expect(Math.abs(swinger.angle)).toBeLessThan(0.01);
    expect(Math.abs(swinger.speed)).toBeLessThan(0.05);
  });

  it('never turns faster than the joint allows', () => {
    const capped = { ...joint, maxSpeed: 2 };
    const next = dangleStep({ angle: 5, speed: -50 }, 0, capped, 16);
    expect(next.speed).toBe(-2);
  });

  it('stays calm even after a very long frame', () => {
    const next = dangleStep({ angle: 1, speed: 0 }, 0, joint, 5000);
    expect(Math.abs(next.angle)).toBeLessThanOrEqual(1);
  });
});

describe('wrapAngle', () => {
  it('leaves small angles alone', () => {
    expect(wrapAngle(1)).toBeCloseTo(1);
    expect(wrapAngle(-2)).toBeCloseTo(-2);
  });

  it('takes whole turns away', () => {
    expect(wrapAngle(Math.PI * 2 + 0.5)).toBeCloseTo(0.5);
    expect(wrapAngle(-Math.PI * 4 - 0.5)).toBeCloseTo(-0.5);
  });

  it('writes half a turn as π', () => {
    expect(wrapAngle(-Math.PI)).toBeCloseTo(Math.PI);
    expect(wrapAngle(Math.PI * 3)).toBeCloseTo(Math.PI);
  });
});

describe('trail', () => {
  it('grows with speed, up to the most', () => {
    expect(trail(100, 0.002, 1)).toBeCloseTo(0.2);
    expect(trail(5000, 0.002, 1)).toBe(1);
    expect(trail(-5000, 0.002, 1)).toBe(-1);
  });
});

describe('hangingRest', () => {
  const hang = {
    legMax: 1.1,
    elbowMax: 2,
    kneeMax: 2,
    headMax: 0.8,
    waistMax: 0.6,
    spread: 0,
    armFloat: 1.5,
    legFloat: 0.5,
  };
  const flop = limpPose(() => 1);

  it('hangs everything straight down when still and upright', () => {
    const rest = hangingRest(flop, 0, hang);
    expect(rest.frontArm).toBe(0);
    expect(rest.backLeg).toBe(0);
    expect(rest.frontElbow).toBeCloseTo(0);
    expect(rest.backKnee).toBeCloseTo(0);
    expect(rest.head).toBe(0);
  });

  it('lets the arms follow further than the legs', () => {
    const rest = hangingRest(flop, 2.5, hang);
    expect(rest.frontArm).toBeCloseTo(2.5);
    expect(rest.frontLeg).toBeCloseTo(1.1);
  });

  it('keeps every limb on its side when straight down passes overhead', () => {
    // Hanging upside down and swaying a little, "down" is now just under π and now
    // just over it, which is the same as just above -π
    const upsideDown = { ...STILL, frontArm: 3, backArm: -3, frontLeg: 1.1, backLeg: -1.1 };
    const before = hangingRest(flop, Math.PI - 0.05, hang, 0, upsideDown);
    const after = hangingRest(flop, -Math.PI + 0.05, hang, 0, upsideDown);
    expect(after.frontArm).toBeCloseTo(before.frontArm + 0.1);
    expect(after.backArm).toBeCloseTo(before.backArm + 0.1);
    expect(after.frontLeg).toBeCloseTo(before.frontLeg);
    expect(after.backLeg).toBeCloseTo(before.backLeg);
    expect(before.frontLeg).toBeCloseTo(1.1);
    expect(before.backLeg).toBeCloseTo(-1.1);
  });

  it('lets an arm that has gone all the way around hang where it is', () => {
    const wound = { ...STILL, frontArm: Math.PI * 2 + 0.2 };
    expect(hangingRest(flop, 0, hang, 0, wound).frontArm).toBeCloseTo(Math.PI * 2);
  });

  it('bends the knees to let the shins hang where the thighs cannot reach', () => {
    const rest = hangingRest(flop, 2.5, hang);
    expect(rest.frontKnee).toBeCloseTo(1.4);
    expect(rest.frontElbow).toBeCloseTo(0);
  });

  it('bends the elbows only forward and the knees only back', () => {
    // With a spread, one arm hangs a little behind straight down and one a little ahead
    const spread = { ...hang, spread: 0.2 };
    const apart = { ...STILL, frontArm: 2, backArm: -2 };
    const rest = hangingRest(apart, 0, spread);
    expect(rest.frontElbow).toBeCloseTo(-0.4);
    expect(rest.backElbow).toBeCloseTo(0);
    // Thighs that can't reach straight down the other way leave the knees straight
    const back = hangingRest(flop, -2.5, hang);
    expect(back.frontLeg).toBeCloseTo(-1.1);
    expect(back.frontKnee).toBe(0);
  });

  it('tips the head and the waist, but not too far', () => {
    const rest = hangingRest(flop, 2.5, hang);
    expect(rest.head).toBeCloseTo(0.8);
    expect(rest.waist).toBeCloseTo(0.6);
  });

  it('throws arms and legs apart when dropping fast', () => {
    const rest = hangingRest(flop, 0, hang, 1);
    expect(rest.frontArm).toBeCloseTo(-1.5);
    expect(rest.backArm).toBeCloseTo(1.5);
    expect(rest.frontLeg).toBeCloseTo(-0.5);
    expect(rest.backLeg).toBeCloseTo(0.5);
  });
});

describe('swingPose', () => {
  const joints = Object.fromEntries(JOINT_KEYS.map((key) => [key, joint])) as Record<
    JointKey,
    Joint
  >;

  it('moves every joint toward the rest pose and ends up there', () => {
    const rest = limpPose(() => 0.9);
    let state = { pose: STAND, speeds: STILL };
    for (let i = 0; i < 500; i++) {
      state = swingPose(state.pose, state.speeds, rest, joints, 16);
    }
    for (const key of JOINT_KEYS) {
      expect(state.pose[key]).toBeCloseTo(rest[key], 2);
    }
  });

  it('does not change the poses it is given', () => {
    const before = { ...STAND };
    swingPose(
      STAND,
      STILL,
      limpPose(() => 1),
      joints,
      16,
    );
    expect(STAND).toEqual(before);
  });
});

describe('kickJoints', () => {
  it('shoves every joint, but not the hop or the lean', () => {
    const kicked = kickJoints(STILL, 3, () => 1);
    for (const key of JOINT_KEYS) {
      expect(kicked[key]).toBe(3);
    }
    expect(kicked.lift).toBe(0);
    expect(kicked.lean).toBe(0);
  });

  it('shoves either way', () => {
    expect(kickJoints(STILL, 3, () => 0).frontArm).toBe(-3);
    expect(kickJoints(STILL, 3, () => 0.5).frontArm).toBe(0);
  });

  it('adds to the speed the joints already have', () => {
    const moving = { ...STILL, head: 2 };
    expect(kickJoints(moving, 1, () => 1).head).toBe(3);
  });
});

describe('nearestTurn', () => {
  it('adds whole turns to get close', () => {
    expect(nearestTurn(0.5, 6)).toBeCloseTo(0.5 + Math.PI * 2);
    expect(nearestTurn(-Math.PI, 3)).toBeCloseTo(Math.PI);
  });

  it('leaves an angle that is already close', () => {
    expect(nearestTurn(1, 1.5)).toBeCloseTo(1);
  });
});

describe('lyingRest', () => {
  const hang = {
    legMax: 1.3,
    elbowMax: 2.3,
    kneeMax: 2.2,
    headMax: 1,
    waistMax: 0.7,
    spread: 0,
    armFloat: 0,
    legFloat: 0,
  };
  const flatRight = Math.PI / 2;

  /** How far from flat along the ground something points: 0 is flat. */
  const offFlat = (turned: number, facing: 1 | -1, angle: number): number =>
    Math.abs(Math.abs(wrapAngle(turned + facing * angle)) - Math.PI / 2);

  it('lays arms and legs that hang along the body flat beside it', () => {
    const rest = lyingRest(STAND, flatRight, 1, STILL, hang);
    expect(rest.frontArm).toBeCloseTo(0);
    expect(rest.backLeg).toBeCloseTo(0);
    expect(rest.frontKnee).toBeCloseTo(0);
    expect(rest.waist).toBe(0);
  });

  it('lays a raised arm flat above the head instead of leaving it up', () => {
    const raised = { ...STAND, frontArm: -2.4 };
    const rest = lyingRest(raised, flatRight, 1, STILL, hang);
    expect(rest.frontArm).toBeCloseTo(-Math.PI);
    expect(offFlat(flatRight, 1, rest.frontArm)).toBeCloseTo(0);
  });

  it('leaves nothing sticking up, whichever way the doll lies and faces', () => {
    let seed = 0.37;
    const random = (): number => {
      seed = (seed * 9.17 + 0.23) % 1;
      return seed;
    };
    for (const turned of [flatRight, -flatRight]) {
      for (const facing of [1, -1] as const) {
        for (let i = 0; i < 20; i++) {
          const rest = lyingRest(limpPose(random), turned, facing, STILL, hang);
          expect(offFlat(turned, facing, rest.frontArm)).toBeCloseTo(0);
          expect(offFlat(turned, facing, rest.backArm)).toBeCloseTo(0);
          expect(offFlat(turned, facing, rest.frontLeg)).toBeCloseTo(0);
          expect(offFlat(turned, facing, rest.backLeg)).toBeCloseTo(0);
        }
      }
    }
  });

  it('sags toward the floor, never up', () => {
    const sag = { ...STILL, frontArm: 0.2 };
    const rest = lyingRest(STAND, flatRight, 1, sag, hang);
    // Pointing a little more downward than flat
    expect(Math.abs(wrapAngle(flatRight + rest.frontArm))).toBeCloseTo(Math.PI / 2 - 0.2);
  });
});

describe('randomSag', () => {
  it('gives every joint a sag from zero to the most', () => {
    expect(randomSag(0.2, () => 1).frontArm).toBeCloseTo(0.2);
    expect(randomSag(0.2, () => 0).head).toBe(0);
    expect(randomSag(0.2, () => 1).lift).toBe(0);
  });
});
