/** Whose turn it is among a few things that take turns, and how long it has been its turn. */
export interface Turn {
  turn: number;
  ms: number;
}

/**
 * Things that take turns, each for `everyMs`: move time on, and go on to the next one
 * (and from the last back to the first) when the time of this one is up.
 */
export function turnStep(now: Turn, deltaMs: number, everyMs: number, count: number): Turn {
  if (count <= 0 || everyMs <= 0) return { turn: 0, ms: 0 };
  const ms = now.ms + deltaMs;
  if (ms < everyMs) return { turn: now.turn % count, ms };
  return { turn: (now.turn + 1) % count, ms: ms - everyMs };
}
