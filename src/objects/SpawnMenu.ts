import { onlyHere } from '../net/detMath';
import type Phaser from 'phaser';
import {
  BLOCKS,
  BUILD_KINDS,
  CASTLE_KINDS,
  ELEMENT_KINDS,
  GAME_WIDTH,
  ITEMS,
  JUNK_KINDS,
  MENU,
  MONSTER_KINDS,
  PEOPLE,
  PERSON,
  TABS,
  FIGHTERS,
  GEAR_KINDS,
  GOLDEN_KINDS,
  POWER_KINDS,
  TRAP_KINDS,
  VEHICLE_KINDS,
  WEAPON_KINDS,
  type BlockKind,
  type ItemKind,
  type PersonLook,
  type TabId,
} from '../config';
import { fitRow, slotAt, slotRect, type SlotRow } from '../logic/menu';
import { SHARP } from '../screen';
import { drawBlock } from './Block';
import { drawItem } from './itemShapes';
import { PersonFigure } from './personShape';

/** One thing you can pick from the menu and put into the area. */
export type SpawnChoice =
  | { type: 'none' }
  /** A golden weapon that hasn't been won yet: it shows as a padlock, and puts nothing in. */
  | { type: 'locked' }
  | { type: 'person'; look: PersonLook }
  | { type: 'item'; kind: ItemKind }
  | { type: 'block'; kind: BlockKind };

/** Every page starts with an empty slot: with that picked, a click puts nothing in. */
const NOTHING: SpawnChoice = { type: 'none' };
/** The slot that is picked when a page opens: the first one with something in it. */
const FIRST_THING = 1;

const CHOICES: Record<Exclude<TabId, 'golden'>, readonly SpawnChoice[]> = {
  people: [NOTHING, ...PEOPLE.map((look): SpawnChoice => ({ type: 'person', look }))],
  fighters: [NOTHING, ...FIGHTERS.map((look): SpawnChoice => ({ type: 'person', look }))],
  items: [NOTHING, ...WEAPON_KINDS.map((kind): SpawnChoice => ({ type: 'item', kind }))],
  build: [NOTHING, ...BUILD_KINDS.map((kind): SpawnChoice => ({ type: 'block', kind }))],
  junk: [NOTHING, ...JUNK_KINDS],
  traps: [NOTHING, ...TRAP_KINDS],
  elements: [NOTHING, ...ELEMENT_KINDS],
  castle: [NOTHING, ...CASTLE_KINDS.map((kind): SpawnChoice => ({ type: 'block', kind }))],
  gear: [NOTHING, ...GEAR_KINDS.map((kind): SpawnChoice => ({ type: 'item', kind }))],
  powers: [NOTHING, ...POWER_KINDS.map((kind): SpawnChoice => ({ type: 'item', kind }))],
  monsters: [NOTHING, ...MONSTER_KINDS.map((kind): SpawnChoice => ({ type: 'block', kind }))],
  vehicles: [NOTHING, ...VEHICLE_KINDS.map((kind): SpawnChoice => ({ type: 'block', kind }))],
};

/**
 * The menu along the top. The small buttons on the left switch between the pages
 * (dolls, weapons, building pieces, junk, vehicles, monsters, traps, forces of nature and
 * castle pieces); the big slots
 * pick what the next click puts into the area.
 */
export class SpawnMenu {
  private readonly scene: Phaser.Scene;
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly highlight: Phaser.GameObjects.Graphics;
  private readonly soundLabel: Phaser.GameObjects.Text;
  /** Can this browser fill the whole screen? Without that there is no button for it. */
  private readonly canGoFull: boolean;
  /** The pictures in the slots of the open page. */
  private pictures: Phaser.GameObjects.GameObject[] = [];
  private tab: TabId = 'people';
  private selectedIndex = FIRST_THING;
  private duelOn = false;
  private horrorOn = false;
  private crazyOn = false;
  private unlocked = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.canGoFull = scene.scale.fullscreen.available;
    this.panel = scene.add.graphics().setDepth(MENU.depth);
    this.highlight = scene.add.graphics().setDepth(MENU.depth);

    TABS.forEach((tab, index) => {
      const rect = slotRect(MENU.tabs, index);
      scene.add
        .text(rect.x + rect.width / 2, rect.y + rect.height / 2, tab.emoji, {
          fontSize: MENU.tabFontSize,
        })
        .setOrigin(0.5)
        .setResolution(SHARP)
        .setDepth(MENU.depth + 1);
    });
    const clear = slotRect(MENU.clear, 0);
    scene.add
      .text(clear.x + clear.width / 2, clear.y + clear.height / 2, MENU.clearEmoji, {
        fontSize: MENU.clearFontSize,
      })
      .setOrigin(0.5)
      .setResolution(SHARP)
      .setDepth(MENU.depth + 1);

    const duel = slotRect(MENU.duel, 0);
    scene.add
      .text(duel.x + duel.width / 2, duel.y + duel.height / 2, MENU.duelEmoji, {
        fontSize: MENU.duelFontSize,
      })
      .setOrigin(0.5)
      .setResolution(SHARP)
      .setDepth(MENU.depth + 1);

    const horror = slotRect(MENU.horror, 0);
    scene.add
      .text(horror.x + horror.width / 2, horror.y + horror.height / 2, MENU.horrorEmoji, {
        fontSize: MENU.duelFontSize,
      })
      .setOrigin(0.5)
      .setResolution(SHARP)
      .setDepth(MENU.depth + 1);

    const crazy = slotRect(MENU.crazy, 0);
    scene.add
      .text(crazy.x + crazy.width / 2, crazy.y + crazy.height / 2, MENU.crazyEmoji, {
        fontSize: MENU.duelFontSize,
      })
      .setOrigin(0.5)
      .setResolution(SHARP)
      .setDepth(MENU.depth + 1);

    const sound = slotRect(MENU.sound, 0);
    this.soundLabel = scene.add
      .text(sound.x + sound.width / 2, sound.y + sound.height / 2, MENU.soundEmoji.on, {
        fontSize: MENU.soundFontSize,
      })
      .setOrigin(0.5)
      .setResolution(SHARP)
      .setDepth(MENU.depth + 1);

    const full = slotRect(MENU.full, 0);
    scene.add
      .text(full.x + full.width / 2, full.y + full.height / 2, MENU.fullEmoji, {
        fontSize: MENU.soundFontSize,
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setResolution(SHARP)
      .setDepth(MENU.depth + 1)
      .setVisible(this.canGoFull);

    this.showPage();
  }

  /** What gets put into the area on the next click. */
  /** What is picked, as a short code that goes over the network: its page and slot. */
  get selectedCode(): string {
    if (this.tab === 'golden') {
      const kind = GOLDEN_KINDS[this.selectedIndex - 1];
      return kind && this.selectedIndex <= this.unlocked ? `golden:${kind}` : 'none';
    }
    return `${this.tab}:${String(this.selectedIndex)}`;
  }

  /** What a code from `selectedCode` means: the same thing in every game. */
  static choiceFromCode(code: string): SpawnChoice {
    const [tab = '', at = ''] = code.split(':');
    if (tab === 'golden') {
      const kind = GOLDEN_KINDS.find((golden) => golden === at);
      return kind ? { type: 'item', kind } : NOTHING;
    }
    const page = (CHOICES as Partial<Record<string, readonly SpawnChoice[]>>)[tab];
    return page?.[Number(at)] ?? NOTHING;
  }

  get selected(): SpawnChoice {
    const choice = this.choices()[this.selectedIndex];
    if (!choice) {
      throw new Error(`Nothing at menu slot ${this.selectedIndex} of ${this.tab}`);
    }
    return choice;
  }

  /** Show on the sound button whether the sounds are on. */
  showSound(on: boolean): void {
    this.soundLabel.setText(on ? MENU.soundEmoji.on : MENU.soundEmoji.off);
  }

  /** Is this point on the menu (and not in the area below it)? */
  covers(py: number): boolean {
    return py < MENU.height;
  }

  /**
   * A click on the menu: switch the page, or pick the thing in the slot under it.
   * Says `'clear'`, `'sound'` or `'full'` when one of those buttons was pressed.
   */
  click(px: number, py: number): 'clear' | 'sound' | 'full' | 'duel' | 'horror' | 'crazy' | null {
    if (slotAt(MENU.clear, 1, px, py) !== null) return 'clear';
    if (slotAt(MENU.duel, 1, px, py) !== null) return 'duel';
    if (slotAt(MENU.horror, 1, px, py) !== null) return 'horror';
    if (slotAt(MENU.crazy, 1, px, py) !== null) return 'crazy';
    if (slotAt(MENU.sound, 1, px, py) !== null) return 'sound';
    if (this.canGoFull && slotAt(MENU.full, 1, px, py) !== null) return 'full';

    const tab = TABS[slotAt(MENU.tabs, TABS.length, px, py) ?? -1];
    if (tab) {
      if (tab.id !== this.tab) {
        this.tab = tab.id;
        this.selectedIndex = FIRST_THING;
        this.showPage();
      }
      return null;
    }

    const index = slotAt(this.row(), this.choices().length, px, py);
    if (index !== null) {
      this.selectedIndex = index;
      this.drawHighlight();
    }
    return null;
  }

  /** The things on the open page. The golden page shows what has been won, and padlocks for the rest. */
  private choices(): readonly SpawnChoice[] {
    if (this.tab !== 'golden') return CHOICES[this.tab];
    return [
      NOTHING,
      ...GOLDEN_KINDS.map((kind, index): SpawnChoice =>
        index < this.unlocked ? { type: 'item', kind } : { type: 'locked' },
      ),
    ];
  }

  /** This many of the golden weapons have been won: they are on the golden page from now on. */
  setUnlocked(count: number): void {
    if (this.unlocked === count) return;
    this.unlocked = count;
    this.showPage();
  }

  /** Light the battle button while a two-player battle is on. */
  showDuel(on: boolean): void {
    if (this.duelOn === on) return;
    this.duelOn = on;
    this.showPage();
  }

  /** Light the horror button red while horror mode is on. */
  showHorror(on: boolean): void {
    if (this.horrorOn === on) return;
    this.horrorOn = on;
    this.showPage();
  }

  /** Light the crazy button pink while crazy mode is on. */
  showCrazy(on: boolean): void {
    if (this.crazyOn === on) return;
    this.crazyOn = on;
    this.showPage();
  }

  /** The slots of the open page: narrower than usual when the page holds many things. */
  private row(): SlotRow {
    return fitRow(MENU.slots, this.choices().length, MENU.slotsEnd);
  }

  /** Draw the open page: the panel, the tab buttons and a picture in every slot. */
  private showPage(): void {
    // Only this player sees their menu: it doesn't use up the random numbers of an online game
    onlyHere(() => {
      this.drawPage();
    });
  }

  private drawPage(): void {
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
    const duel = slotRect(MENU.duel, 0);
    panel.fillStyle(this.duelOn ? MENU.duelOnColor : MENU.duelColor);
    panel.fillRoundedRect(duel.x, duel.y, duel.width, duel.height, MENU.slotRadius);
    const horror = slotRect(MENU.horror, 0);
    panel.fillStyle(this.horrorOn ? MENU.horrorOnColor : MENU.horrorColor);
    panel.fillRoundedRect(horror.x, horror.y, horror.width, horror.height, MENU.slotRadius);
    const crazy = slotRect(MENU.crazy, 0);
    panel.fillStyle(this.crazyOn ? MENU.crazyOnColor : MENU.crazyColor);
    panel.fillRoundedRect(crazy.x, crazy.y, crazy.width, crazy.height, MENU.slotRadius);
    const buttons = this.canGoFull ? [MENU.sound, MENU.full] : [MENU.sound];
    for (const button of buttons.map((row) => slotRect(row, 0))) {
      panel.fillStyle(MENU.soundColor);
      panel.fillRoundedRect(button.x, button.y, button.width, button.height, MENU.slotRadius);
    }

    this.choices().forEach((choice, index) => {
      const slot = slotRect(this.row(), index);
      panel.fillStyle(MENU.slotColor);
      panel.fillRoundedRect(slot.x, slot.y, slot.width, slot.height, MENU.slotRadius);

      const middleX = slot.x + slot.width / 2;
      const middleY = slot.y + slot.height / 2;
      const bottomY = slot.y + slot.height - MENU.feetInset;
      // Small enough to fit in the slot with some room around it
      const fit = (halfWidth: number, height: number, most: number): number =>
        Math.min(
          most,
          (slot.width - MENU.slotPadding * 2) / (halfWidth * 2),
          (slot.height - MENU.slotPadding * 2) / height,
        );
      if (choice.type === 'none') return;
      if (choice.type === 'locked') {
        // A padlock: a body with a keyhole, and a shackle over it
        const { body, shackle, hole } = MENU.lock;
        const lock = scene.add.graphics().setPosition(middleX, middleY);
        lock.lineStyle(4, shackle);
        lock.beginPath();
        lock.arc(0, -3, 7.5, Math.PI, 0);
        lock.strokePath();
        lock.fillStyle(body);
        lock.fillRoundedRect(-11, -3, 22, 18, 4);
        lock.fillStyle(hole);
        lock.fillCircle(0, 4, 2.6);
        lock.fillRect(-1.1, 4, 2.2, 6);
        this.pictures.push(lock.setDepth(MENU.depth + 1));
        return;
      }
      if (choice.type === 'person') {
        const figure = new PersonFigure(scene, choice.look).container
          .setScale(fit(PERSON.halfWidth, PERSON.height, MENU.personScale))
          .setPosition(middleX, bottomY);
        this.pictures.push(figure.setDepth(MENU.depth + 1));
      } else if (choice.type === 'item') {
        const def = ITEMS[choice.kind];
        const scale = fit(def.halfWidth, def.height, def.menuScale);
        const picture = drawItem(scene.add.graphics(), choice.kind)
          .setScale(scale)
          .setPosition(middleX + def.lie.x * scale, middleY + (def.lie.y + def.height / 2) * scale);
        this.pictures.push(picture.setDepth(MENU.depth + 1));
      } else {
        const def = BLOCKS[choice.kind];
        // A vehicle's drawing is smaller than the vehicle, so it is made bigger to match
        const drawn = def.drive?.scale ?? 1;
        const scale = fit(def.halfWidth, def.height, def.menuScale) * drawn;
        const picture = drawBlock(scene.add.graphics(), choice.kind)
          .setScale(scale)
          .setPosition(middleX, middleY + (def.height / 2) * scale);
        this.pictures.push(picture.setDepth(MENU.depth + 1));
      }
    });

    this.drawHighlight();
  }

  private drawHighlight(): void {
    const slot = slotRect(this.row(), this.selectedIndex);
    this.highlight.clear();
    this.highlight.lineStyle(MENU.selected.width, MENU.selected.color);
    this.highlight.strokeRoundedRect(slot.x, slot.y, slot.width, slot.height, MENU.slotRadius);
  }
}
