/** A person falling toward the floor. `y` is where the feet are. */
export interface Fall {
  y: number;
  /** Pixels per second, downward. */
  speed: number;
  landed: boolean;
}

/** Move a falling person forward by `deltaMs`. They stop when their feet reach the floor. */
export function fallStep(fall: Fall, gravity: number, floorY: number, deltaMs: number): Fall {
  if (fall.landed) return fall;
  const seconds = deltaMs / 1000;
  const speed = fall.speed + gravity * seconds;
  const y = fall.y + speed * seconds;
  if (y >= floorY) {
    return { y: floorY, speed: 0, landed: true };
  }
  return { y, speed, landed: false };
}
