import { describe, expect, it } from 'vitest';
import {
  dangleStep,
  hangingRest,
  JOINT_KEYS,
  kickJoints,
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
    armMax: 2.9,
    legMax: 1.1,
    spread: 0,
    bend: 0.5,
    head: 0.5,
    waist: 0.25,
    armFloat: 1.5,
    legFloat: 0.5,
  };
  const flop = limpPose(() => 1);

  it('hangs arms and legs straight down when still and upright', () => {
    const rest = hangingRest(flop, 0, hang);
    expect(rest.frontArm).toBe(0);
    expect(rest.backLeg).toBe(0);
  });

  it('lets the arms follow further than the legs', () => {
    const rest = hangingRest(flop, 2.5, hang);
    expect(rest.frontArm).toBeCloseTo(2.5);
    expect(rest.frontLeg).toBeCloseTo(1.1);
  });

  it('throws arms and legs apart when dropping fast', () => {
    const rest = hangingRest(flop, 0, hang, 1);
    expect(rest.frontArm).toBeCloseTo(-1.5);
    expect(rest.backArm).toBeCloseTo(1.5);
    expect(rest.frontLeg).toBeCloseTo(-0.5);
    expect(rest.backLeg).toBeCloseTo(0.5);
  });

  it('keeps elbows and knees a little bent', () => {
    const rest = hangingRest(flop, 0, hang);
    expect(rest.frontElbow).toBeCloseTo(flop.frontElbow * 0.5);
    expect(rest.backKnee).toBeCloseTo(flop.backKnee * 0.5);
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
