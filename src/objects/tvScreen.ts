import type Phaser from 'phaser';
import { TV } from '../config';
import { pingPong, stickFight, tvMoment } from '../logic/tv';

type Graphics = Phaser.GameObjects.Graphics;

/**
 * Draws what is on the TV right now, onto the glass of its screen: a cartoon, a
 * ball game or dancing music bars, with a blink of snow whenever the program changes.
 */
export function drawTvProgram(g: Graphics, timeMs: number): void {
  const moment = tvMoment(timeMs, TV.channels, TV.channelMs, TV.snowMs);
  g.clear();
  if (moment.snow) {
    drawSnow(g);
  } else if (moment.channel === 0) {
    drawCartoon(g, moment.sinceMs);
  } else if (moment.channel === 1) {
    drawBallGame(g, moment.sinceMs);
  } else if (moment.channel === 2) {
    drawMusic(g, moment.sinceMs);
  } else {
    drawStickFight(g, moment.sinceMs);
  }
  // The glass shines a little, whatever is on
  const { x, y } = TV.screen;
  g.fillStyle(0xffffff, 0.22);
  g.fillTriangle(x + 3, y + 2, x + 15, y + 2, x + 3, y + 16);
}

/**
 * A TV that lightning has hit: stripes of wild colors and snow that jump about, torn
 * bits shoved sideways, and the whole glass flashing white. Nothing on it makes sense.
 */
export function drawTvHaywire(g: Graphics, timeMs: number): void {
  const { x, y, width, height } = TV.screen;
  const pick = (colors: readonly number[]): number =>
    colors[Math.floor(Math.random() * colors.length)] ?? 0;
  const stripe = 4;
  g.clear();
  for (let row = 0; row * stripe < height; row++) {
    const tall = Math.min(stripe, height - row * stripe);
    g.fillStyle(pick(row % 2 === 0 ? TV.haywire : TV.snow));
    g.fillRect(x, y + row * stripe, width, tall);
    const torn = Math.random() * (width - 9);
    g.fillStyle(pick(TV.haywire));
    g.fillRect(x + torn, y + row * stripe, 9, tall);
  }
  if (Math.floor(timeMs / 90) % 3 === 0) {
    g.fillStyle(0xffffff, 0.55);
    g.fillRect(x, y, width, height);
  }
}

/** A TV that is broken for good: dark glass, with only a dull shine left on it. */
export function drawTvDead(g: Graphics): void {
  const { x, y, width, height } = TV.screen;
  g.clear();
  g.fillStyle(TV.dead.glass);
  g.fillRect(x, y, width, height);
  g.fillStyle(TV.dead.shine, 0.6);
  g.fillTriangle(x + 3, y + 2, x + 15, y + 2, x + 3, y + 16);
}

/** Black, gray and white dots all over: no program for a moment. */
function drawSnow(g: Graphics): void {
  const { x, y, width, height } = TV.screen;
  const dot = 4;
  for (let row = 0; row * dot < height; row++) {
    for (let column = 0; column * dot < width; column++) {
      const shade = TV.snow[Math.floor(Math.random() * TV.snow.length)] ?? 0;
      const w = Math.min(dot, width - column * dot);
      const h = Math.min(dot, height - row * dot);
      g.fillStyle(shade);
      g.fillRect(x + column * dot, y + row * dot, w, h);
    }
  }
}

/** A little figure walking across a sunny field, under a drifting cloud. */
function drawCartoon(g: Graphics, sinceMs: number): void {
  const { x, y, width, height } = TV.screen;
  const c = TV.cartoon;
  const ground = y + height - 7;
  g.fillStyle(c.sky);
  g.fillRect(x, y, width, height);
  g.fillStyle(c.sun);
  g.fillCircle(x + width - 7, y + 7, 4);
  g.fillStyle(c.cloud);
  const cloudX = x + 5 + pingPong(sinceMs * 0.004, width - 18);
  g.fillEllipse(cloudX + 4, y + 8, 12, 5);
  g.fillEllipse(cloudX + 8, y + 6, 8, 5);
  g.fillStyle(c.grass);
  g.fillRect(x, ground, width, 7);

  // The walker: a head, a body and two legs that swap with every step
  const walkerX = x + 3 + ((sinceMs * 0.011) % (width - 6));
  const step = Math.floor(sinceMs / 160) % 2 === 0 ? 2.2 : -2.2;
  g.fillStyle(c.doll);
  g.fillCircle(walkerX, ground - 11, 2.2);
  g.lineStyle(1.4, c.doll);
  g.lineBetween(walkerX, ground - 9, walkerX, ground - 4);
  g.lineBetween(walkerX, ground - 4, walkerX + step, ground);
  g.lineBetween(walkerX, ground - 4, walkerX - step, ground);
  g.lineBetween(walkerX - 2.5, ground - 6.5, walkerX + 2.5, ground - 7.5);
}

/** A ball bouncing between two paddles that follow it. */
function drawBallGame(g: Graphics, sinceMs: number): void {
  const { x, y, width, height } = TV.screen;
  const c = TV.pong;
  g.fillStyle(c.field);
  g.fillRect(x, y, width, height);
  g.fillStyle(c.line);
  for (let dash = 1; dash < height; dash += 5) {
    g.fillRect(x + width / 2 - 0.5, y + dash, 1, 3);
  }
  const ballX = x + 4 + pingPong(sinceMs * 0.03, width - 9);
  const ballY = y + 2 + pingPong(sinceMs * 0.019, height - 5);
  const paddle = 8;
  const paddleY = Math.min(Math.max(ballY - paddle / 2, y + 1), y + height - paddle - 1);
  g.fillStyle(c.paddle);
  g.fillRect(x + 1.5, paddleY, 1.8, paddle);
  g.fillRect(x + width - 3.3, paddleY, 1.8, paddle);
  g.fillStyle(c.ball);
  g.fillRect(ballX, ballY, 2, 2);
}

/** Colored bars that jump up and down, each to its own beat. */
function drawMusic(g: Graphics, sinceMs: number): void {
  const { x, y, width, height } = TV.screen;
  const c = TV.music;
  g.fillStyle(c.back);
  g.fillRect(x, y, width, height);
  const gap = 1.5;
  const barWidth = (width - 4 - gap * (c.bars.length - 1)) / c.bars.length;
  c.bars.forEach((color, index) => {
    const tall = 4 + pingPong(sinceMs * (0.012 + index * 0.0031) + index * 7, height - 8);
    g.fillStyle(color);
    g.fillRect(x + 2 + index * (barWidth + gap), y + height - 2 - tall, barWidth, tall);
  });
}

/**
 * A show from Leo's first game: night in the old ruins. A black stick figure with a
 * pale edge walks in with its gun and shoots the white stick figure that comes at it.
 */
function drawStickFight(g: Graphics, sinceMs: number): void {
  const { x, y, width, height } = TV.screen;
  const c = TV.stick;
  const ground = y + height - 5;
  g.fillStyle(c.sky);
  g.fillRect(x, y, width, height);
  g.fillStyle(c.moon);
  g.fillCircle(x + 14, y + 5.5, 3);
  // Broken columns of the ruins, far away
  g.fillStyle(c.ruin);
  g.fillRect(x + 5, ground - 13, 4, 13);
  g.fillRect(x + 3.5, ground - 14.5, 7, 2);
  g.fillRect(x + 18, ground - 8, 4, 8);
  g.fillRect(x + 28, ground - 16, 4, 16);
  g.fillRect(x + 26.5, ground - 17.5, 7, 2);
  g.fillStyle(c.ground);
  g.fillRect(x, ground, width, 5);

  const fight = stickFight(sinceMs, c.roundMs);
  const step = fight.stride < 0.5 ? 1.8 : -1.8;
  /** A stick figure standing on the ground at `atX`, looking the way `facing` says. */
  const figure = (atX: number, facing: 1 | -1, color: number, edge: number | null): void => {
    const widths: [number, number][] =
      edge === null
        ? [[1.3, color]]
        : [
            [2.4, edge],
            [1.2, color],
          ];
    for (const [thick, shade] of widths) {
      g.lineStyle(thick, shade);
      g.lineBetween(atX, ground - 9, atX, ground - 4);
      g.lineBetween(atX, ground - 4, atX + step, ground);
      g.lineBetween(atX, ground - 4, atX - step, ground);
      // The arm with the gun points ahead
      g.lineBetween(atX, ground - 7.5, atX + facing * 3.5, ground - 7.5);
      g.fillStyle(shade);
      g.fillCircle(atX, ground - 10.5, thick > 2 ? 2.4 : 1.8);
    }
  };

  const heroX = x + fight.heroX * width;
  const enemyX = x + fight.enemyX * width;
  if (fight.fallen < 1) {
    // The white one tips over backward when it is hit
    const lean = fight.fallen * (Math.PI / 2);
    const headX = enemyX + Math.sin(lean) * 10;
    const headY = ground - Math.cos(lean) * 10;
    g.lineStyle(1.3, c.enemy);
    g.lineBetween(enemyX, ground, headX, headY);
    if (fight.fallen === 0) {
      g.lineBetween(enemyX, ground - 4, enemyX + step, ground);
      g.lineBetween(enemyX, ground - 4, enemyX - step, ground);
      g.lineBetween(enemyX, ground - 7.5, enemyX - 3.5, ground - 7.5);
    }
    g.fillStyle(c.enemy);
    g.fillCircle(headX, headY - 0.5, 1.8);
  } else {
    g.lineStyle(1.3, c.enemy);
    g.lineBetween(enemyX, ground - 0.8, enemyX + 10, ground - 0.8);
    g.fillStyle(c.enemy);
    g.fillCircle(enemyX + 11, ground - 1.5, 1.8);
  }
  figure(heroX, 1, c.hero, c.heroEdge);
  if (fight.shooting) {
    g.lineStyle(1, c.shot);
    g.lineBetween(heroX + 4.5, ground - 7.5, enemyX - 1, ground - 7.5);
    g.fillStyle(c.flash);
    g.fillCircle(heroX + 4.5, ground - 7.5, 1.8);
  }
}
