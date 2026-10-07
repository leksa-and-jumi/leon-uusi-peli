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
 * How fast and which way something was being thrown, in pixels per second: the
 * fastest stretch of the drag, measured across `span` samples at a time. A hand
 * that slows down just before letting go still throws as hard as it swung. Zero
 * with too few samples, so a hand that has stopped just drops what it holds.
 */
export function throwSpeed(samples: readonly DragSample[], span = 2): { x: number; y: number } {
  let best = { x: 0, y: 0 };
  let bestSpeed = 0;
  for (let i = 0; i + span < samples.length; i++) {
    const from = samples[i];
    const to = samples[i + span];
    if (!from || !to || to.timeMs <= from.timeMs) continue;
    const seconds = (to.timeMs - from.timeMs) / 1000;
    const speed = { x: (to.x - from.x) / seconds, y: (to.y - from.y) / seconds };
    const size = Math.hypot(speed.x, speed.y);
    if (size > bestSpeed) {
      best = speed;
      bestSpeed = size;
    }
  }
  return best;
}
