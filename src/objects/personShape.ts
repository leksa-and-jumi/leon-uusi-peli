import type Phaser from 'phaser';
import { PERSON, type PersonLook } from '../config';
import type { Pose } from '../logic/pose';

/**
 * Where the parts of a person are. The spot between the feet is (0, 0), the person
 * stands `PERSON.height` tall above it and faces right.
 */
const SHAPE = {
  headY: -104,
  headR: 15,
  hip: { x: 7.5, y: -54 },
  shoulder: { x: 19.5, y: -88 },
  leg: { width: 11, length: 46 },
  shoe: { back: 6.5, length: 16, height: 9 },
  sleeve: { width: 9, length: 27 },
  hand: { width: 7, length: 16 },
} as const;

/**
 * A person drawn with code (no image files). Arms and legs are separate parts,
 * so they can swing for walking, dancing and punching.
 */
export class PersonFigure {
  readonly container: Phaser.GameObjects.Container;
  private readonly frontArm: Phaser.GameObjects.Graphics;
  private readonly backArm: Phaser.GameObjects.Graphics;
  private readonly frontLeg: Phaser.GameObjects.Graphics;
  private readonly backLeg: Phaser.GameObjects.Graphics;
  private readonly brows: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, look: PersonLook) {
    this.backLeg = drawLeg(scene.make.graphics({}, false), look).setPosition(
      -SHAPE.hip.x,
      SHAPE.hip.y,
    );
    this.frontLeg = drawLeg(scene.make.graphics({}, false), look).setPosition(
      SHAPE.hip.x,
      SHAPE.hip.y,
    );
    const upper = drawUpper(scene.make.graphics({}, false), look);
    this.backArm = drawArm(scene.make.graphics({}, false), look).setPosition(
      -SHAPE.shoulder.x,
      SHAPE.shoulder.y,
    );
    this.frontArm = drawArm(scene.make.graphics({}, false), look).setPosition(
      SHAPE.shoulder.x,
      SHAPE.shoulder.y,
    );
    this.brows = drawAngryBrows(scene.make.graphics({}, false)).setVisible(false);

    this.container = scene.add.container(0, 0, [
      this.backLeg,
      this.frontLeg,
      upper,
      this.backArm,
      this.frontArm,
      this.brows,
    ]);
  }

  setPose(pose: Pose): void {
    this.frontArm.rotation = pose.frontArm;
    this.backArm.rotation = pose.backArm;
    this.frontLeg.rotation = pose.frontLeg;
    this.backLeg.rotation = pose.backLeg;
  }

  /** Angry eyebrows on or off. */
  setAngry(angry: boolean): void {
    this.brows.setVisible(angry);
  }

  destroy(): void {
    this.container.destroy();
  }
}

function drawLeg(g: Phaser.GameObjects.Graphics, look: PersonLook): Phaser.GameObjects.Graphics {
  const { leg, shoe } = SHAPE;
  g.fillStyle(look.pants);
  g.fillRect(-leg.width / 2, 0, leg.width, leg.length);
  g.fillStyle(look.shoes);
  g.fillRoundedRect(-shoe.back, leg.length - 1, shoe.length, shoe.height, 3);
  return g;
}

function drawArm(g: Phaser.GameObjects.Graphics, look: PersonLook): Phaser.GameObjects.Graphics {
  const { sleeve, hand } = SHAPE;
  g.fillStyle(look.skin);
  g.fillRoundedRect(-hand.width / 2, sleeve.length - 5, hand.width, hand.length, 3);
  g.fillStyle(look.shirt);
  g.fillRoundedRect(-sleeve.width / 2, -3, sleeve.width, sleeve.length, 4);
  return g;
}

/** Body, neck, head, hair and face. */
function drawUpper(g: Phaser.GameObjects.Graphics, look: PersonLook): Phaser.GameObjects.Graphics {
  const { headY, headR } = SHAPE;

  // Long hair hangs behind the shoulders
  if (look.hairStyle === 'long') {
    g.fillStyle(look.hair);
    g.fillRoundedRect(-headR - 3, headY - 6, headR * 2 + 6, 34, 8);
  }

  g.fillStyle(look.shirt);
  g.fillRoundedRect(-16, -92, 32, 42, 6);

  g.fillStyle(look.skin);
  g.fillRect(-4, -94, 8, 6);
  g.fillCircle(0, headY, headR);
  // The nose shows which way the person looks
  g.fillCircle(headR, headY + 3, 3.5);

  drawHair(g, look);

  g.fillStyle(PERSON.face.eye);
  g.fillCircle(-1, headY + 1, 1.8);
  g.fillCircle(8, headY + 1, 1.8);
  g.fillStyle(PERSON.face.mouth);
  g.fillRoundedRect(1, headY + 7, 8, 2, 1);
  return g;
}

function drawHair(g: Phaser.GameObjects.Graphics, look: PersonLook): void {
  if (look.hairStyle === 'bald') return;
  const { headY, headR } = SHAPE;
  g.fillStyle(look.hair);

  if (look.hairStyle === 'spiky') {
    for (let i = -2; i <= 2; i++) {
      const x = i * 6;
      g.fillTriangle(x - 5, headY - 9, x + 5, headY - 9, x + i, headY - 26);
    }
  }

  // The top half of the head: hair, or the cap
  g.beginPath();
  g.arc(0, headY - 3, headR + 1, Math.PI, Math.PI * 2);
  g.closePath();
  g.fillPath();

  if (look.hairStyle === 'cap') {
    g.fillRoundedRect(0, headY - 6, headR + 10, 4, 2);
  }
}

function drawAngryBrows(g: Phaser.GameObjects.Graphics): Phaser.GameObjects.Graphics {
  const { headY } = SHAPE;
  g.lineStyle(2.5, PERSON.face.angryBrow);
  g.lineBetween(-5, headY - 6, 2, headY - 2);
  g.lineBetween(12, headY - 6, 5, headY - 2);
  return g;
}
