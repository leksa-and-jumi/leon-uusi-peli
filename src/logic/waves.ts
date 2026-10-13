/** How the waves of enemies in a team game grow. */
export interface WaveRules {
  /** How many enemies the first wave has, and after how many waves there is one more. */
  first: number;
  everyWaves: number;
  /** Never more than this many at once. */
  most: number;
  /** How many kinds of enemy the first wave is picked from; every wave adds one more kind. */
  kindsFirst: number;
}

/** How many enemies drop in for this wave (the first wave is wave 1). */
export function waveSize(wave: number, rules: WaveRules): number {
  const extra = Math.floor(Math.max(0, wave - 1) / Math.max(1, rules.everyWaves));
  return Math.min(rules.first + extra, rules.most);
}

/** How many kinds of enemy this wave is picked from, out of `total` kinds: the easy ones first. */
export function waveKinds(wave: number, rules: WaveRules, total: number): number {
  return Math.min(Math.max(1, rules.kindsFirst + Math.max(0, wave - 1)), total);
}
