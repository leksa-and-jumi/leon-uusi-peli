import { describe, expect, it } from 'vitest';
import { limpPose, MOVES, poseFor, STAND } from './pose';

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

  it('punches with the front arm straight forward', () => {
    expect(poseFor('punch', 0).frontArm).toBeCloseTo(-Math.PI / 2);
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
