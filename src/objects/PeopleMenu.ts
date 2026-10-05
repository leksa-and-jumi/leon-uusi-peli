import type Phaser from 'phaser';
import { GAME_WIDTH, MENU, PEOPLE, type PersonLook } from '../config';
import { slotAt, slotRect } from '../logic/menu';
import { PersonFigure } from './personShape';

/** The menu along the top: one slot for each different-looking person, and a clear button. */
export class PeopleMenu {
  private readonly highlight: Phaser.GameObjects.Graphics;
  private selectedIndex = 0;

  constructor(scene: Phaser.Scene) {
    const panel = scene.add.graphics().setDepth(MENU.depth);
    panel.fillStyle(MENU.color);
    panel.fillRect(0, 0, GAME_WIDTH, MENU.height);
    panel.fillStyle(MENU.edge);
    panel.fillRect(0, MENU.height - 3, GAME_WIDTH, 3);

    PEOPLE.forEach((look, index) => {
      const slot = slotRect(MENU.slots, index);
      panel.fillStyle(MENU.slotColor);
      panel.fillRoundedRect(slot.x, slot.y, slot.width, slot.height, MENU.slotRadius);

      new PersonFigure(scene, look).container
        .setScale(MENU.personScale)
        .setPosition(slot.x + slot.width / 2, slot.y + slot.height - MENU.feetInset)
        .setDepth(MENU.depth);
    });

    const clear = slotRect(MENU.clear, 0);
    panel.fillStyle(MENU.clearColor);
    panel.fillRoundedRect(clear.x, clear.y, clear.width, clear.height, MENU.slotRadius);
    scene.add
      .text(clear.x + clear.width / 2, clear.y + clear.height / 2, MENU.clearEmoji, {
        fontSize: MENU.clearFontSize,
      })
      .setOrigin(0.5)
      .setDepth(MENU.depth);

    this.highlight = scene.add.graphics().setDepth(MENU.depth);
    this.drawHighlight();
  }

  /** The person that gets put into the area on the next click. */
  get selected(): PersonLook {
    const look = PEOPLE[this.selectedIndex];
    if (!look) {
      throw new Error(`No person at menu slot ${this.selectedIndex}`);
    }
    return look;
  }

  /** Is this point on the menu (and not in the area below it)? */
  covers(py: number): boolean {
    return py < MENU.height;
  }

  /**
   * A click on the menu: pick the person in the slot under it, if any.
   * Says `'clear'` when the clear button was pressed.
   */
  click(px: number, py: number): 'clear' | null {
    if (slotAt(MENU.clear, 1, px, py) !== null) return 'clear';
    const index = slotAt(MENU.slots, PEOPLE.length, px, py);
    if (index !== null) {
      this.selectedIndex = index;
      this.drawHighlight();
    }
    return null;
  }

  private drawHighlight(): void {
    const slot = slotRect(MENU.slots, this.selectedIndex);
    this.highlight.clear();
    this.highlight.lineStyle(MENU.selected.width, MENU.selected.color);
    this.highlight.strokeRoundedRect(slot.x, slot.y, slot.width, slot.height, MENU.slotRadius);
  }
}
