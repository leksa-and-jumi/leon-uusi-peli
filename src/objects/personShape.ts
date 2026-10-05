import type Phaser from 'phaser';
import { PERSON, type PersonLook } from '../config';

/**
 * Draws a person with code (no image files). The spot between the feet is at (0, 0)
 * and the person stands `PERSON.height` tall above it.
 */
export function drawPerson(g: Phaser.GameObjects.Graphics, look: PersonLook): void {
  const headY = -104;
  const headR = 15;

  // Shoes
  g.fillStyle(look.shoes);
  g.fillRoundedRect(-16, -9, 15, 9, 3);
  g.fillRoundedRect(1, -9, 15, 9, 3);

  // Legs
  g.fillStyle(look.pants);
  g.fillRect(-13, -54, 11, 46);
  g.fillRect(2, -54, 11, 46);

  // Long hair hangs behind the shoulders
  if (look.hairStyle === 'long') {
    g.fillStyle(look.hair);
    g.fillRoundedRect(-18, headY - 6, 36, 34, 8);
  }

  // Arms: sleeves, then hands
  g.fillStyle(look.shirt);
  g.fillRoundedRect(-24, -90, 9, 26, 4);
  g.fillRoundedRect(15, -90, 9, 26, 4);
  g.fillStyle(look.skin);
  g.fillRoundedRect(-23, -66, 7, 16, 3);
  g.fillRoundedRect(16, -66, 7, 16, 3);

  // Body
  g.fillStyle(look.shirt);
  g.fillRoundedRect(-16, -92, 32, 42, 6);

  // Neck and head
  g.fillStyle(look.skin);
  g.fillRect(-4, -94, 8, 6);
  g.fillCircle(0, headY, headR);

  drawHair(g, look, headY, headR);

  // Face
  g.fillStyle(PERSON.face.eye);
  g.fillCircle(-5, headY + 1, 1.8);
  g.fillCircle(5, headY + 1, 1.8);
  g.fillStyle(PERSON.face.mouth);
  g.fillRoundedRect(-4, headY + 7, 8, 2, 1);
}

function drawHair(
  g: Phaser.GameObjects.Graphics,
  look: PersonLook,
  headY: number,
  headR: number,
): void {
  if (look.hairStyle === 'bald') return;
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
