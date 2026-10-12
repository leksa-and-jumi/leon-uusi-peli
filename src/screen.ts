import { GAME_HEIGHT, GAME_WIDTH, SHARPNESS } from './config';
import { sharpness } from './logic/sharp';

/**
 * How many pixels the game draws for every pixel of its own size, worked out once
 * when it starts: more on a screen with many small pixels, or when the game is shown
 * big, so that everything is sharp. Positions in the game don't change with it.
 */
export const SHARP = ((): number => {
  if (typeof window === 'undefined') return 1;
  const shown = Math.min(window.innerWidth / GAME_WIDTH, window.innerHeight / GAME_HEIGHT);
  // A phone has fewer pixels to spare than a computer
  const most = navigator.maxTouchPoints > 0 ? SHARPNESS.mostOnTouch : SHARPNESS.most;
  return sharpness(window.devicePixelRatio, shown, most);
})();
