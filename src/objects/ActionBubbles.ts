import type Phaser from 'phaser';
import { ACTIONS, BUBBLES, PERSON, type ActionId } from '../config';
import { bubbleAt, bubbleCenters, type Point } from '../logic/bubbles';
import type { PlaceArea } from '../logic/place';
import type { Person } from './Person';

/**
 * The round bubbles above a double-clicked person, one for each thing they can do.
 * A pressed bubble glows until it is pressed again.
 */
export class ActionBubbles {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly labels: Phaser.GameObjects.Text[];
  private person: Person | null = null;
  private centers: Point[] = [];
  /** Time left for the quick flash of a bubble that doesn't stay on. */
  private readonly flashMs: number[] = ACTIONS.map(() => 0);

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(BUBBLES.depth);
    this.labels = ACTIONS.map((action) =>
      scene.add
        .text(0, 0, action.emoji, { fontSize: BUBBLES.fontSize })
        .setOrigin(0.5)
        .setDepth(BUBBLES.depth)
        .setVisible(false),
    );
  }

  /** The person the bubbles belong to, or `null` when they are closed. */
  get target(): Person | null {
    return this.person;
  }

  open(person: Person): void {
    this.person = person;
    this.flashMs.fill(0);
  }

  close(): void {
    this.person = null;
    this.centers = [];
    this.graphics.clear();
    this.labels.forEach((label) => label.setVisible(false));
  }

  /** Which action's bubble is under the point, or `null` if none is. */
  actionAt(px: number, py: number): ActionId | null {
    const index = bubbleAt(this.centers, BUBBLES.row.radius, px, py);
    return index === null ? null : (ACTIONS[index]?.id ?? null);
  }

  /** Light a bubble up for a blink (for actions that are done at once). */
  flash(id: ActionId): void {
    const index = ACTIONS.findIndex((action) => action.id === id);
    if (index >= 0) this.flashMs[index] = BUBBLES.flashMs;
  }

  /** Follow the person and redraw, so the glow always shows what is switched on. */
  update(deltaMs: number, area: PlaceArea): void {
    const person = this.person;
    if (!person) return;
    if (!person.canBePicked) {
      this.close();
      return;
    }

    const feet = person.feet;
    this.centers = bubbleCenters(
      ACTIONS.length,
      feet.x,
      feet.y - PERSON.height,
      BUBBLES.row,
      area.left,
      area.right,
      area.top,
    );

    this.graphics.clear();
    ACTIONS.forEach((action, index) => {
      const center = this.centers[index];
      const label = this.labels[index];
      if (!center || !label) return;
      const flash = Math.max(0, (this.flashMs[index] ?? 0) - deltaMs);
      this.flashMs[index] = flash;
      this.drawBubble(center, person.activity === action.id || flash > 0);
      label.setPosition(center.x, center.y).setVisible(true);
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
