import { describe, expect, it } from 'vitest';
import { pressActivity } from './activity';

describe('pressActivity', () => {
  it('starts what was pressed', () => {
    expect(pressActivity('idle', 'dance', false)).toBe('dance');
    expect(pressActivity('walk', 'angry', false)).toBe('angry');
  });

  it('stops what it is doing when that is pressed again', () => {
    expect(pressActivity('dance', 'dance', false)).toBe('idle');
    expect(pressActivity('angry', 'angry', false)).toBe('idle');
  });

  it('lets a doll that is angry by nature walk and dance', () => {
    expect(pressActivity('angry', 'dance', true)).toBe('dance');
    expect(pressActivity('angry', 'walk', true)).toBe('walk');
  });

  it('makes it angry again when its walking or dancing is stopped', () => {
    expect(pressActivity('dance', 'dance', true)).toBe('angry');
    expect(pressActivity('walk', 'walk', true)).toBe('angry');
  });

  it('calms even that one down when its angry bubble is switched off', () => {
    expect(pressActivity('angry', 'angry', true)).toBe('idle');
  });
});
