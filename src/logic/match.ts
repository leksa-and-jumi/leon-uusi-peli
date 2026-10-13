/** One of the two players of a battle. */
export type Seat = 0 | 1;

/** How a battle stands: how many rounds each player has won, and who won the last one. */
export interface Match {
  score: readonly [number, number];
  last: Seat | null;
}

export const NEW_MATCH: Match = { score: [0, 0], last: null };

/**
 * A player has won a round. Gives the match after that, and whether the player has
 * now won the whole match: `toWin` rounds.
 */
export function roundWon(
  match: Match,
  winner: Seat,
  toWin: number,
): { match: Match; won: boolean } {
  const [first, second] = match.score;
  const score: [number, number] = winner === 0 ? [first + 1, second] : [first, second + 1];
  return { match: { score, last: winner }, won: score[winner] >= toWin };
}

/** After a match is won the next one starts from nothing, but the winner is still the one who won last. */
export function nextMatch(match: Match): Match {
  return { score: [0, 0], last: match.last };
}

/**
 * Is it time for the cleaning lady? She comes after every `every`th round, whoever won
 * it, and only once for the same round: `cleanedAt` is the round she last came after.
 */
export function cleanerDue(roundsDone: number, every: number, cleanedAt: number): boolean {
  return roundsDone > 0 && every > 0 && roundsDone % every === 0 && cleanedAt !== roundsDone;
}

/**
 * The lives a doll has left, as a row of hearts. With more than `most` of them, one
 * heart and the number. With none left, nothing.
 */
export function heartsFor(lives: number, heart: string, most: number): string {
  const left = Math.max(0, Math.floor(lives));
  if (left === 0) return '';
  return left <= most ? heart.repeat(left) : `${heart}×${String(left)}`;
}

/** How many prizes are unlocked after one more match is won, when there are `total` of them. */
export function unlockNext(unlocked: number, total: number): number {
  return Math.min(Math.max(0, Math.floor(unlocked)) + 1, total);
}
