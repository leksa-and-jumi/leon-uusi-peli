/** Where something dragged was at a moment in time. */
export interface DragSample {
  timeMs: number;
  x: number;
  y: number;
}

/** Forget the samples that are older than `windowMs`. */
export function recentSamples(
  samples: readonly DragSample[],
  nowMs: number,
  windowMs: number,
): DragSample[] {
  return samples.filter((sample) => nowMs - sample.timeMs <= windowMs);
}

/**
 * How fast and which way something was being dragged just before it was let go, in
 * pixels per second: from the oldest sample to the newest. Zero with fewer than two
 * samples, so a hand that has stopped moving just drops what it holds.
 */
export function throwSpeed(samples: readonly DragSample[]): { x: number; y: number } {
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (!first || !last || last.timeMs <= first.timeMs) return { x: 0, y: 0 };
  const seconds = (last.timeMs - first.timeMs) / 1000;
  return { x: (last.x - first.x) / seconds, y: (last.y - first.y) / seconds };
}
