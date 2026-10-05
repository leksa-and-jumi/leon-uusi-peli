import Phaser from 'phaser';
import { COLORS, FLOOR, GAME_HEIGHT, GAME_WIDTH, HINT_TEXT, MENU, PERSON } from '../config';
import { placeFeet } from '../logic/place';
import { PeopleMenu } from '../objects/PeopleMenu';
import { Person } from '../objects/Person';

const FLOOR_Y = GAME_HEIGHT - FLOOR.height;

/** The area: pick a person from the menu, then click to put them in. */
export class MainScene extends Phaser.Scene {
  private menu!: PeopleMenu;
  private people: Person[] = [];

  constructor() {
    super('MainScene');
  }

  create(): void {
    this.people = [];
    this.add.rectangle(0, FLOOR_Y, GAME_WIDTH, FLOOR.height, FLOOR.color).setOrigin(0);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 36, HINT_TEXT, {
        fontSize: '18px',
        color: COLORS.text,
        align: 'center',
      })
      .setOrigin(0.5);

    this.menu = new PeopleMenu(this);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.menu.covers(pointer.y)) {
        this.menu.click(pointer.x, pointer.y);
      } else {
        this.addPerson(pointer.x, pointer.y);
      }
    });
  }

  update(_time: number, delta: number): void {
    for (const person of this.people) {
      person.update(delta, FLOOR_Y);
    }
  }

  private addPerson(px: number, py: number): void {
    const area = { left: 0, right: GAME_WIDTH, top: MENU.height, floorY: FLOOR_Y };
    const feet = placeFeet(px, py, area, PERSON);
    this.people.push(new Person(this, this.menu.selected, feet.x, feet.y));
    if (this.people.length > PERSON.max) {
      this.people.shift()?.destroy();
    }
  }
}
