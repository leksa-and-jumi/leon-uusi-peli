import type Phaser from 'phaser';
import { DOLL, PERSON, type PersonLook } from '../config';
import { shade } from '../logic/color';
import type { Pose } from '../logic/pose';

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

  constructor(scene: Phaser.Scene, look: PersonLook) {
    const paint = new Painter(scene, look);
    const { waist, neck, shoulder, hip } = SHAPE;
    this.backLeg = paint.leg(-hip.x, hip.y);
    this.frontLeg = paint.leg(hip.x, hip.y);
    // Arms hang from the upper body, so their shoulders are measured from the waist
    this.backArm = paint.arm(-shoulder.x, shoulder.y - waist.y);
    this.frontArm = paint.arm(shoulder.x, shoulder.y - waist.y);
    this.eyes = paint.eyes();
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

  setPose(pose: Pose): void {
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
    this.brows.setVisible(angry);
  }

  /** A doll with no lives left gets crosses for eyes. */
  setDead(dead: boolean): void {
    this.eyes.setVisible(!dead);
    this.deadEyes.setVisible(dead);
    if (dead) this.brows.setVisible(false);
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
    this.ball(g, 0, neck.y, neck.radius);
    return g;
  }

  head(): Graphics {
    const g = this.blank();
    const { head } = SHAPE;
    g.fillStyle(this.rim);
    g.fillCircle(0, head.y, head.radius);
    g.fillStyle(this.look.body);
    g.fillCircle(0, head.y, head.radius - DOLL.rimWidth);
    // A round shine on top makes the head look like a ball
    g.fillStyle(this.shine, DOLL.shineAlpha);
    g.fillEllipse(-1, head.y - head.radius * 0.45, head.radius * 1.1, head.radius * 0.6);
    return g;
  }

  /** Round dot eyes, a little to the front, so you can see which way the doll looks. */
  eyes(): Graphics {
    const g = this.blank();
    const { eye } = SHAPE;
    g.fillStyle(PERSON.face.eye);
    g.fillCircle(eye.back, eye.y, eye.radius);
    g.fillCircle(eye.front, eye.y, eye.radius);
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
