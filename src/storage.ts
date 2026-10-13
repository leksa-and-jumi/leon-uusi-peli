/** Where the game remembers, in this browser only, how many golden weapons have been won. */
const GOLDEN_KEY = 'leon-uusi-peli.golden';

/**
 * How many golden weapons have been won on this device so far: a number from 0 to
 * `most`. Nothing is sent anywhere: it is kept in the browser's own storage, and a
 * browser that doesn't allow that just starts from 0 every time.
 */
export function loadGolden(most: number): number {
  try {
    const saved = Number(window.localStorage.getItem(GOLDEN_KEY));
    return Number.isFinite(saved) ? Math.min(Math.max(0, Math.floor(saved)), most) : 0;
  } catch {
    return 0;
  }
}

/** Remember how many golden weapons have been won. */
export function saveGolden(count: number): void {
  try {
    window.localStorage.setItem(GOLDEN_KEY, String(count));
  } catch {
    // No storage in this browser: the weapons are won again next time
  }
}
