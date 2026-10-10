import { describe, expect, it } from 'vitest';
import { pullStep } from './pull';

const pull = { radius: 200, speed: 500, least: 20, eat: 30 };

describe('pullStep', () => {
  it('leaves alone what is out of reach', () => {
    expect(pullStep(0, 0, 300, 0, pull, 16)).toBeNull();
  });

  it('swallows what is right at it', () => {
    expect(pullStep(100, 100, 110, 120, pull, 16)).toBe('eaten');
  });

  it('pulls straight toward the hole', () => {
    const step = pullStep(0, 0, 60, -80, pull, 100);
    expect(step).not.toBeNull();
    expect(step).not.toBe('eaten');
    if (step === null || step === 'eaten') return;
    expect(step.dx).toBeGreaterThan(0);
    expect(step.dy).toBeLessThan(0);
    expect(step.dy / step.dx).toBeCloseTo(-80 / 60);
  });

  it('pulls harder the closer the thing is', () => {
    const far = pullStep(0, 0, 190, 0, pull, 100);
    const near = pullStep(0, 0, 50, 0, pull, 100);
    if (!far || far === 'eaten' || !near || near === 'eaten') throw new Error('should pull');
    expect(near.dx).toBeGreaterThan(far.dx);
    expect(far.dx).toBeGreaterThan(0);
  });

  it('never pulls a thing past the hole', () => {
    const step = pullStep(0, 0, 40, 0, pull, 5000);
    if (!step || step === 'eaten') throw new Error('should pull');
    expect(step.dx).toBeCloseTo(40);
  });
});
