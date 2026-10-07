import type Phaser from 'phaser';
import { BLOOD, DOLL, EXTRA_COLORS, PERSON, type PersonLook, type WoundKind } from '../config';
import { shade } from '../logic/color';
import { STAND, type Pose } from '../logic/pose';

/**
 * Where the parts of a doll are. The spot between the feet is (0, 0), the doll
 * stands `PERSON.height` tall above it and faces right.
 */
const SHAPE = {
  head: { y: -104, radius: 15 },
  neck: { y: -91, radius: 5 },
  chest: { x: -15, y: -90, width: 30, height: 26, round: 8 },
  waist: { y: -62, radius: 7 },
  hips: { x: -13, y: -62, width: 26, height: 13, round: 6 },
  hip: { x: 7, y: -54 },
  shoulder: { x: 19, y: -86 },
  thigh: { width: 12, length: 24 },
  shin: { width: 11, length: 22 },
  foot: { back: 6, length: 17, height: 8 },
  upperArm: { width: 10, length: 19 },
  forearm: { width: 9, length: 17 },
  hand: { radius: 5.5 },
  jointRadius: 5.5,
  eye: { y: -103, back: 1, front: 9, radius: 2 },
} as const;

type Graphics = Phaser.GameObjects.Graphics;
type Container = Phaser.GameObjects.Container;

/** An arm or a leg: the upper half turns at the shoulder or hip, the lower half at the joint. */
interface Limb {
  upper: Container;
  lower: Container;
}

/**
 * A jointed doll drawn with code (no image files), shaded to look round. Arms and
 * legs are separate parts with elbows and knees, so the doll can move and flop.
 */
export class PersonFigure {
  readonly container: Container;
  private readonly frontArm: Limb;
  private readonly backArm: Limb;
  private readonly frontLeg: Limb;
  private readonly backLeg: Limb;
  /** Chest, arms and head: bends at the waist. */
  private readonly upperBody: Container;
  /** Tips at the neck. */
  private readonly headPart: Container;
  private readonly eyes: Graphics;
  private readonly deadEyes: Graphics;
  private readonly brows: Graphics;
  /** The wound marks on its chest: one more for every time it is hurt. */
  private readonly wounds: Graphics;
  private woundCount = 0;
  /** A knight's face is hidden behind its helmet: no eyes, no eyebrows. */
  private readonly faceless: boolean;
  private readonly bloodColor: number;
  private current: Pose = STAND;

  constructor(scene: Phaser.Scene, look: PersonLook) {
    const paint = new Painter(scene, look);
    const { waist, neck, shoulder, hip } = SHAPE;
    this.backLeg = paint.leg(-hip.x, hip.y);
    this.frontLeg = paint.leg(hip.x, hip.y);
    // Arms hang from the upper body, so their shoulders are measured from the waist
    this.backArm = paint.arm(-shoulder.x, shoulder.y - waist.y);
    this.frontArm = paint.arm(shoulder.x, shoulder.y - waist.y);
    this.faceless = look.extra === 'helmet';
    this.bloodColor = look.blood ?? BLOOD.color;
    this.wounds = scene.make.graphics({}, false).setPosition(0, -waist.y);
    this.eyes = paint.eyes().setVisible(!this.faceless);
    this.deadEyes = paint.deadEyes().setVisible(false);
    this.brows = paint.angryBrows().setVisible(false);

    // The parts are drawn where they are on a standing doll, so each bending part
    // is moved back by the spot it bends around
    const face = [paint.head(), this.eyes, this.deadEyes, this.brows];
    face.forEach((part) => part.setPosition(0, -neck.y));
    this.headPart = scene.make.container({ x: 0, y: neck.y - waist.y }, false).add(face);
    this.upperBody = scene.make
      .container({ x: 0, y: waist.y }, false)
      .add([
        this.backArm.upper,
        paint.chest().setPosition(0, -waist.y),
        this.wounds,
        this.headPart,
        this.frontArm.upper,
      ]);

    this.container = scene.add.container(0, 0, [
      this.backLeg.upper,
      this.frontLeg.upper,
      paint.hips(),
      this.upperBody,
    ]);
  }

  /** The pose the doll is in right now. */
  get pose(): Pose {
    return this.current;
  }

  setPose(pose: Pose): void {
    this.current = pose;
    this.frontArm.upper.rotation = pose.frontArm;
    this.frontArm.lower.rotation = pose.frontElbow;
    this.backArm.upper.rotation = pose.backArm;
    this.backArm.lower.rotation = pose.backElbow;
    this.frontLeg.upper.rotation = pose.frontLeg;
    this.frontLeg.lower.rotation = pose.frontKnee;
    this.backLeg.upper.rotation = pose.backLeg;
    this.backLeg.lower.rotation = pose.backKnee;
    this.upperBody.rotation = pose.waist;
    this.headPart.rotation = pose.head;
  }

  /** Angry eyebrows on or off. */
  setAngry(angry: boolean): void {
    this.brows.setVisible(angry && !this.faceless);
  }

  /** A doll with no lives left gets crosses for eyes. */
  setDead(dead: boolean): void {
    this.eyes.setVisible(!dead && !this.faceless);
    this.deadEyes.setVisible(dead && !this.faceless);
    if (dead) this.brows.setVisible(false);
  }

  /**
   * A new mark somewhere on the chest, in the shape of what made it: a bruise, a
   * slash, a stab wound, a bullet hole or a burn.
   */
  addWound(kind: WoundKind, random: () => number = Math.random): void {
    if (this.woundCount >= BLOOD.maxWounds) return;
    this.woundCount += 1;
    const { chest } = SHAPE;
    const x = chest.x + 6 + random() * (chest.width - 12);
    const y = chest.y + 6 + random() * (chest.height - 13);
    const g = this.wounds;
    const blood = this.bloodColor;
    const dark = shade(blood, -0.5);
    const marks = BLOOD.marks;
    /** A thin line of blood running down from the mark. */
    const trickle = (fromX: number, fromY: number, length: number): void => {
      g.fillStyle(blood);
      g.fillRoundedRect(fromX - 0.9, fromY, 1.8, length, 0.9);
      g.fillCircle(fromX, fromY + length, 1.3);
    };

    switch (kind) {
      case 'bruise':
        // A blotch that is dark in the middle and sickly at the edge
        g.fillStyle(marks.bruiseEdge, 0.45);
        g.fillEllipse(x, y, 13 + random() * 3, 10 + random() * 2);
        g.fillStyle(marks.bruise, 0.75);
        g.fillEllipse(x + 0.5, y + 0.3, 9, 7);
        g.fillStyle(dark, 0.55);
        g.fillEllipse(x - 1, y - 0.5, 4.5, 3.2);
        break;
      case 'slash': {
        // A long slanted cut, wide open in the middle, with blood running from it
        const lean = random() < 0.5 ? 1 : -1;
        const half = 7 + random() * 2.5;
        const rise = half * 0.75 * lean;
        g.lineStyle(4, dark);
        g.lineBetween(x - half, y - rise, x + half, y + rise);
        g.lineStyle(2, blood);
        g.lineBetween(x - half + 1, y - rise * 0.85, x + half - 1, y + rise * 0.85);
        trickle(x - half * 0.4, y - rise * 0.4, 4 + random() * 6);
        trickle(x + half * 0.5, y + rise * 0.5, 3 + random() * 5);
        break;
      }
      case 'stab':
        // A narrow, deep wound with a long trickle
        g.fillStyle(dark);
        g.fillEllipse(x, y, 4.5, 8);
        g.fillStyle(marks.hole);
        g.fillEllipse(x, y, 2, 5.5);
        g.lineStyle(1.2, blood);
        g.strokeEllipse(x, y, 5.5, 9);
        trickle(x, y + 3, 7 + random() * 7);
        break;
      case 'hole':
        // A small round bullet hole with a torn red rim
        g.fillStyle(blood);
        g.fillCircle(x, y, 4);
        g.fillStyle(dark);
        g.fillCircle(x, y, 3);
        g.fillStyle(marks.hole);
        g.fillCircle(x, y, 2);
        trickle(x + 0.5, y + 2.5, 3 + random() * 5);
        break;
      case 'burn':
        // A sooty scorch mark made of several patches, with a few glowing embers
        for (let i = 0; i < 5; i++) {
          g.fillStyle(marks.burn, 0.55 + random() * 0.3);
          g.fillCircle(x + (random() - 0.5) * 12, y + (random() - 0.5) * 9, 3 + random() * 3.5);
        }
        g.fillStyle(marks.ember);
        for (let i = 0; i < 3; i++) {
          g.fillCircle(x + (random() - 0.5) * 10, y + (random() - 0.5) * 8, 0.9);
        }
        break;
    }
  }

  /** Put something into the front hand. It moves with the arm from now on. */
  holdInHand(thing: Container, rotation: number, along: number): void {
    this.frontArm.lower.add(thing);
    thing.setPosition(0, SHAPE.forearm.length + 2 + along);
    thing.rotation = rotation;
  }

  /** Take it out of the hand again and put it back into the area. */
  letGoOf(thing: Container): void {
    this.frontArm.lower.remove(thing);
    thing.addToDisplayList();
  }

  destroy(): void {
    this.container.destroy();
  }
}

/** Draws the parts of one doll in its colors. */
class Painter {
  private readonly rim: number;
  private readonly shine: number;
  private readonly jointRim: number;
  private readonly jointShine: number;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly look: PersonLook,
  ) {
    this.rim = shade(look.body, DOLL.rim);
    this.shine = shade(look.body, DOLL.shine);
    this.jointRim = shade(look.joint, DOLL.rim);
    this.jointShine = shade(look.joint, DOLL.shine);
  }

  leg(hipX: number, hipY: number): Limb {
    const { thigh, shin, foot } = SHAPE;
    const lowerShape = this.blank();
    this.tube(lowerShape, shin.width, shin.length);
    this.block(lowerShape, -foot.back, shin.length - 2, foot.length, foot.height, 3);
    const upperShape = this.blank();
    this.tube(upperShape, thigh.width, thigh.length);
    this.ball(upperShape, 0, 0, SHAPE.jointRadius + 1);
    return this.limb(hipX, hipY, upperShape, thigh.length, lowerShape);
  }

  arm(shoulderX: number, shoulderY: number): Limb {
    const { upperArm, forearm, hand } = SHAPE;
    const lowerShape = this.blank();
    this.tube(lowerShape, forearm.width, forearm.length);
    this.ball(lowerShape, 0, forearm.length + 2, hand.radius, false);
    const upperShape = this.blank();
    this.tube(upperShape, upperArm.width, upperArm.length);
    this.ball(upperShape, 0, 0, SHAPE.jointRadius + 0.5);
    return this.limb(shoulderX, shoulderY, upperShape, upperArm.length, lowerShape);
  }

  hips(): Graphics {
    const g = this.blank();
    const { hips } = SHAPE;
    this.block(g, hips.x, hips.y, hips.width, hips.height, hips.round);
    return g;
  }

  /** The chest, with the ball joints of the waist and the neck. */
  chest(): Graphics {
    const g = this.blank();
    const { chest, waist, neck } = SHAPE;
    this.ball(g, 0, waist.y, waist.radius);
    this.block(g, chest.x, chest.y, chest.width, chest.height, chest.round);
    if (this.look.extra === 'patches') {
      // A zombie's chest has dark, rotten patches
      g.fillStyle(EXTRA_COLORS.patches.blotch, 0.85);
      g.fillCircle(chest.x + 9, chest.y + 9, 4.5);
      g.fillCircle(chest.x + 20, chest.y + 17, 3.5);
      g.fillCircle(chest.x + 7, chest.y + 20, 2.5);
    }
    this.ball(g, 0, neck.y, neck.radius);
    return g;
  }

  head(): Graphics {
    const g = this.blank();
    const { head } = SHAPE;
    const top = head.y - head.radius;
    const back = -head.radius;
    if (this.look.extra === 'headband') {
      // The loose ends of a ninja's headband flutter behind the head
      const c = EXTRA_COLORS.headband;
      g.fillStyle(c.dark);
      g.fillTriangle(back + 2, head.y - 8, back - 13, head.y - 12, back - 9, head.y - 4);
      g.fillStyle(c.band);
      g.fillTriangle(back + 2, head.y - 6, back - 12, head.y - 3, back - 6, head.y + 3);
    }
    if (this.look.extra === 'antenna') {
      const c = EXTRA_COLORS.antenna;
      g.lineStyle(2, c.rod);
      g.lineBetween(0, top + 1, 0, top - 9);
      g.fillStyle(c.ball);
      g.fillCircle(0, top - 10, 3);
    }
    if (this.look.extra === 'helmet') {
      // The crest on top of a knight's helmet
      const c = EXTRA_COLORS.helmet;
      g.fillStyle(c.crestDark);
      g.fillTriangle(-9, top + 3, 5, top + 1, -13, top - 12);
      g.fillStyle(c.crest);
      g.fillTriangle(-7, top + 2, 4, top + 1, -10, top - 9);
    }

    g.fillStyle(this.rim);
    g.fillCircle(0, head.y, head.radius);
    g.fillStyle(this.look.body);
    g.fillCircle(0, head.y, head.radius - DOLL.rimWidth);
    // A round shine on top makes the head look like a ball
    g.fillStyle(this.shine, DOLL.shineAlpha);
    g.fillEllipse(-1, head.y - head.radius * 0.45, head.radius * 1.1, head.radius * 0.6);

    if (this.look.extra === 'headband') {
      const c = EXTRA_COLORS.headband;
      g.fillStyle(c.dark);
      g.fillRect(back + 1.5, head.y - 10, head.radius * 2 - 3, 6);
      g.fillStyle(c.band);
      g.fillRect(back + 1.5, head.y - 10, head.radius * 2 - 3, 4.5);
    }
    if (this.look.extra === 'helmet') {
      // A dark slit to see through
      g.fillStyle(EXTRA_COLORS.helmet.visor);
      g.fillRoundedRect(-4, head.y - 3.5, head.radius + 3, 5, 2);
    }
    return g;
  }

  /** Round dot eyes, a little to the front, so you can see which way the doll looks. */
  eyes(): Graphics {
    const g = this.blank();
    const { eye } = SHAPE;
    g.fillStyle(this.look.eye ?? PERSON.face.eye);
    if (this.look.extra === 'antenna') {
      // A robot has square eyes
      g.fillRect(eye.back - 2.2, eye.y - 2.2, 4.4, 4.4);
      g.fillRect(eye.front - 2.2, eye.y - 2.2, 4.4, 4.4);
    } else {
      g.fillCircle(eye.back, eye.y, eye.radius);
      g.fillCircle(eye.front, eye.y, eye.radius);
    }
    return g;
  }

  deadEyes(): Graphics {
    const g = this.blank();
    const { eye } = SHAPE;
    const size = eye.radius + 1;
    g.lineStyle(1.8, PERSON.face.eye);
    for (const x of [eye.back, eye.front]) {
      g.lineBetween(x - size, eye.y - size, x + size, eye.y + size);
      g.lineBetween(x - size, eye.y + size, x + size, eye.y - size);
    }
    return g;
  }

  angryBrows(): Graphics {
    const g = this.blank();
    const { eye } = SHAPE;
    g.lineStyle(2.5, PERSON.face.angryBrow);
    g.lineBetween(eye.back - 4, eye.y - 7, eye.back + 3, eye.y - 3);
    g.lineBetween(eye.front + 4, eye.y - 7, eye.front - 3, eye.y - 3);
    return g;
  }

  private blank(): Graphics {
    return this.scene.make.graphics({}, false);
  }

  /** Put an upper and a lower half together, with a ball joint between them. */
  private limb(
    x: number,
    y: number,
    upperShape: Graphics,
    length: number,
    lowerShape: Graphics,
  ): Limb {
    const joint = this.blank();
    this.ball(joint, 0, 0, SHAPE.jointRadius);
    const lower = this.scene.make.container({ x: 0, y: length }, false).add([lowerShape, joint]);
    const upper = this.scene.make.container({ x, y }, false).add([upperShape, lower]);
    return { upper, lower };
  }

  /** A round tube hanging down from (0, 0): dark rim, body color, bright stripe. */
  private tube(g: Graphics, width: number, length: number): void {
    this.block(g, -width / 2, -2, width, length + 4, width / 2);
  }

  /** A rounded block of the body, shaded like the tubes. */
  private block(
    g: Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    round: number,
  ): void {
    const rim = DOLL.rimWidth;
    g.fillStyle(this.rim);
    g.fillRoundedRect(x, y, width, height, round);
    g.fillStyle(this.look.body);
    g.fillRoundedRect(
      x + rim,
      y + rim,
      width - rim * 2,
      height - rim * 2,
      Math.max(1, round - rim),
    );
    g.fillStyle(this.shine, DOLL.shineAlpha);
    const stripe = width * 0.3;
    g.fillRoundedRect(
      x + (width - stripe) / 2,
      y + rim + 1,
      stripe,
      height - rim * 2 - 2,
      stripe / 2,
    );
  }

  /** A ball: a joint between two parts, or a hand when `joint` is false. */
  private ball(g: Graphics, x: number, y: number, radius: number, joint = true): void {
    g.fillStyle(joint ? this.jointRim : this.rim);
    g.fillCircle(x, y, radius);
    g.fillStyle(joint ? this.look.joint : this.look.body);
    g.fillCircle(x, y, radius - DOLL.rimWidth);
    g.fillStyle(joint ? this.jointShine : this.shine, DOLL.shineAlpha);
    g.fillCircle(x, y - radius * 0.3, radius * 0.4);
  }
}
