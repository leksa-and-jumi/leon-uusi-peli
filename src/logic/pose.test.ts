import { describe, expect, it } from 'vitest';
import { MOVES, poseFor, STAND } from './pose';

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
