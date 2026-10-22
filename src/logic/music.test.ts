import { describe, expect, it } from 'vitest';
import { horrorBeat, pitch, type HorrorTune } from './music';

const tune: HorrorTune = {
  notes: [0, null, 12],
  base: 440,
  quietBeats: 2,
  heartEvery: 2,
  whisperEvery: 4,
};

describe('pitch', () => {
  it('is the base itself with no semitones', () => {
    expect(pitch(440, 0)).toBe(440);
  });

  it('doubles twelve semitones up and halves twelve down', () => {
    expect(pitch(440, 12)).toBeCloseTo(880);
    expect(pitch(440, -12)).toBeCloseTo(220);
  });
});

describe('horrorBeat', () => {
  it('plays the notes of the tune in order, with its rests', () => {
    expect(horrorBeat(0, tune).note).toBe(440);
    expect(horrorBeat(1, tune).note).toBeNull();
    expect(horrorBeat(2, tune).note).toBeCloseTo(880);
  });

  it('is quiet after the tune, and then plays it again', () => {
    expect(horrorBeat(3, tune).note).toBeNull();
    expect(horrorBeat(4, tune).note).toBeNull();
    expect(horrorBeat(5, tune).note).toBe(440);
  });

  it('has a heartbeat on every second beat', () => {
    expect([0, 1, 2, 3].map((beat) => horrorBeat(beat, tune).heart)).toEqual([
      true,
      false,
      true,
      false,
    ]);
  });

  it('whispers on the last beat of every few', () => {
    expect([0, 1, 2, 3, 7].map((beat) => horrorBeat(beat, tune).whisper)).toEqual([
      false,
      false,
      false,
      true,
      true,
    ]);
  });
});
