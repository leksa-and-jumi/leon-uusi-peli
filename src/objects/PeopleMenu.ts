import type Phaser from 'phaser';
import { GAME_WIDTH, MENU, PEOPLE, type PersonLook } from '../config';
import { slotAt, slotRect } from '../logic/menu';
import { drawPerson } from './personShape';

/** The menu along the top: one slot for each different-looking person. */
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

      const person = scene.add.graphics().setDepth(MENU.depth);
      drawPerson(person, look);
      person.setScale(MENU.personScale);
      person.setPosition(slot.x + slot.width / 2, slot.y + slot.height - MENU.feetInset);
    });

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

  /** A click on the menu: pick the person in the slot under it, if any. */
  click(px: number, py: number): void {
    const index = slotAt(MENU.slots, PEOPLE.length, px, py);
    if (index === null) return;
    this.selectedIndex = index;
    this.drawHighlight();
  }

  private drawHighlight(): void {
    const slot = slotRect(MENU.slots, this.selectedIndex);
    this.highlight.clear();
    this.highlight.lineStyle(MENU.selected.width, MENU.selected.color);
    this.highlight.strokeRoundedRect(slot.x, slot.y, slot.width, slot.height, MENU.slotRadius);
  }
}
