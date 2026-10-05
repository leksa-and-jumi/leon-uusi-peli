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
