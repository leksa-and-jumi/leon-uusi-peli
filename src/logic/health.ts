/** Take a hit: lose `damage` lives, but never go below zero. */
export function takeHit(lives: number, damage: number): number {
  if (!Number.isFinite(damage) || damage < 0) {
    throw new RangeError(`damage must be a non-negative number, got ${damage}`);
  }
  return Math.max(0, lives - damage);
}

/** No lives left? */
export function isDead(lives: number): boolean {
  return lives <= 0;
}
