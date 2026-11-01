import { DUEL, TOUCH_PAD } from '../config';
import type { PadKeys } from '../logic/pad';
import { KEY } from '../net/protocol';
import { touchScreen } from '../screen';
import './touch.css';

/** What the touch buttons need from the game. */
export interface PadGame {
  /** The seats steered on this device right now. */
  padSeats(): number[];
  /** Each seat's buttons. */
  readonly pads: readonly PadKeys[];
}

type PadKey = keyof typeof KEY;

/**
 * Buttons on the screen for steering a doll with fingers, on a phone or a tablet: they
 * come up while a doll is steered and go when it isn't. One player has the arrows on
 * the left and jumping and hitting on the right; two players on one phone each have
 * all their buttons in their own corner. A finger can slide from one button to the next.
 */
export class TouchPad {
  private readonly root = document.createElement('div');
  private shown = '';
  /** Which button each finger is on. */
  private readonly fingers = new Map<number, { pad: PadKeys; key: PadKey }>();

  constructor(private readonly game: () => PadGame | null) {
    // With a keyboard and a mouse, the keys are enough
    if (!touchScreen()) return;
    this.root.className = 'touch-pad';
    this.root.hidden = true;
    document.body.append(this.root);
    const lift = (event: PointerEvent): void => {
      this.lift(event.pointerId);
    };
    this.root.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.touch(event);
    });
    this.root.addEventListener('pointermove', (event) => {
      if (this.fingers.has(event.pointerId)) this.touch(event);
    });
    this.root.addEventListener('pointerup', lift);
    this.root.addEventListener('pointercancel', lift);
    this.root.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });
    window.setInterval(() => {
      this.update();
    }, TOUCH_PAD.lookMs);
  }

  /** Bring the buttons up for the seats that are steered now, or take them away. */
  private update(): void {
    const game = this.game();
    const seats = game?.padSeats() ?? [];
    const shown = seats.join(',');
    if (shown === this.shown) return;
    this.shown = shown;
    for (const [id] of this.fingers) this.lift(id);
    this.root.replaceChildren();
    this.root.hidden = !game || seats.length === 0;
    if (!game || seats.length === 0) return;
    for (const seat of seats) game.pads[seat]?.clear();
    const color = (seat: number): string => DUEL.colors[seat] ?? DUEL.colors[0];
    if (seats.length === 1) {
      const seat = seats[0] as number;
      this.root.append(
        this.group('left', seat, color(seat), ['left', 'right']),
        this.group('right', seat, color(seat), ['drop', 'jump', 'hit']),
      );
    } else {
      seats.forEach((seat, at) => {
        this.root.append(
          this.group(at === 0 ? 'left' : 'right', seat, color(seat), [
            'left',
            'right',
            'jump',
            'hit',
            'drop',
          ]),
        );
      });
    }
    this.root.classList.toggle('two', seats.length > 1);
  }

  /** A corner of buttons for one seat. */
  private group(side: 'left' | 'right', seat: number, color: string, keys: PadKey[]): HTMLElement {
    const group = document.createElement('div');
    group.className = `touch-group ${side}`;
    group.style.setProperty('--pad-color', color);
    for (const key of keys) {
      const button = document.createElement('div');
      button.className = `touch-key ${key}`;
      button.textContent = TOUCH_PAD.labels[key];
      button.dataset.key = key;
      button.dataset.seat = String(seat);
      group.append(button);
    }
    return group;
  }

  /** A finger is down, or has moved: whichever button is under it now is pressed. */
  private touch(event: PointerEvent): void {
    const under = document.elementFromPoint(event.clientX, event.clientY);
    const button = under instanceof HTMLElement ? under.closest<HTMLElement>('.touch-key') : null;
    const pad = this.game()?.pads[Number(button?.dataset.seat)];
    const key = button?.dataset.key as PadKey | undefined;
    const before = this.fingers.get(event.pointerId);
    if (before && before.pad === pad && before.key === key) return;
    this.lift(event.pointerId);
    if (!pad || !key || !button) return;
    pad.press(KEY[key]);
    button.classList.add('down');
    this.fingers.set(event.pointerId, { pad, key });
  }

  /** A finger has come off its button. */
  private lift(id: number): void {
    const finger = this.fingers.get(id);
    if (!finger) return;
    this.fingers.delete(id);
    // The button stays pressed while another finger is still on it
    const still = [...this.fingers.values()].some(
      (other) => other.pad === finger.pad && other.key === finger.key,
    );
    if (still) return;
    finger.pad.release(KEY[finger.key]);
    for (const button of this.root.querySelectorAll<HTMLElement>(`.touch-key.${finger.key}`)) {
      const pad = this.game()?.pads[Number(button.dataset.seat)];
      if (pad === finger.pad) button.classList.remove('down');
    }
  }
}
