/**
 * How many pixels to draw for every pixel of the game, so that nothing looks blurry.
 * A screen can have several pixels for each of its own (`pixelRatio`), and the game is
 * shown bigger or smaller than it is (`shownScale`). Never less than 1, and never more
 * than `most`, since every extra pixel is more work to draw.
 */
export function sharpness(pixelRatio: number, shownScale: number, most: number): number {
  const wanted = pixelRatio * shownScale;
  if (!Number.isFinite(wanted)) return 1;
  // A tiny bit over a whole number isn't worth a whole step more
  return Math.min(Math.max(Math.ceil(wanted - 0.1), 1), most);
}
