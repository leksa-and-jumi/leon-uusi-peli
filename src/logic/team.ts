/** What decides which side a doll is on: the color it is made of. */
export interface TeamColor {
  body: number;
}

/** Dolls of the same color are on the same side, and don't fight each other. */
export function sameTeam(a: TeamColor, b: TeamColor): boolean {
  return a.body === b.body;
}
