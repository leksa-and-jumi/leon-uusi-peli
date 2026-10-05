import type Phaser from 'phaser';
import { PERSON, type PersonLook } from '../config';
import { fallStep, type Fall } from '../logic/fall';
import { drawPerson } from './personShape';

/** A person put into the area. They drop from where you clicked and land on the floor. */
export class Person {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private fall: Fall;

  constructor(scene: Phaser.Scene, look: PersonLook, x: number, feetY: number) {
    this.graphics = scene.add.graphics();
    drawPerson(this.graphics, look);
    this.graphics.setPosition(x, feetY);
    this.fall = { y: feetY, speed: 0, landed: false };
  }

  update(deltaMs: number, floorY: number): void {
    if (this.fall.landed) return;
    this.fall = fallStep(this.fall, PERSON.gravity, floorY, deltaMs);
    this.graphics.y = this.fall.y;
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
