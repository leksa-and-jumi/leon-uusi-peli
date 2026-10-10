import type { Box } from './ground';

/** The stretch of ground under something: from where to where it is held up. */
export interface Span {
  left: number;
  right: number;
}

/**
 * What something resting stands on: `'floor'`, the stretch of the solids right under
 * it (never wider than the thing itself), or `null` when nothing holds it up.
 */
export function supportSpan(
  box: Box,
  solids: readonly Box[],
  floorY: number,
  slack: number,
): Span | 'floor' | null {
  if (box.bottom >= floorY - slack) return 'floor';
  const under = solids.filter(
    (solid) =>
      Math.abs(solid.top - box.bottom) <= slack && solid.left < box.right && solid.right > box.left,
  );
  if (under.length === 0) return null;
  return {
    left: Math.max(box.left, Math.min(...under.map((solid) => solid.left))),
    right: Math.min(box.right, Math.max(...under.map((solid) => solid.right))),
  };
}

/**
 * Which way something tips: its heavy middle has to be over what holds it up.
 * -1 when the middle hangs out over the left end, 1 over the right end, 0 when it
 * is balanced. `give` is how far past the end the middle may be before it goes.
 */
export function leaning(middleX: number, span: Span, give: number): -1 | 0 | 1 {
  if (middleX < span.left - give) return -1;
  if (middleX > span.right + give) return 1;
  return 0;
}

/**
 * How far the middle of a piece may hang out past the end of what holds it up. A
 * long, flat piece (at least `longRatio` times wider than tall) lies steady: it may
 * hang out by `longShare` of its half width. Anything else only by `give`.
 */
export function overhang(
  halfWidth: number,
  height: number,
  give: number,
  longRatio: number,
  longShare: number,
): number {
  return halfWidth * 2 >= height * longRatio ? Math.max(give, halfWidth * longShare) : give;
}

/** Is it so much taller than it is wide that it falls over onto its side? */
export function isTall(halfWidth: number, height: number, ratio: number): boolean {
  return height >= halfWidth * 2 * ratio;
}

/** Where something is and how big it is, by the middle of its bottom edge. */
export interface Standing {
  x: number;
  halfWidth: number;
  height: number;
}

/**
 * Fall over onto one side, around the bottom corner on that side: what was the
 * height is now the width, and it lies beside where it stood.
 */
export function toppled(standing: Standing, direction: 1 | -1): Standing {
  const width = standing.halfWidth * 2;
  return {
    x: standing.x + direction * (standing.halfWidth + standing.height / 2),
    halfWidth: standing.height / 2,
    height: width,
  };
}

/**
 * Where to draw something that is falling over, and how far it has turned. It turns
 * around its bottom corner on the side it falls toward. `part` goes from 0 (still
 * standing at `fromX`) to 1 (flat on its side); `fromY` and `toY` are how high its
 * bottom is at the start and once it lies there. The drawing is anchored at the
 * middle of the bottom edge it had while standing.
 */
export function topplePose(
  fromX: number,
  fromY: number,
  toY: number,
  halfWidth: number,
  direction: 1 | -1,
  part: number,
): { x: number; y: number; rotation: number } {
  const done = Math.min(Math.max(part, 0), 1);
  const rotation = direction * done * (Math.PI / 2);
  const cornerX = fromX + direction * halfWidth;
  const groundY = fromY + (toY - fromY) * done;
  return {
    x: cornerX - direction * halfWidth * Math.cos(rotation),
    y: groundY - direction * halfWidth * Math.sin(rotation),
    rotation,
  };
}

/**
 * A tall piece falls over around its bottom corner at (`pivotX`, `pivotY`), toward
 * `direction`. How far over does it get before something solid stops it? The answer
 * is an angle: 0 is still standing, a quarter turn (π/2) is flat on its side.
 * Either its side comes down on the top corner of something, or its tip runs into
 * the side of something. `length` is how tall the piece stood. Things it would have
 * to turn back up to reach (closer to standing than `atLeast`) don't count: they sit
 * on top of it, not under it.
 */
export function leanAngle(
  pivotX: number,
  pivotY: number,
  direction: 1 | -1,
  length: number,
  solids: readonly Box[],
  atLeast = 0,
): number {
  let angle = Math.PI / 2;
  for (const solid of solids) {
    const rise = pivotY - solid.top;
    const near = direction > 0 ? solid.left : solid.right;
    const far = direction > 0 ? solid.right : solid.left;
    // Not higher than where the piece stands, or all of it behind the corner it turns on
    if (rise <= 1 || direction * (far - pivotX) <= 0) continue;
    const reach = Math.max(0, direction * (near - pivotX));
    let stopsAt: number | null = null;
    if (Math.hypot(reach, rise) <= length) {
      stopsAt = Math.atan2(reach, rise);
    } else if (reach <= length) {
      // The tip swings down in a circle: does it meet the near side of the thing?
      const tipY = pivotY - Math.sqrt(length * length - reach * reach);
      if (tipY >= solid.top && tipY <= solid.bottom) stopsAt = Math.asin(reach / length);
    }
    if (stopsAt !== null && stopsAt >= atLeast) angle = Math.min(angle, stopsAt);
  }
  return angle;
}

/**
 * The space a piece takes up when it has fallen `angle` of the way over (0 standing,
 * π/2 flat) around the corner at `pivotX`: where its middle is, and how wide and
 * tall the box around it is. `halfWidth` and `height` are its size standing up.
 */
export function leaningShape(
  pivotX: number,
  direction: 1 | -1,
  halfWidth: number,
  height: number,
  angle: number,
): Standing {
  const thick = halfWidth * 2;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const wide = height * sin + thick * cos;
  return {
    x: pivotX + (direction * (height * sin - thick * cos)) / 2,
    halfWidth: wide / 2,
    height: height * cos + thick * sin,
  };
}

/**
 * A leaning piece as a flight of steps, so that others can stand on its slope and
 * walk up it: boxes side by side from its low end to its high end, none more than
 * `stepHeight` higher than the one before (and never more than `most` of them).
 * Each reaches from the top side of the piece down to its underside.
 */
export function rampSteps(
  pivotX: number,
  pivotY: number,
  direction: 1 | -1,
  halfWidth: number,
  height: number,
  angle: number,
  stepHeight: number,
  most: number,
): Box[] {
  const thick = halfWidth * 2;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  // Measured from the corner it turns on, as if it had fallen to the right
  const low = -thick * cos;
  const high = height * sin;
  const rise = height * cos;
  // The top side is shorter than the whole piece is wide, so it climbs a bit faster
  const stretch = high === 0 ? 1 : (high - low) / high;
  const count = Math.min(most, Math.max(1, Math.ceil((rise / stepHeight) * stretch)));
  const steps: Box[] = [];
  for (let i = 0; i < count; i++) {
    const from = low + ((high - low) * i) / count;
    const to = low + ((high - low) * (i + 1)) / count;
    const middle = (from + to) / 2;
    // How far along the top side this step is, and how far along the underside
    const along = high === 0 ? 1 : Math.min(1, Math.max(0, (middle - low) / high));
    const under = middle <= 0 || high === 0 ? 0 : Math.min(1, middle / high);
    steps.push({
      left: pivotX + (direction > 0 ? from : -to),
      right: pivotX + (direction > 0 ? to : -from),
      top: pivotY - (thick * sin + rise * along),
      bottom: pivotY - rise * under,
    });
  }
  return steps;
}
