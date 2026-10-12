import type Phaser from 'phaser';
import { BLOCKS, FIRE, LASER_TOWER, SAW, TESLA, type BlockDef, type TrapKind } from '../config';
import { shade } from '../logic/color';

type Graphics = Phaser.GameObjects.Graphics;

/**
 * Draws a trap with code. The middle of its bottom edge is at (0, 0). In the area
 * the parts that move (a saw blade, flames) are pictures of their own; with `whole`
 * they are drawn in too, standing still, for the menu.
 */
export function drawTrap(g: Graphics, kind: TrapKind, whole: boolean): Graphics {
  const def = BLOCKS[kind];
  const { blade, flames } = def.hazard ?? {};
  switch (kind) {
    case 'spikes':
      return drawSpikes(g, def);
    case 'saw':
      if (whole && blade) {
        g.save();
        g.translateCanvas(0, -blade.up);
        drawSawBlade(g, blade.radius);
        g.restore();
      }
      return drawSawBase(g, def);
    case 'burner':
      if (whole && flames) drawFlames(g, 0, def.halfWidth, -def.height, flames.height);
      return drawBurner(g, def);
    case 'tesla':
      return drawTesla(g, def);
    case 'laserTower':
      return drawLaserTower(g, def);
    case 'mine':
      return drawMine(g, def);
    case 'cactus':
      return drawCactus(g, def);
  }
}

/** A plate with a row of sharp steel spikes: bright on one side, dark on the other. */
function drawSpikes(g: Graphics, def: BlockDef): Graphics {
  const { halfWidth, height, colors } = def;
  const plate = 5;
  const count = 7;
  const each = (halfWidth * 2 - 4) / count;
  for (let i = 0; i < count; i++) {
    const left = -halfWidth + 2 + i * each;
    const tip = left + each / 2;
    g.fillStyle(colors.dark);
    g.fillTriangle(left, -plate + 1, left + each, -plate + 1, tip, -height);
    g.fillStyle(colors.fill);
    g.fillTriangle(left + 1.2, -plate + 1, left + each - 1.2, -plate + 1, tip, -height + 2.5);
    g.fillStyle(colors.light);
    g.fillTriangle(left + 1.2, -plate + 1, tip, -plate + 1, tip, -height + 2.5);
  }
  g.fillStyle(colors.dark);
  g.fillRoundedRect(-halfWidth, -plate, halfWidth * 2, plate, 1.5);
  g.fillStyle(colors.detail);
  g.fillRect(-halfWidth + 1.5, -plate + 1.2, halfWidth * 2 - 3, 1.6);
  return g;
}

/** The box a saw blade turns in: dark metal, a slot for the blade, and warning stripes. */
function drawSawBase(g: Graphics, def: BlockDef): Graphics {
  const { halfWidth, height, colors } = def;
  g.fillStyle(colors.dark);
  g.fillRoundedRect(-halfWidth, -height, halfWidth * 2, height, 3);
  g.fillStyle(colors.fill);
  g.fillRoundedRect(-halfWidth + 1.5, -height + 1.5, halfWidth * 2 - 3, height - 3, 2);
  g.fillStyle(colors.light, 0.7);
  g.fillRect(-halfWidth + 3, -height + 2.5, halfWidth * 2 - 6, 1.5);
  // Yellow and black stripes along the front
  for (let x = -halfWidth + 4; x < halfWidth - 8; x += 12) {
    g.fillStyle(colors.detail);
    g.fillRect(x, -7, 6, 4);
    g.fillStyle(colors.dark);
    g.fillRect(x + 6, -7, 6, 4);
  }
  g.fillStyle(colors.dark);
  g.fillRect(-halfWidth + 6, -height, halfWidth * 2 - 12, 2);
  return g;
}

/** A round saw blade around (0, 0), with teeth all around and marks that show it turning. */
export function drawSawBlade(g: Graphics, radius: number): Graphics {
  const step = (Math.PI * 2) / SAW.teeth;
  const inner = radius - 5;
  g.fillStyle(SAW.dark);
  for (let i = 0; i < SAW.teeth; i++) {
    const from = i * step;
    const to = from + step * 0.7;
    g.fillTriangle(
      Math.cos(from) * inner,
      Math.sin(from) * inner,
      Math.cos(to) * inner,
      Math.sin(to) * inner,
      Math.cos(from + step * 0.15) * radius,
      Math.sin(from + step * 0.15) * radius,
    );
  }
  g.fillCircle(0, 0, inner + 1);
  g.fillStyle(SAW.steel);
  g.fillCircle(0, 0, inner - 0.5);
  g.fillStyle(SAW.mark);
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2;
    g.fillCircle(Math.cos(angle) * radius * 0.52, Math.sin(angle) * radius * 0.52, 3);
  }
  g.fillStyle(SAW.hub);
  g.fillCircle(0, 0, 5);
  return g;
}

/** A low metal box with a grill on top, glowing hot. */
function drawBurner(g: Graphics, def: BlockDef): Graphics {
  const { halfWidth, height, colors } = def;
  g.fillStyle(colors.dark);
  g.fillRoundedRect(-halfWidth, -height, halfWidth * 2, height, 2.5);
  g.fillStyle(colors.fill);
  g.fillRoundedRect(-halfWidth + 1.5, -height + 3, halfWidth * 2 - 3, height - 4.5, 2);
  g.fillStyle(colors.detail);
  g.fillRect(-halfWidth + 3, -height + 1, halfWidth * 2 - 6, 2);
  g.fillStyle(colors.dark);
  for (let x = -halfWidth + 6; x < halfWidth - 4; x += 7) {
    g.fillRect(x, -height + 5, 3, height - 8);
  }
  g.fillStyle(colors.light, 0.6);
  g.fillRect(-halfWidth + 3, -2.5, halfWidth * 2 - 6, 1.2);
  return g;
}

/**
 * Flames standing on a line at height `top`, as they look at this moment: a row of
 * tongues that grow, shrink and lean. It draws on top of what is there already.
 */
export function drawFlames(
  g: Graphics,
  timeMs: number,
  halfWidth: number,
  top: number,
  height: number,
): Graphics {
  for (let i = 0; i < FIRE.tongues; i++) {
    const x = -halfWidth + 6 + (i / (FIRE.tongues - 1)) * (halfWidth * 2 - 12);
    const flicker = 0.65 + 0.35 * Math.sin(timeMs / 90 + i * 1.9);
    const tall = height * flicker * (i % 2 === 0 ? 1 : 0.72);
    const lean = 3.5 * Math.sin(timeMs / 140 + i);
    g.fillStyle(FIRE.outer, 0.9);
    g.fillTriangle(x - 7, top, x + 7, top, x + lean, top - tall);
    g.fillStyle(FIRE.mid, 0.95);
    g.fillTriangle(x - 4.5, top, x + 4.5, top, x + lean * 0.7, top - tall * 0.66);
    g.fillStyle(FIRE.core);
    g.fillTriangle(x - 2.2, top, x + 2.2, top, x + lean * 0.4, top - tall * 0.36);
  }
  return g;
}

/** A laser tower: a wide foot, a steel post with dark bands, and a head with one red eye. */
function drawLaserTower(g: Graphics, def: BlockDef): Graphics {
  const { halfWidth, height, colors } = def;
  const { eyeDown, eyeRadius, headHeight } = LASER_TOWER;
  const eyeY = -height + eyeDown;
  const neck = -height + headHeight - 2;
  // Foot
  g.fillStyle(colors.dark);
  g.fillRoundedRect(-halfWidth, -8, halfWidth * 2, 8, 2.5);
  g.fillStyle(colors.fill);
  g.fillRoundedRect(-halfWidth + 1.5, -6.5, halfWidth * 2 - 3, 3, 1.5);
  // Post, with a shine down one side and dark bands around it
  g.fillStyle(colors.dark);
  g.fillRect(-5, neck, 10, -8 - neck);
  g.fillStyle(colors.fill);
  g.fillRect(-3.5, neck, 7, -8 - neck);
  g.fillStyle(colors.light);
  g.fillRect(-3.5, neck, 2, -8 - neck);
  g.fillStyle(colors.dark);
  for (let y = -19; y > neck + 5; y -= 11) {
    g.fillRect(-5, y, 10, 2.5);
  }
  // Head
  g.fillStyle(colors.dark);
  g.fillRoundedRect(-halfWidth + 1, -height, halfWidth * 2 - 2, headHeight, 6);
  g.fillStyle(colors.fill);
  g.fillRoundedRect(-halfWidth + 2.5, -height + 1.5, halfWidth * 2 - 5, headHeight - 3, 5);
  g.fillStyle(colors.light, 0.7);
  g.fillRoundedRect(-halfWidth + 5, -height + 3, halfWidth * 2 - 10, 2.5, 1.2);
  // The eye: a red lens in a dark ring
  g.fillStyle(colors.dark);
  g.fillCircle(0, eyeY, eyeRadius + 1.8);
  g.fillStyle(colors.detail);
  g.fillCircle(0, eyeY, eyeRadius);
  g.fillStyle(0xffffff, 0.9);
  g.fillCircle(-1.8, eyeY - 1.8, 1.8);
  return g;
}

/** A lightning coil: a wide foot, a post wound with copper wire, and a shiny ball on top. */
function drawTesla(g: Graphics, def: BlockDef): Graphics {
  const { halfWidth, height, colors } = def;
  const ballY = -height + TESLA.ballDown;
  // Foot
  g.fillStyle(colors.dark);
  g.fillRoundedRect(-halfWidth, -9, halfWidth * 2, 9, 2.5);
  g.fillStyle(shade(colors.fill, -0.25));
  g.fillRoundedRect(-halfWidth + 1.5, -7.5, halfWidth * 2 - 3, 6, 2);
  // Post, and the wire wound around it
  g.fillStyle(colors.dark);
  g.fillRect(-6, ballY, 12, -9 - ballY);
  g.fillStyle(colors.fill);
  g.fillRect(-4.5, ballY, 9, -9 - ballY);
  g.lineStyle(2, shade(colors.fill, 0.35));
  for (let y = -14; y > ballY + TESLA.ballRadius + 2; y -= 6) {
    g.lineBetween(-6, y, 6, y - 3);
  }
  // The ball
  g.fillStyle(colors.dark);
  g.fillCircle(0, ballY, TESLA.ballRadius);
  g.fillStyle(colors.light);
  g.fillCircle(0, ballY, TESLA.ballRadius - 1.5);
  g.fillStyle(colors.detail, 0.55);
  g.fillCircle(1, ballY + 1, TESLA.ballRadius - 3.5);
  g.fillStyle(0xffffff, 0.9);
  g.fillCircle(-2.5, ballY - 3, 2);
  return g;
}

/** A cactus in a clay pot: a thick green trunk with two arms, spines all over and a flower on top. */
function drawCactus(g: Graphics, def: BlockDef): Graphics {
  const { height, colors } = def;
  const pot = 16;
  /** A rounded green column from (x, top) down to `bottom`. */
  const column = (x: number, top: number, bottom: number, wide: number): void => {
    g.fillStyle(colors.dark);
    g.fillRoundedRect(x - wide / 2, top, wide, bottom - top, wide / 2);
    g.fillStyle(colors.fill);
    g.fillRoundedRect(x - wide / 2 + 1.5, top + 1.5, wide - 3, bottom - top - 3, wide / 2 - 1.5);
    g.fillStyle(colors.light, 0.6);
    g.fillRoundedRect(x - wide / 2 + 3, top + 4, 2.5, bottom - top - 10, 1.2);
  };
  // Arms, with the bends that join them to the trunk
  column(-13, -height + 26, -pot - 12, 9);
  column(13, -height + 18, -pot - 20, 9);
  g.fillStyle(colors.dark);
  g.fillRect(-13, -pot - 18, 10, 7);
  g.fillRect(4, -pot - 26, 10, 7);
  column(0, -height + 6, -pot + 2, 15);
  // Spines
  g.lineStyle(1, 0xffffff, 0.9);
  for (let y = -height + 14; y < -pot - 2; y += 9) {
    g.lineBetween(-7.5, y, -11, y - 2);
    g.lineBetween(7.5, y + 4, 11, y + 2);
  }
  g.fillStyle(0xff80ab);
  g.fillCircle(0, -height + 5, 4.5);
  g.fillStyle(0xffeb3b);
  g.fillCircle(0, -height + 5, 1.8);
  // The pot
  g.fillStyle(shade(colors.detail, -0.3));
  g.fillRoundedRect(-13, -pot, 26, 5, 2);
  g.beginPath();
  g.moveTo(-11, -pot + 4);
  g.lineTo(11, -pot + 4);
  g.lineTo(8, 0);
  g.lineTo(-8, 0);
  g.closePath();
  g.fillPath();
  g.fillStyle(colors.detail);
  g.fillRoundedRect(-12, -pot + 0.8, 24, 3, 1.4);
  g.fillRect(-9.5, -pot + 5, 19, pot - 6.5);
  return g;
}

/** A land mine: a flat green disc with a red button on top. */
function drawMine(g: Graphics, def: BlockDef): Graphics {
  const { halfWidth, height, colors } = def;
  g.fillStyle(colors.detail);
  g.fillRoundedRect(-3.5, -height, 7, 4, 1.5);
  g.fillStyle(colors.dark);
  g.fillRoundedRect(-halfWidth, -height + 2, halfWidth * 2, height - 2, 3);
  g.fillStyle(colors.fill);
  g.fillRoundedRect(-halfWidth + 1.5, -height + 3.5, halfWidth * 2 - 3, height - 5, 2);
  g.fillStyle(colors.light, 0.8);
  g.fillRect(-halfWidth + 4, -height + 4.2, halfWidth * 2 - 8, 1.2);
  g.fillStyle(colors.dark);
  for (const x of [-9, 0, 9]) {
    g.fillCircle(x, -2.5, 1);
  }
  return g;
}
