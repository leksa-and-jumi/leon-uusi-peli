import { describe, expect, it } from 'vitest';
import { PadKeys } from './pad';

describe('PadKeys', () => {
  it('holds a button while the finger is on it', () => {
    const pad = new PadKeys();
    pad.press(1);
    expect(pad.read()).toEqual({ held: 1, pressed: 1 });
    expect(pad.read()).toEqual({ held: 1, pressed: 0 });
    pad.release(1);
    expect(pad.read()).toEqual({ held: 0, pressed: 0 });
  });

  it('counts a quick tap once, even when it is over before the game looks', () => {
    const pad = new PadKeys();
    pad.press(4);
    pad.release(4);
    expect(pad.read()).toEqual({ held: 4, pressed: 4 });
    expect(pad.read()).toEqual({ held: 0, pressed: 0 });
  });

  it('keeps the buttons apart', () => {
    const pad = new PadKeys();
    pad.press(1);
    pad.press(8);
    pad.release(1);
    expect(pad.read()).toEqual({ held: 9, pressed: 9 });
    expect(pad.read()).toEqual({ held: 8, pressed: 0 });
  });

  it('forgets everything when cleared', () => {
    const pad = new PadKeys();
    pad.press(2);
    pad.clear();
    expect(pad.read()).toEqual({ held: 0, pressed: 0 });
  });
});
