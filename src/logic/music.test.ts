import { describe, expect, it } from 'vitest';
import { crazyBeat, horrorBeat, pitch, type CrazyTune, type HorrorTune } from './music';

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

describe('crazyBeat', () => {
  const silly: CrazyTune = {
    notes: [0, 12, null, 7],
    base: 500,
    bass: [0, 7],
    bassBase: 100,
    bassEvery: 2,
    slideUp: [1],
    slideDown: [3],
    honks: [2],
  };

  it('plays the notes of the tune in turn, and rests', () => {
    expect(crazyBeat(0, silly).note).toBe(500);
    expect(crazyBeat(1, silly).note).toBeCloseTo(1000);
    expect(crazyBeat(2, silly).note).toBeNull();
  });

  it('starts the tune again from the top', () => {
    expect(crazyBeat(4, silly).note).toBe(500);
  });

  it('bounces between the low notes on every other beat', () => {
    expect(crazyBeat(0, silly).bass).toBe(100);
    expect(crazyBeat(1, silly).bass).toBeNull();
    expect(crazyBeat(2, silly).bass).toBeCloseTo(pitch(100, 7));
    expect(crazyBeat(4, silly).bass).toBe(100);
  });

  it('slides the whistle and honks the horn on their beats', () => {
    expect(crazyBeat(1, silly).slide).toBe('up');
    expect(crazyBeat(3, silly).slide).toBe('down');
    expect(crazyBeat(0, silly).slide).toBeNull();
    expect(crazyBeat(6, silly).honk).toBe(true);
    expect(crazyBeat(5, silly).honk).toBe(false);
  });
});
