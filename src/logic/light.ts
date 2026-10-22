/** The cone of light from a flashlight: where it starts, the way it points, how far and how wide. */
export interface Beam {
  x: number;
  y: number;
  /** The way it points, as an angle (0 is to the right, a quarter turn is down). */
  angle: number;
  length: number;
  /** How far to each side of the middle of the cone it reaches, as an angle. */
  spread: number;
}

/** How far apart two angles are, the short way round (from 0 to half a turn). */
export function angleBetween(one: number, other: number): number {
  const turn = Math.PI * 2;
  const apart = (((one - other) % turn) + turn) % turn;
  return Math.min(apart, turn - apart);
}

/** Is this spot in the light of the beam? */
export function inBeam(beam: Beam, x: number, y: number): boolean {
  const dx = x - beam.x;
  const dy = y - beam.y;
  const far = Math.hypot(dx, dy);
  if (far === 0) return true;
  if (far > beam.length) return false;
  return angleBetween(Math.atan2(dy, dx), beam.angle) <= beam.spread;
}
