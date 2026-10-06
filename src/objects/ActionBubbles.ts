import type Phaser from 'phaser';
import { ACTION_EMOJI, BUBBLES, MAX_BUBBLES, type ActionId } from '../config';
import { bubbleAt, bubbleCenters, type Point } from '../logic/bubbles';
import type { PlaceArea } from '../logic/place';
import type { Body } from './Body';

/**
 * The round bubbles above something that was double-clicked, one for each thing it
 * can do. A pressed bubble glows until it is pressed again.
 */
export class ActionBubbles {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly labels: Phaser.GameObjects.Text[];
  private body: Body | null = null;
  private centers: Point[] = [];
  /** Time left for the quick flash of a bubble that doesn't stay on. */
  private readonly flashMs = new Map<ActionId, number>();

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(BUBBLES.depth);
    this.labels = Array.from({ length: MAX_BUBBLES }, () =>
      scene.add
        .text(0, 0, '', { fontSize: BUBBLES.fontSize })
        .setOrigin(0.5)
        .setDepth(BUBBLES.depth)
        .setVisible(false),
    );
  }

  /** What the bubbles belong to, or `null` when they are closed. */
  get target(): Body | null {
    return this.body;
  }

  open(body: Body): void {
    this.close();
    this.body = body;
  }

  close(): void {
    this.body = null;
    this.centers = [];
    this.flashMs.clear();
    this.graphics.clear();
    this.labels.forEach((label) => label.setVisible(false));
  }

  /** Which action's bubble is under the point, or `null` if none is. */
  actionAt(px: number, py: number): ActionId | null {
    const index = bubbleAt(this.centers, BUBBLES.row.radius, px, py);
    return index === null ? null : (this.body?.actions[index] ?? null);
  }

  /** Light a bubble up for a blink (for actions that are done at once). */
  flash(id: ActionId): void {
    this.flashMs.set(id, BUBBLES.flashMs);
  }

  /** Follow the target and redraw, so the glow always shows what is switched on. */
  update(deltaMs: number, area: PlaceArea): void {
    const body = this.body;
    if (!body) return;
    if (!body.canBePicked || body.gone) {
      this.close();
      return;
    }

    const feet = body.feet;
    this.centers = bubbleCenters(
      body.actions.length,
      feet.x,
      feet.y - body.size.height,
      BUBBLES.row,
      area.left,
      area.right,
      area.top,
    );

    this.graphics.clear();
    body.actions.forEach((action, index) => {
      const center = this.centers[index];
      const label = this.labels[index];
      if (!center || !label) return;
      const flash = Math.max(0, (this.flashMs.get(action) ?? 0) - deltaMs);
      this.flashMs.set(action, flash);
      this.drawBubble(center, body.isOn(action) || flash > 0);
      label.setText(ACTION_EMOJI[action]).setPosition(center.x, center.y).setVisible(true);
    });
  }

  private drawBubble(center: Point, pressed: boolean): void {
    const g = this.graphics;
    const { radius } = BUBBLES.row;
    if (pressed) {
      g.fillStyle(BUBBLES.glow.color, BUBBLES.glow.alpha);
      g.fillCircle(center.x, center.y, radius + BUBBLES.glow.extra);
    }
    g.fillStyle(BUBBLES.color);
    g.fillCircle(center.x, center.y, radius);
    if (pressed) {
      g.lineStyle(BUBBLES.glow.edgeWidth, BUBBLES.glow.color);
    } else {
      g.lineStyle(BUBBLES.edgeWidth, BUBBLES.edge);
    }
    g.strokeCircle(center.x, center.y, radius);
  }
}
