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
    case 'knightArmor':
      return drawKnightArmor(g);
    case 'spaceHelmet':
      return drawSpaceHelmet(g);
    case 'rubberBoots':
      return drawBoot(g, ITEM_COLORS.rubberBoots);
    case 'magnetBoots':
      return drawBoot(g, ITEM_COLORS.magnetBoots);
    case 'jetpack':
      return drawJetpack(g);
  }
}

/**
 * A gas mask that covers the whole face: two straps around the head, a rubber face
 * piece, one wide glass to see through, a valve under it, and two big filters with a
 * yellow ring, one in front and one on the side.
 */
function drawGasMask(g: Graphics): Graphics {
  const c = ITEM_COLORS.gasMask;
  // The straps, around the back of the head
  g.fillStyle(c.dark);
  g.fillRoundedRect(-22, -9, 20, 3.4, 1.5);
  g.fillRoundedRect(-21, 1, 19, 3.4, 1.5);
  // The face piece
  g.fillEllipse(1, 0.5, 29, 27);
  g.fillStyle(c.rubber);
  g.fillEllipse(1, 0.5, 26, 24);
  g.fillStyle(c.light, 0.55);
  g.fillEllipse(-3, -7.5, 13, 5);
  // The glass
  g.fillStyle(c.dark);
  g.fillRoundedRect(-9.5, -9.5, 21, 11, 5);
  g.fillStyle(c.glass);
  g.fillRoundedRect(-8, -8, 18, 8, 3.8);
  g.fillStyle(0xffffff, 0.75);
  g.fillRoundedRect(-6, -7, 7, 1.8, 0.9);
  // The side filter, the front filter and the valve between them
  const filter = (x: number, y: number, radius: number): void => {
    g.fillStyle(c.dark);
    g.fillCircle(x, y, radius);
    g.fillStyle(c.ring);
    g.fillCircle(x, y, radius - 1.3);
    g.fillStyle(c.filter);
    g.fillCircle(x, y, radius - 2.6);
    g.fillStyle(c.dark);
    for (const row of [-1.6, 0, 1.6]) {
      g.fillRect(x - (radius - 3.6), y + row - 0.4, (radius - 3.6) * 2, 0.8);
    }
  };
  filter(-5, 8.5, 5.6);
  filter(10, 7.5, 7.2);
  g.fillStyle(c.dark);
  g.fillCircle(2.5, 5, 2.4);
  g.fillStyle(c.light);
  g.fillCircle(2.5, 5, 1.2);
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

/** A knight's breastplate: bright steel with a ridge down the middle, a round plate on each shoulder and a golden belt. */
function drawKnightArmor(g: Graphics): Graphics {
  const c = ITEM_COLORS.knightArmor;
  for (const x of [-15, 15]) {
    g.fillStyle(c.dark);
    g.fillCircle(x, -11, 7.6);
    g.fillStyle(c.fill);
    g.fillCircle(x, -11, 6.1);
  }
  g.fillStyle(c.dark);
  g.fillRoundedRect(-17, -15, 34, 31, 7);
  g.fillStyle(c.fill);
  g.fillRoundedRect(-15.5, -13.5, 31, 28, 6);
  g.fillStyle(c.shine, 0.55);
  g.fillRoundedRect(-12, -11, 6.5, 19, 3);
  g.fillStyle(c.dark, 0.55);
  g.fillRect(-0.7, -12.5, 1.4, 21);
  g.fillStyle(c.trim);
  g.fillRect(-15.5, 9, 31, 3.2);
  return g;
}

/**
 * A space helmet: a glass bubble around the whole head, with a white ring where it
 * sits on the shoulders. Its middle is where a helmet's is, so the bubble hangs below it.
 */
function drawSpaceHelmet(g: Graphics): Graphics {
  const c = ITEM_COLORS.spaceHelmet;
  const middle = 10;
  g.fillStyle(c.dark);
  g.fillRoundedRect(-14.5, middle + 12.5, 29, 6.5, 3);
  g.fillStyle(c.white);
  g.fillRoundedRect(-13.5, middle + 13.5, 27, 3.6, 1.8);
  g.fillStyle(c.glass, 0.28);
  g.fillCircle(0, middle, 19.5);
  g.lineStyle(2.2, c.white, 0.95);
  g.strokeCircle(0, middle, 19.5);
  g.lineStyle(2.6, 0xffffff, 0.75);
  g.beginPath();
  g.arc(0, middle, 15, Math.PI * 1.1, Math.PI * 1.45);
  g.strokePath();
  return g;
}

/** A jetpack: a steel tank with a red stripe around it, and a nozzle at the bottom where the flame comes out. */
function drawJetpack(g: Graphics): Graphics {
  const c = ITEM_COLORS.jetpack;
  g.fillStyle(c.dark);
  g.beginPath();
  g.moveTo(-4, 10);
  g.lineTo(4, 10);
  g.lineTo(6.5, 16);
  g.lineTo(-6.5, 16);
  g.closePath();
  g.fillPath();
  g.fillRoundedRect(-8.5, -16, 17, 28, 6);
  g.fillStyle(c.fill);
  g.fillRoundedRect(-7, -14.5, 14, 25, 5);
  g.fillStyle(c.shine, 0.7);
  g.fillRoundedRect(-5.2, -12.5, 3, 20, 1.5);
  g.fillStyle(c.stripe);
  g.fillRect(-7, -4, 14, 4);
  return g;
}

/**
 * One boot, in these colors: a tall leg, a round toe and a sole. Yellow rubber with a
 * dark sole, or steel with a red magnet for a sole. A doll wears one on each foot.
 */
function drawBoot(
  g: Graphics,
  c: { fill: number; dark: number; sole: number; shine: number },
): Graphics {
  g.fillStyle(c.dark);
  g.fillRoundedRect(-9, -11, 14, 16, 3);
  g.fillRoundedRect(-9.5, 0, 21, 10.5, 4);
  g.fillStyle(c.fill);
  g.fillRoundedRect(-7.8, -9.8, 11.6, 15, 2.5);
  g.fillRoundedRect(-8.3, 1.2, 18.6, 7, 3.2);
  g.fillStyle(c.shine, 0.8);
  g.fillRoundedRect(-6.5, -8.5, 2.6, 11, 1.3);
  g.fillStyle(c.sole);
  g.fillRoundedRect(-9.5, 8, 21, 2.6, 1.3);
  g.fillStyle(c.dark);
  g.fillRect(-9, -11, 14, 2);
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
