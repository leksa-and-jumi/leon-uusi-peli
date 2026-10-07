import type Phaser from 'phaser';
import {
  BLOCKS,
  GAME_WIDTH,
  ITEMS,
  MENU,
  PEOPLE,
  TABS,
  type BlockKind,
  type ItemKind,
  type PersonLook,
  type TabId,
} from '../config';
import { slotAt, slotRect } from '../logic/menu';
import { drawBlock } from './Block';
import { drawItem } from './itemShapes';
import { PersonFigure } from './personShape';

/** One thing you can pick from the menu and put into the area. */
export type SpawnChoice =
  | { type: 'person'; look: PersonLook }
  | { type: 'item'; kind: ItemKind }
  | { type: 'block'; kind: BlockKind };

const CHOICES: Record<TabId, readonly SpawnChoice[]> = {
  people: PEOPLE.map((look) => ({ type: 'person', look })),
  items: (Object.keys(ITEMS) as ItemKind[]).map((kind) => ({ type: 'item', kind })),
  build: (Object.keys(BLOCKS) as BlockKind[]).map((kind) => ({ type: 'block', kind })),
};

/**
 * The menu along the top. The small buttons on the left switch between dolls, items
 * and building pieces; the big slots pick what the next click puts into the area.
 */
export class SpawnMenu {
  private readonly scene: Phaser.Scene;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly highlight: Phaser.GameObjects.Graphics;
  /** The pictures in the slots of the open page. */
  private pictures: Phaser.GameObjects.GameObject[] = [];
  private tab: TabId = 'people';
  private selectedIndex = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.panel = scene.add.graphics().setDepth(MENU.depth);
    this.highlight = scene.add.graphics().setDepth(MENU.depth);

    TABS.forEach((tab, index) => {
      const rect = slotRect(MENU.tabs, index);
      scene.add
        .text(rect.x + rect.width / 2, rect.y + rect.height / 2, tab.emoji, {
          fontSize: MENU.tabFontSize,
        })
        .setOrigin(0.5)
        .setDepth(MENU.depth + 1);
    });
    const clear = slotRect(MENU.clear, 0);
    scene.add
      .text(clear.x + clear.width / 2, clear.y + clear.height / 2, MENU.clearEmoji, {
        fontSize: MENU.clearFontSize,
      })
      .setOrigin(0.5)
      .setDepth(MENU.depth + 1);

    this.showPage();
  }

  /** What gets put into the area on the next click. */
  get selected(): SpawnChoice {
    const choice = CHOICES[this.tab][this.selectedIndex];
    if (!choice) {
      throw new Error(`Nothing at menu slot ${this.selectedIndex} of ${this.tab}`);
    }
    return choice;
  }

  /** Is this point on the menu (and not in the area below it)? */
  covers(py: number): boolean {
    return py < MENU.height;
  }

  /**
   * A click on the menu: switch the page, or pick the thing in the slot under it.
   * Says `'clear'` when the clear button was pressed.
   */
  click(px: number, py: number): 'clear' | null {
    if (slotAt(MENU.clear, 1, px, py) !== null) return 'clear';

    const tab = TABS[slotAt(MENU.tabs, TABS.length, px, py) ?? -1];
    if (tab) {
      if (tab.id !== this.tab) {
        this.tab = tab.id;
        this.selectedIndex = 0;
        this.showPage();
      }
      return null;
    }

    const index = slotAt(MENU.slots, CHOICES[this.tab].length, px, py);
    if (index !== null) {
      this.selectedIndex = index;
      this.drawHighlight();
    }
    return null;
  }

  /** Draw the open page: the panel, the tab buttons and a picture in every slot. */
  private showPage(): void {
    const { panel, scene } = this;
    this.pictures.forEach((picture) => picture.destroy());
    this.pictures = [];

    panel.clear();
    panel.fillStyle(MENU.color);
    panel.fillRect(0, 0, GAME_WIDTH, MENU.height);
    panel.fillStyle(MENU.edge);
    panel.fillRect(0, MENU.height - 3, GAME_WIDTH, 3);

    TABS.forEach((tab, index) => {
      const rect = slotRect(MENU.tabs, index);
      panel.fillStyle(tab.id === this.tab ? MENU.tabSelectedColor : MENU.tabColor);
      panel.fillRoundedRect(rect.x, rect.y, rect.width, rect.height, MENU.tabRadius);
    });

    const clear = slotRect(MENU.clear, 0);
    panel.fillStyle(MENU.clearColor);
    panel.fillRoundedRect(clear.x, clear.y, clear.width, clear.height, MENU.slotRadius);

    CHOICES[this.tab].forEach((choice, index) => {
      const slot = slotRect(MENU.slots, index);
      panel.fillStyle(MENU.slotColor);
      panel.fillRoundedRect(slot.x, slot.y, slot.width, slot.height, MENU.slotRadius);

      const middleX = slot.x + slot.width / 2;
      const middleY = slot.y + slot.height / 2;
      const bottomY = slot.y + slot.height - MENU.feetInset;
      if (choice.type === 'person') {
        const figure = new PersonFigure(scene, choice.look).container
          .setScale(MENU.personScale)
          .setPosition(middleX, bottomY);
        this.pictures.push(figure.setDepth(MENU.depth + 1));
      } else if (choice.type === 'item') {
        const def = ITEMS[choice.kind];
        const scale = def.menuScale;
        const picture = drawItem(scene.add.graphics(), choice.kind)
          .setScale(scale)
          .setPosition(middleX + def.lie.x * scale, middleY + (def.lie.y + def.height / 2) * scale);
        this.pictures.push(picture.setDepth(MENU.depth + 1));
      } else {
        const def = BLOCKS[choice.kind];
        const picture = drawBlock(scene.add.graphics(), choice.kind)
          .setScale(def.menuScale)
          .setPosition(middleX, middleY + (def.height / 2) * def.menuScale);
        this.pictures.push(picture.setDepth(MENU.depth + 1));
      }
    });

    this.drawHighlight();
  }

  private drawHighlight(): void {
    const slot = slotRect(MENU.slots, this.selectedIndex);
    this.highlight.clear();
    this.highlight.lineStyle(MENU.selected.width, MENU.selected.color);
    this.highlight.strokeRoundedRect(slot.x, slot.y, slot.width, slot.height, MENU.slotRadius);
  }
}
