import type Phaser from 'phaser';
import { ITEM_COLORS, type GearKind } from '../config';

type Graphics = Phaser.GameObjects.Graphics;

/**
 * Draws a piece of gear with code, facing right, with its middle at (0, 0): the same
 * picture is used on a doll and for the piece lying around.
 */
export function drawGear(g: Graphics, kind: GearKind): Graphics {
  switch (kind) {
    case 'gasMask':
      return drawGasMask(g);
    case 'armyHelmet':
      return drawHelmet(g);
    case 'vest':
      return drawVest(g);
    case 'shield':
      return drawShield(g);
  }
}

/** A gas mask: a rubber face piece with a strap, two round glass eyes and a filter in front. */
function drawGasMask(g: Graphics): Graphics {
  const c = ITEM_COLORS.gasMask;
  g.fillStyle(c.dark);
  g.fillRect(-19, -5, 17, 3.2);
  g.fillEllipse(1, 1, 24, 22);
  g.fillStyle(c.rubber);
  g.fillEllipse(1, 1, 21, 19);
  for (const x of [-4.5, 4.5]) {
    g.fillStyle(c.dark);
    g.fillCircle(x, -3.5, 4.7);
    g.fillStyle(c.glass);
    g.fillCircle(x, -3.5, 3.4);
    g.fillStyle(0xffffff, 0.85);
    g.fillCircle(x - 1, -4.6, 1.1);
  }
  g.fillStyle(c.dark);
  g.fillCircle(8, 6.5, 6);
  g.fillStyle(c.filter);
  g.fillCircle(8, 6.5, 4.6);
  g.fillStyle(c.dark);
  g.fillCircle(8, 6.5, 1.5);
  g.fillRect(4.4, 6, 7.2, 1);
  return g;
}

/** An army helmet: a green dome with a shine on it, and a rim around its lower edge. */
function drawHelmet(g: Graphics): Graphics {
  const c = ITEM_COLORS.armyHelmet;
  const dome = (radius: number, color: number): void => {
    g.fillStyle(color);
    g.beginPath();
    g.arc(0, 5, radius, Math.PI, 0);
    g.closePath();
    g.fillPath();
  };
  dome(18, c.dark);
  dome(16.4, c.fill);
  g.fillStyle(c.shine, 0.45);
  g.fillEllipse(-5, -5, 13, 5.5);
  g.fillStyle(c.dark);
  g.fillRoundedRect(-20, 4, 41, 4.6, 2.2);
  g.fillStyle(c.fill);
  g.fillRoundedRect(-19, 4.9, 39, 1.8, 0.9);
  return g;
}

/** An armored vest: dark, with two steel plates on the front and a strap over each shoulder. */
function drawVest(g: Graphics): Graphics {
  const c = ITEM_COLORS.vest;
  g.fillStyle(c.dark);
  g.fillRect(-13, -17, 6, 5);
  g.fillRect(7, -17, 6, 5);
  g.fillRoundedRect(-17, -14.5, 34, 29.5, 6);
  g.fillStyle(c.fill);
  g.fillRoundedRect(-15.5, -13, 31, 26.5, 5);
  for (const y of [-9.5, 1.5]) {
    g.fillStyle(c.plate);
    g.fillRoundedRect(-11.5, y, 23, 9, 2.5);
    g.fillStyle(c.shine, 0.4);
    g.fillRoundedRect(-10, y + 1.2, 20, 2, 1);
  }
  return g;
}

/** A shield: steel around the edge, blue inside, with a golden cross and a boss in the middle. */
function drawShield(g: Graphics): Graphics {
  const c = ITEM_COLORS.shield;
  const kite = (color: number, inset: number): void => {
    const side = 14 - inset;
    g.fillStyle(color);
    g.beginPath();
    g.moveTo(-side, -19 + inset);
    g.lineTo(side, -19 + inset);
    g.lineTo(side, 4);
    g.lineTo(0, 21 - inset * 1.4);
    g.lineTo(-side, 4);
    g.closePath();
    g.fillPath();
  };
  kite(c.dark, 0);
  kite(c.rim, 1.2);
  kite(c.fill, 3.4);
  g.fillStyle(c.cross);
  g.fillRect(-1.8, -15, 3.6, 30);
  g.fillRect(-10.4, -6.8, 20.8, 3.6);
  g.fillStyle(c.dark);
  g.fillCircle(0, -5, 4.4);
  g.fillStyle(c.rim);
  g.fillCircle(0, -5, 3.2);
  g.fillStyle(0xffffff, 0.8);
  g.fillCircle(-1, -6, 1);
  return g;
}
