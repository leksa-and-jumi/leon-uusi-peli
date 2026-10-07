/** What the TV shows at a moment in time. */
export interface TvMoment {
  /** Which program is on, counting from 0. */
  channel: number;
  /** How long this program has been on. */
  sinceMs: number;
  /** Just switched: the screen shows snow for a blink. */
  snow: boolean;
}

/**
 * The TV plays its programs one after the other, each for `channelMs`, and shows
 * snow for `snowMs` every time it switches.
 */
export function tvMoment(
  timeMs: number,
  channels: number,
  channelMs: number,
  snowMs: number,
): TvMoment {
  const time = Math.max(0, timeMs);
  const sinceMs = time % channelMs;
  return {
    channel: Math.floor(time / channelMs) % channels,
    sinceMs,
    snow: sinceMs < snowMs,
  };
}

/** Back and forth between 0 and `span`: 0 at the start, `span` half way, 0 again, and so on. */
export function pingPong(distance: number, span: number): number {
  if (span <= 0) return 0;
  const there = Math.abs(distance) % (span * 2);
  return there <= span ? there : span * 2 - there;
}
