/** How a puff of fire changes as it burns: the colors it goes through, and how it grows and rises. */
export interface FlameLook {
  /**
   * The colors of a puff, each from a moment in its life on (0 when it is lit, 1 when it
   * has burnt out), in order: nearly white at first, then yellow, orange, red and dark.
   */
  colors: readonly { at: number; color: number }[];
  /** How big it is when it is lit and when it has burnt out, as a share of its own size. */
  small: number;
  big: number;
  /** How see-through it is while it burns (0 to 1). From `fadeFrom` on it fades to nothing. */
  alpha: number;
  fadeFrom: number;
  /** Hot air rises: by the time it has burnt out, the puff is this many pixels higher. */
  rise: number;
}

/** A color between two colors: `share` 0 gives the first, 1 the second. */
export function mixColors(from: number, to: number, share: number): number {
  const part = Math.min(1, Math.max(0, share));
  const channel = (shift: number): number => {
    const start = (from >> shift) & 0xff;
    const end = (to >> shift) & 0xff;
    return Math.round(start + (end - start) * part);
  };
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

/**
 * How a puff of fire looks at a moment of its life (`age` 0 when it is lit, 1 when it
 * has burnt out): its color, how big and how see-through it is, and how far it has risen.
 */
export function flameAt(
  age: number,
  look: FlameLook,
): { color: number; scale: number; alpha: number; rise: number } {
  const t = Math.min(1, Math.max(0, age));
  const { colors } = look;
  const next = colors.findIndex((stop) => stop.at >= t);
  const to = colors[next === -1 ? colors.length - 1 : next];
  const from = colors[Math.max(0, (next === -1 ? colors.length : next) - 1)];
  const span = to && from ? to.at - from.at : 0;
  const color =
    to && from ? mixColors(from.color, to.color, span <= 0 ? 1 : (t - from.at) / span) : 0xffffff;
  const fading = t <= look.fadeFrom ? 1 : 1 - (t - look.fadeFrom) / (1 - look.fadeFrom);
  return {
    color,
    // It swells fast at first and more slowly later
    scale: look.small + (look.big - look.small) * Math.sqrt(t),
    alpha: look.alpha * fading,
    rise: look.rise * t * t,
  };
}
