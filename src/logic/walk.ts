/** Which way a person looks: 1 = right, -1 = left. */
export type Facing = 1 | -1;

export interface Walker {
  x: number;
  facing: Facing;
}

/** Walk the way you face. At the edge of the area, turn around. */
export function walkStep(
  walker: Walker,
  speed: number,
  deltaMs: number,
  left: number,
  right: number,
): Walker {
  const x = walker.x + walker.facing * speed * (deltaMs / 1000);
  if (x >= right) return { x: right, facing: -1 };
  if (x <= left) return { x: left, facing: 1 };
  return { x, facing: walker.facing };
}
