import { describe, expect, it } from 'vitest';
import { blendPose, breathing, limpPose, MOVES, poseFor, STAND, stooping } from './pose';

describe('poseFor', () => {
  it('stands still with arms and legs straight down', () => {
    expect(poseFor('stand', 1234)).toEqual(STAND);
  });

  it('walks with legs swinging opposite ways, and arms opposite to the legs', () => {
    const pose = poseFor('walk', MOVES.walk.stepMs / 4);
    expect(pose.frontLeg).toBeCloseTo(-MOVES.walk.leg);
    expect(pose.backLeg).toBeCloseTo(MOVES.walk.leg);
    expect(pose.frontArm).toBeCloseTo(MOVES.walk.arm);
    expect(pose.backArm).toBeCloseTo(-MOVES.walk.arm);
    expect(pose.lift).toBe(0);
  });

  it('bends the knee of the leg that is on its way forward', () => {
    const start = poseFor('walk', 0);
    expect(start.frontKnee).toBeCloseTo(MOVES.walk.knee);
    expect(start.backKnee).toBeCloseTo(0);
    const half = poseFor('walk', MOVES.walk.stepMs / 2);
    expect(half.frontKnee).toBeCloseTo(0);
    expect(half.backKnee).toBeCloseTo(MOVES.walk.knee);
  });

  it('runs with bigger steps than walking', () => {
    const run = poseFor('run', MOVES.run.stepMs / 4);
    const walk = poseFor('walk', MOVES.walk.stepMs / 4);
    expect(Math.abs(run.frontLeg)).toBeGreaterThan(Math.abs(walk.frontLeg));
  });

  it('dances with both arms up and hops on the beat', () => {
    for (const time of [0, 100, 230, 500, 777]) {
      const pose = poseFor('dance', time);
      expect(pose.frontArm).toBeLessThan(-Math.PI / 2);
      expect(pose.backArm).toBeGreaterThan(Math.PI / 2);
      expect(pose.lift).toBeGreaterThanOrEqual(0);
    }
    expect(poseFor('dance', MOVES.dance.beatMs / 2).lift).toBeCloseTo(MOVES.dance.hop);
    expect(poseFor('dance', 0).lift).toBeCloseTo(0);
  });

  it('hangs by the arms when held', () => {
    const pose = poseFor('held', 300);
    expect(pose.frontArm).toBeLessThan(-Math.PI / 2);
    expect(pose.backArm).toBeGreaterThan(Math.PI / 2);
  });

  it('sits with both thighs out in front, knees bent and arms forward', () => {
    const pose = poseFor('sit', 999);
    expect(pose.frontLeg).toBeLessThan(-1);
    expect(pose.backLeg).toBe(pose.frontLeg);
    expect(pose.frontKnee).toBeGreaterThan(1);
    expect(pose.frontArm).toBeLessThan(0);
    expect(pose.lift).toBe(0);
  });

  it('drives with the legs stretched out in front instead of hanging down', () => {
    const pose = poseFor('drive', 0);
    expect(pose.frontLeg).toBeLessThan(-1);
    expect(pose.frontKnee).toBeLessThan(0.5);
    expect(pose.frontArm).toBeLessThan(0);
  });

  it('punches with the front arm straight forward', () => {
    expect(poseFor('punch', 0).frontArm).toBeCloseTo(-Math.PI / 2);
  });

  it('chokes on its knees, with both hands up at its throat', () => {
    const pose = poseFor('choke', 0);
    expect(pose.frontKnee).toBeGreaterThan(1.4);
    expect(pose.backKnee).toBeGreaterThan(1.4);
    expect(pose.lift).toBeLessThan(-15);
    expect(pose.frontElbow).toBeLessThan(-2);
    expect(pose.backElbow).toBeLessThan(-2);
  });

  it('heaves back and forth with every cough', () => {
    const one = poseFor('choke', 105);
    const other = poseFor('choke', 315);
    expect(one.waist).toBeGreaterThan(other.waist);
    expect(one.head).toBeGreaterThan(other.head);
  });

  it('sweeps with small steps, the broom arm going back and forth', () => {
    const one = poseFor('sweep', 155);
    const other = poseFor('sweep', 465);
    expect(one.frontArm).toBeGreaterThan(other.frontArm);
    expect(Math.abs(poseFor('sweep', 225).frontLeg)).toBeLessThan(0.3);
  });

  it('pushes with both arms stretched out in front, feet apart', () => {
    const pose = poseFor('push', 0);
    expect(pose.frontArm).toBeCloseTo(-Math.PI / 2);
    expect(pose.backArm).toBeLessThan(-1.2);
    expect(pose.frontElbow).toBe(0);
    expect(pose.backElbow).toBe(0);
    expect(pose.frontLeg).toBeLessThan(0);
    expect(pose.backLeg).toBeGreaterThan(0);
  });
});

describe('limpPose', () => {
  it('flops every joint as far as it goes at most', () => {
    const { arm, leg, elbow, knee } = MOVES.limp;
    expect(limpPose(() => 1)).toMatchObject({
      frontArm: arm,
      backLeg: leg,
      frontElbow: -elbow,
      backKnee: knee,
    });
    expect(limpPose(() => 0)).toMatchObject({
      frontArm: -arm,
      backLeg: -leg,
      frontElbow: -0,
      backKnee: 0,
    });
  });

  it('never bends elbows backward or knees forward', () => {
    let seed = 0.13;
    const random = (): number => {
      seed = (seed * 7.31 + 0.17) % 1;
      return seed;
    };
    for (let i = 0; i < 50; i++) {
      const pose = limpPose(random);
      expect(pose.frontElbow).toBeLessThanOrEqual(0);
      expect(pose.backElbow).toBeLessThanOrEqual(0);
      expect(pose.frontKnee).toBeGreaterThanOrEqual(0);
      expect(pose.backKnee).toBeGreaterThanOrEqual(0);
      expect(pose.lift).toBe(0);
    }
  });
});

describe('blendPose', () => {
  const limp = limpPose(() => 1);

  it('is the first pose at 0 and the second at 1', () => {
    expect(blendPose(STAND, limp, 0)).toEqual(STAND);
    expect(blendPose(STAND, limp, 1)).toEqual(limp);
  });

  it('is half way between at 0.5', () => {
    const half = blendPose(STAND, limp, 0.5);
    expect(half.frontArm).toBeCloseTo((STAND.frontArm + limp.frontArm) / 2);
    expect(half.waist).toBeCloseTo(limp.waist / 2);
  });

  it('does not go past either pose', () => {
    expect(blendPose(STAND, limp, 7)).toEqual(limp);
    expect(blendPose(STAND, limp, -3)).toEqual(STAND);
  });
});

describe('slam pose', () => {
  it('crouches: both knees bent and the whole doll lower', () => {
    const pose = poseFor('slam', 0);
    expect(pose.frontKnee).toBeGreaterThan(1);
    expect(pose.backKnee).toBeGreaterThan(1);
    expect(pose.lift).toBeLessThan(0);
  });

  it('bends forward with the arm down in front', () => {
    const pose = poseFor('slam', 500);
    expect(pose.waist).toBeGreaterThan(0);
    expect(pose.frontArm).toBeLessThan(0);
  });
});

describe('swim pose', () => {
  it('lies forward in the water with its head held up', () => {
    const pose = poseFor('swim', 0);
    expect(pose.lean).toBeGreaterThan(1);
    expect(pose.head).toBeLessThan(0);
  });

  it('reaches out in front with both arms, one after the other', () => {
    const early = poseFor('swim', 190);
    const late = poseFor('swim', 570);
    expect(early.frontArm).toBeLessThan(-1);
    expect(early.backArm).toBeLessThan(-1);
    expect(early.frontArm - early.backArm).toBeCloseTo(-(late.frontArm - late.backArm));
  });

  it('kicks its legs in turn', () => {
    const pose = poseFor('swim', 190);
    expect(pose.frontLeg).toBeCloseTo(-pose.backLeg);
  });
});

describe('breathing', () => {
  it('moves the chest and the arms a little, back and forth', () => {
    const inBreath = breathing(STAND, 800);
    const outBreath = breathing(STAND, 2400);
    expect(inBreath.waist).not.toBeCloseTo(outBreath.waist, 3);
    expect(Math.abs(inBreath.waist - STAND.waist)).toBeLessThan(0.03);
    expect(Math.abs(inBreath.frontArm - STAND.frontArm)).toBeLessThan(0.05);
  });

  it('leaves the legs alone', () => {
    const pose = breathing(STAND, 800);
    expect(pose.frontLeg).toBe(STAND.frontLeg);
    expect(pose.backKnee).toBe(STAND.backKnee);
  });
});

describe('stooping', () => {
  it('bends the back and lets the head hang a little', () => {
    const pose = stooping(STAND, 0.3);
    expect(pose.waist).toBeCloseTo(STAND.waist + 0.3);
    expect(pose.head).toBeGreaterThan(STAND.head);
    expect(pose.head).toBeLessThan(STAND.head + 0.3);
  });
});
