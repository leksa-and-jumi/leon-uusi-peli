/**
 * The buttons on a touch screen for one player: which are held down, and which were
 * pressed since they were last read. A quick tap that is over before the game looks
 * still counts once, so that no jump is lost.
 */
export class PadKeys {
  private down = 0;
  private pressed = 0;

  /** A finger is on this button (one of the `KEY` bits). */
  press(key: number): void {
    this.down |= key;
    this.pressed |= key;
  }

  /** The finger has left this button. */
  release(key: number): void {
    this.down &= ~key;
  }

  /** Every finger is off, and nothing that was pressed counts any more. */
  clear(): void {
    this.down = 0;
    this.pressed = 0;
  }

  /** What is held now (or was, since last time), and what was pressed since last time. */
  read(): { held: number; pressed: number } {
    const read = { held: this.down | this.pressed, pressed: this.pressed };
    this.pressed = 0;
    return read;
  }
}
