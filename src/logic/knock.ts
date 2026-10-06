/** Getting knocked over: tip over, lie on the floor for a while, then get back up. */
export interface KnockTimes {
  fallMs: number;
  lieMs: number;
  riseMs: number;
}

/** How far tipped over the person is: 0 = standing, 1 = flat on the floor. */
export function knockTilt(elapsedMs: number, times: KnockTimes): number {
  if (elapsedMs <= 0) return 0;
  if (elapsedMs < times.fallMs) return elapsedMs / times.fallMs;
  const lying = elapsedMs - times.fallMs;
  if (lying < times.lieMs) return 1;
  const rising = lying - times.lieMs;
  if (rising < times.riseMs) return 1 - rising / times.riseMs;
  return 0;
}

/** Is the person back on their feet? */
export function knockDone(elapsedMs: number, times: KnockTimes): boolean {
  return elapsedMs >= times.fallMs + times.lieMs + times.riseMs;
}

/** How a limp doll wobbles after it hits the floor. */
export interface Wobble {
  /** The biggest swing, in radians, right at landing. */
  size: number;
  /** The wobble has mostly died down after this long. */
  fadeMs: number;
  /** One swing back and forth takes this long. */
  beatMs: number;
}

/**
 * The wobble `sinceLandingMs` after hitting the floor: swings back and forth and
 * dies down. Zero before landing.
 */
export function settleWobble(sinceLandingMs: number, wobble: Wobble): number {
  if (sinceLandingMs < 0) return 0;
  const fade = Math.exp(-sinceLandingMs / wobble.fadeMs);
  return wobble.size * fade * Math.cos((sinceLandingMs / wobble.beatMs) * Math.PI * 2);
}
