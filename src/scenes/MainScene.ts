import Phaser from 'phaser';
import {
  COLORS,
  DOUBLE_CLICK_MS,
  FLOOR,
  GAME_HEIGHT,
  GAME_WIDTH,
  HINT,
  HIT_FX,
  MENU,
  PERSON,
  type ActionId,
} from '../config';
import { isDoubleClick, personAt, type Click } from '../logic/pick';
import { placeFeet, type PlaceArea } from '../logic/place';
import { ActionBubbles } from '../objects/ActionBubbles';
import { PeopleMenu } from '../objects/PeopleMenu';
import { Person } from '../objects/Person';

const AREA: PlaceArea = {
  left: 0,
  right: GAME_WIDTH,
  top: MENU.height,
  floorY: GAME_HEIGHT - FLOOR.height,
};

/**
 * The area: pick a person from the menu and click to put them in. Drag people around,
 * and double-click one to open their action bubbles.
 */
export class MainScene extends Phaser.Scene {
  private menu!: PeopleMenu;
  private bubbles!: ActionBubbles;
  private people: Person[] = [];
  private dragged: Person | null = null;
  private lastClick: Click | null = null;

  constructor() {
    super('MainScene');
  }

  create(): void {
    this.people = [];
    this.dragged = null;
    this.lastClick = null;

    this.add.rectangle(0, AREA.floorY, GAME_WIDTH, FLOOR.height, FLOOR.color).setOrigin(0);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - HINT.fromBottom, HINT.text, {
        fontSize: HINT.fontSize,
        color: COLORS.text,
        align: 'center',
      })
      .setOrigin(0.5);

    this.menu = new PeopleMenu(this);
    this.bubbles = new ActionBubbles(this);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.press(pointer.x, pointer.y);
    });
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.dragged?.dragTo(pointer.x, pointer.y, AREA);
    });
    this.input.on('pointerup', () => {
      this.letGo();
    });
    this.input.on('pointerupoutside', () => {
      this.letGo();
    });
  }

  update(_time: number, delta: number): void {
    const world = {
      area: AREA,
      bottom: GAME_HEIGHT,
      everyone: this.people,
      hitEffect: (x: number, y: number, deadly: boolean) => {
        this.showHit(x, y, deadly);
      },
    };
    for (const person of this.people) {
      person.update(delta, world);
    }
    this.forget(this.people.filter((person) => person.gone));
    this.bubbles.update(delta, AREA);
  }

  private press(px: number, py: number): void {
    if (this.menu.covers(py)) {
      if (this.menu.click(px, py) === 'clear') {
        this.forget([...this.people]);
      }
      return;
    }

    const action = this.bubbles.actionAt(px, py);
    const target = this.bubbles.target;
    if (action && target) {
      this.doAction(action, target);
      return;
    }

    const person = this.personUnder(px, py);
    if (!person) {
      // A click on empty space closes open bubbles; otherwise it puts a new person in.
      if (target) {
        this.bubbles.close();
      } else {
        this.addPerson(px, py);
      }
      return;
    }

    const click = { timeMs: this.time.now, target: person };
    if (isDoubleClick(this.lastClick, click, DOUBLE_CLICK_MS)) {
      this.lastClick = null;
      if (target === person) {
        this.bubbles.close();
      } else {
        this.bubbles.open(person);
      }
    } else {
      this.lastClick = click;
      if (target && target !== person) this.bubbles.close();
    }

    person.grab(px, py);
    this.dragged = person;
    this.bringToFront(person);
  }

  private letGo(): void {
    this.dragged?.release();
    this.dragged = null;
  }

  private doAction(action: ActionId, person: Person): void {
    switch (action) {
      case 'throw':
        person.throwAway(AREA);
        this.bubbles.close();
        break;
      case 'turn':
        person.turn();
        this.bubbles.flash('turn');
        break;
      case 'walk':
      case 'dance':
      case 'angry':
        person.toggle(action);
        break;
    }
  }

  private personUnder(px: number, py: number): Person | null {
    const pickable = this.people.filter((person) => person.canBePicked);
    const index = personAt(
      pickable.map((person) => person.feet),
      px,
      py,
      PERSON,
    );
    return index === null ? null : (pickable[index] ?? null);
  }

  private addPerson(px: number, py: number): void {
    const feet = placeFeet(px, py, AREA, PERSON);
    this.people.push(new Person(this, this.menu.selected, feet.x, feet.y));
    if (this.people.length > PERSON.max) {
      const oldest = this.people[0];
      if (oldest) this.forget([oldest]);
    }
  }

  /** The person drawn last is on top, and is also the one a click picks first. */
  private bringToFront(person: Person): void {
    this.people = [...this.people.filter((other) => other !== person), person];
    person.bringToTop();
  }

  /** Take people out of the game for good. */
  private forget(leaving: readonly Person[]): void {
    if (leaving.length === 0) return;
    for (const person of leaving) {
      if (this.dragged === person) this.dragged = null;
      if (this.bubbles.target === person) this.bubbles.close();
      if (this.lastClick?.target === person) this.lastClick = null;
      person.destroy();
    }
    this.people = this.people.filter((person) => !leaving.includes(person));
  }

  private showHit(x: number, y: number, deadly: boolean): void {
    const hit = this.add
      .text(x, y, deadly ? HIT_FX.deadEmoji : HIT_FX.emoji, { fontSize: HIT_FX.fontSize })
      .setOrigin(0.5)
      .setDepth(HIT_FX.depth);
    this.tweens.add({
      targets: hit,
      alpha: 0,
      scale: HIT_FX.grow,
      duration: deadly ? HIT_FX.deadMs : HIT_FX.ms,
      onComplete: () => {
        hit.destroy();
      },
    });
  }
}
