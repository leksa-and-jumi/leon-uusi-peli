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

/** What plays on one beat of the silly tune of crazy mode. */
export interface CrazyBeat {
  /** The squeaky tune's note (in hertz), or `null` for a rest. */
  note: number | null;
  /** A bouncy low note (in hertz), or `null` for none. */
  bass: number | null;
  /** A slide whistle going up or down, or `null` for none. */
  slide: 'up' | 'down' | null;
  /** A clown horn: honk honk. */
  honk: boolean;
}

/** How the silly tune goes. */
export interface CrazyTune {
  /** The tune: semitones up (or down) from `base`, `null` for a rest. */
  notes: readonly (number | null)[];
  base: number;
  /** The low notes, one on every `bassEvery` beats, in turn: semitones from `bassBase`. */
  bass: readonly number[];
  bassBase: number;
  bassEvery: number;
  /** On which beats of the tune the slide whistle goes up, and down. */
  slideUp: readonly number[];
  slideDown: readonly number[];
  /** On which beats of the tune the clown horn honks. */
  honks: readonly number[];
}

/** What plays on beat number `beat` (counting from 0) of the silly tune. */
export function crazyBeat(beat: number, tune: CrazyTune): CrazyBeat {
  const at = beat % tune.notes.length;
  const step = tune.notes[at] ?? null;
  const onBass = beat % tune.bassEvery === 0;
  const bassStep = onBass ? tune.bass[(beat / tune.bassEvery) % tune.bass.length] : undefined;
  const slide = tune.slideUp.includes(at) ? 'up' : tune.slideDown.includes(at) ? 'down' : null;
  return {
    note: step === null ? null : pitch(tune.base, step),
    bass: bassStep === undefined ? null : pitch(tune.bassBase, bassStep),
    slide,
    honk: tune.honks.includes(at),
  };
}
