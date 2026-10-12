import type Phaser from 'phaser';
import { FLOOR, WALL } from '../config';
import type { Box } from '../logic/ground';

type Graphics = Phaser.GameObjects.Graphics;

/**
 * Draws the wall behind everything, over `space`: lighter at the top than at the
 * bottom, made of big panels, with a soft light in the middle, dark corners, and a
 * skirting board along the floor.
 */
export function drawWall(g: Graphics, space: Box): Graphics {
  const { left, right, top, bottom } = space;
  const width = right - left;
  const height = bottom - top;
  g.fillGradientStyle(WALL.top, WALL.top, WALL.bottom, WALL.bottom);
  g.fillRect(left, top, width, height);

  // The light: rings inside one another, so that it is brightest in the middle
  const { light } = WALL;
  for (let ring = 0; ring < light.rings; ring++) {
    const size = 1 - ring / light.rings;
    g.fillStyle(light.color, light.alpha);
    g.fillEllipse(
      left + width * light.x,
      top + height * light.y,
      light.width * size,
      light.height * size,
    );
  }

  // The panels: a dark line with a thin shine beside it where two of them meet
  const { panel } = WALL;
  for (let x = left + panel.width; x < right; x += panel.width) {
    g.fillStyle(panel.line, panel.lineAlpha);
    g.fillRect(x, top, 1.5, height);
    g.fillStyle(panel.shine, panel.shineAlpha);
    g.fillRect(x + 1.5, top, 1, height);
  }
  for (let y = bottom - panel.height; y > top; y -= panel.height) {
    g.fillStyle(panel.line, panel.lineAlpha);
    g.fillRect(left, y, width, 1.5);
    g.fillStyle(panel.shine, panel.shineAlpha);
    g.fillRect(left, y + 1.5, width, 1);
  }

  // It is darker in the corners, under the ceiling and down by the floor
  const { shade } = WALL;
  const dark = shade.color;
  g.fillGradientStyle(dark, dark, dark, dark, shade.sides, 0, shade.sides, 0);
  g.fillRect(left, top, shade.sideWidth, height);
  g.fillGradientStyle(dark, dark, dark, dark, 0, shade.sides, 0, shade.sides);
  g.fillRect(right - shade.sideWidth, top, shade.sideWidth, height);
  g.fillGradientStyle(dark, dark, dark, dark, shade.top, shade.top, 0, 0);
  g.fillRect(left, top, width, shade.topHeight);
  g.fillGradientStyle(dark, dark, dark, dark, 0, 0, shade.bottom, shade.bottom);
  g.fillRect(left, bottom - shade.bottomHeight, width, shade.bottomHeight);

  const { skirting } = WALL;
  g.fillStyle(skirting.color);
  g.fillRect(left, bottom - skirting.height, width, skirting.height);
  g.fillStyle(skirting.shine);
  g.fillRect(left, bottom - skirting.height, width, 1.5);
  return g;
}

/** Draws the floor, from `top` down: dark, darker still further down, with a bright edge on top. */
export function drawFloor(g: Graphics, left: number, top: number, width: number): Graphics {
  g.fillGradientStyle(FLOOR.top, FLOOR.top, FLOOR.bottom, FLOOR.bottom);
  g.fillRect(left, top, width, FLOOR.height);
  g.fillStyle(FLOOR.edge);
  g.fillRect(left, top, width, FLOOR.edgeHeight);
  g.fillStyle(FLOOR.shine, FLOOR.shineAlpha);
  g.fillRect(left, top + FLOOR.edgeHeight, width, FLOOR.shineHeight);
  return g;
}
