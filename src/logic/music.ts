/** What plays on one beat of the creepy tune of horror mode. */
export interface HorrorBeat {
  /** A heartbeat: two low thumps. */
  heart: boolean;
  /** The pitch of the music box note (in hertz), or `null` for none. */
  note: number | null;
  /** A whisper of wind swells up and dies away. */
  whisper: boolean;
}

/** How the tune goes. */
export interface HorrorTune {
  /** The music box tune: semitones up (or down) from `base`, `null` for a rest. */
  notes: readonly (number | null)[];
  base: number;
  /** After the tune, this many beats of only the heartbeat, before it plays again. */
  quietBeats: number;
  /** A heartbeat on every this many beats. */
  heartEvery: number;
  /** A whisper on every this many beats. */
  whisperEvery: number;
}

/** The pitch `semitones` up from `base` (down when it is below zero). */
export function pitch(base: number, semitones: number): number {
  return base * 2 ** (semitones / 12);
}

/** What plays on beat number `beat` (counting from 0) of the tune. */
export function horrorBeat(beat: number, tune: HorrorTune): HorrorBeat {
  const round = tune.notes.length + tune.quietBeats;
  const at = beat % round;
  const step = at < tune.notes.length ? (tune.notes[at] ?? null) : null;
  return {
    heart: beat % tune.heartEvery === 0,
    note: step === null ? null : pitch(tune.base, step),
    whisper: beat % tune.whisperEvery === tune.whisperEvery - 1,
  };
}
