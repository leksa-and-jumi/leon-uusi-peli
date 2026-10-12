import type { Box } from './ground';

/** How shadows look. */
export interface ShadowLook {
  /** How dark the shadow of something that stands on the floor is (0 to 1). */
  alpha: number;
  /** This high above the floor, a thing casts no shadow any more. */
  fadeHeight: number;
  /** The shadow of something high up is this much wider than that of the same thing on the floor. */
  grow: number;
}

/** A shadow on the floor: where its middle is, how wide it is, and how dark. */
export interface Shadow {
  x: number;
  halfWidth: number;
  alpha: number;
}

/**
 * The shadow something casts on the floor straight under it. The higher up it is, the
 * wider and the fainter its shadow, and from `fadeHeight` up there is none (`null`).
 */
export function shadowOf(box: Box, floorY: number, look: ShadowLook): Shadow | null {
  const up = Math.max(0, floorY - box.bottom);
  const near = 1 - up / look.fadeHeight;
  if (near <= 0 || box.right <= box.left) return null;
  return {
    x: (box.left + box.right) / 2,
    halfWidth: ((box.right - box.left) / 2) * (1 + look.grow * (1 - near)),
    alpha: look.alpha * near,
  };
}
