import type Phaser from 'phaser';
import {
  ASHEN,
  BLOOD,
  CRAZY,
  UNICORN,
  GEAR,
  JET,
  MUSCLE,
  POWER,
  type GearKind,
  type GearSlot,
  CHARRED,
  DOLL,
  EXTRA_COLORS,
  HORROR,
  ICE,
  PERSON,
  SOOT,
  type PersonLook,
  type WoundKind,
} from '../config';
import { blowOrder, blownOff, toArea, toPicture } from '../logic/ash';
import { drawGear, drawGearPart } from './gearShapes';
import { shade } from '../logic/color';
import type { Spot } from '../logic/pick';
import type { Facing } from '../logic/walk';
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

/**
 * Where the middle of a piece of gear is on a doll. The one on the arm is measured
 * from the shoulder of the front arm, down the arm, and the one on each foot from the
 * knee, down the shin; the others from between the feet.
 */
const GEAR_AT: Record<GearSlot, { x: number; y: number }> = {
  face: { x: 5, y: -100 },
  head: { x: 0, y: -114 },
  chest: { x: 0, y: -77 },
  arm: { x: 4, y: 17 },
  feet: { x: 2, y: 19 },
  back: { x: -24, y: -77 },
  // Measured down each thigh from the hip, and down each forearm from the elbow
  legs: { x: 0.5, y: 11.5 },
  hands: { x: 0, y: 12.5 },
};

type Graphics = Phaser.GameObjects.Graphics;
type Container = Phaser.GameObjects.Container;

/** A solid shape drawn on a picture: is this spot of the picture in it? */
interface SolidShape {
  g: Graphics;
  inside: (x: number, y: number) => boolean;
}

/** The parts a blade can cut off a doll. `upperBody` is everything above the waist. */
export type BodyPart = 'head' | 'frontArm' | 'backArm' | 'frontLeg' | 'backLeg' | 'upperBody';
export const BODY_PARTS: readonly BodyPart[] = [
  'head',
  'frontArm',
  'backArm',
  'frontLeg',
  'backLeg',
  'upperBody',
];

/** A part that has been cut off: its picture, loose in the area, and where it is. */
export interface LoosePart {
  picture: Container;
  x: number;
  y: number;
  /** How far above the floor its middle is when it lies flat. */
  lift: number;
  /** How far it reaches to each side of where it is held, lying flat. */
  reach: number;
}

/** An arm or a leg: the upper half turns at the shoulder or hip, the lower half at the joint. */
interface Limb {
  upper: Container;
  lower: Container;
}

/**
 * A jointed doll drawn with code (no image files), shaded to look round. Arms and
 * legs are separate parts with elbows and knees, so the doll can move and flop.
 */
/** The creepy faces of horror mode. */
type HorrorFace = 'grin' | 'stitched' | 'scream' | 'hollow' | 'smile';
const HORROR_FACES: readonly HorrorFace[] = ['grin', 'stitched', 'scream', 'hollow', 'smile'];
/** The faces of crazy mode. */
type CrazyFace = 'spiral' | 'googly' | 'crossed';
const CRAZY_FACES: readonly CrazyFace[] = ['spiral', 'googly', 'crossed'];

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
  /** Its eyelids: shut for a moment whenever it blinks. */
  private readonly lids: Graphics;
  /** The pale crosses it has for eyes once a laser has turned it to ash. */
  private readonly ashEyes: Graphics;
  private readonly brows: Graphics;
  /**
   * Horror mode: a creepy face over its own (dark eyes, a grin full of teeth, a crack),
   * a red glow in the eyes while it is alive, and claws on both hands.
   */
  private readonly horrorFace: Graphics;
  private readonly horrorEyes: Graphics;
  private readonly claws: Graphics[];
  private horror = false;
  /** Crazy mode: a crazy face over its own while it is alive. */
  private readonly crazyFace: Graphics;
  private crazy = false;
  /** The green bottle an angry doll drinks from in crazy mode. */
  private readonly bottle: Graphics;
  private drinking = false;
  private readonly paint: Painter;
  /** The shadow monster is creepy as it is: it keeps its own face, and always has claws. */
  private readonly ghastly: boolean;
  private angry = false;
  private lifeless = false;
  /** The wound marks on its chest: one more for every time it is hurt. */
  private readonly wounds: Graphics;
  /**
   * How many times its usual size it is, and the muscles that bulge on it when it is
   * bigger. They are made the first time they are needed, in the color of its skin.
   */
  private size = 1;
  private muscles: Graphics[] = [];
  private readonly skin: number;
  /** The glow around a doll with a superpower. Made the first time it is needed. */
  private aura: Graphics | null = null;
  /** The gear it has on: the picture of each piece. */
  private readonly gear = new Map<GearSlot, Graphics[]>();
  private woundCount = 0;
  /** A knight's face is hidden behind its helmet: no eyes, no eyebrows. */
  private readonly faceless: boolean;
  private readonly bloodColor: number;
  private current: Pose = STAND;
  /** The part a blade has cut off, which isn't this doll's to move any more. */
  private severed: BodyPart | null = null;
  private readonly scene: Phaser.Scene;
  /** The block of ice around it while it is frozen. Made the first time it is needed. */
  private ice: Graphics | null = null;
  /** Burnt down to a black skeleton. What draws each of its parts again as bones. */
  private charred = false;
  /** Burnt by lava: its bones are much thinner than a skeleton's usually are. */
  private wasted = false;
  private readonly toBones: readonly { part: BodyPart | 'trunk'; redraw: () => void }[];
  /** What covers each of its parts in soot, when lightning singes it. */
  private readonly toSoot: readonly ((color: number, alpha: number) => void)[];
  private singed = false;
  /** A laser has turned it to ash. */
  private ashen = false;
  /** The shapes it is made of, to work out which little squares of ash it is made of. */
  private readonly solidShapes: readonly SolidShape[];
  /**
   * Once the wind is at a doll of ash, it is drawn as little squares of ash: where
   * they are, in the order they go, how many have gone, and its two crosses for eyes.
   */
  private squares: {
    picture: Graphics;
    spots: readonly (Spot & { shade: number })[];
    gone: number;
    eyes: readonly { from: Spot; to: Spot; lastsUntil: number }[];
  } | null = null;

  constructor(scene: Phaser.Scene, look: PersonLook) {
    this.scene = scene;
    const paint = new Painter(scene, look);
    const { waist, neck, shoulder, hip } = SHAPE;
    paint.part = 'backLeg';
    this.backLeg = paint.leg(-hip.x, hip.y);
    paint.part = 'frontLeg';
    this.frontLeg = paint.leg(hip.x, hip.y);
    // Arms hang from the upper body, so their shoulders are measured from the waist
    paint.part = 'backArm';
    this.backArm = paint.arm(-shoulder.x, shoulder.y - waist.y);
    paint.part = 'frontArm';
    this.frontArm = paint.arm(shoulder.x, shoulder.y - waist.y);
    paint.part = 'trunk';
    this.faceless = look.extra === 'helmet';
    this.bloodColor = look.blood ?? BLOOD.color;
    this.skin = look.human?.skin ?? look.body;
    this.wounds = scene.make.graphics({}, false).setPosition(0, -waist.y);
    this.eyes = paint.eyes().setVisible(!this.faceless);
    this.deadEyes = paint.deadEyes().setVisible(false);
    this.ashEyes = paint.deadEyes(ASHEN.eye).setVisible(false);
    this.lids = paint.lids(this.skin).setVisible(false);
    this.brows = paint.angryBrows().setVisible(false);
    // Each doll has its own creepy face in horror mode
    const creepy = HORROR_FACES[Math.floor(Math.random() * HORROR_FACES.length)] ?? 'grin';
    this.ghastly = look.extra === 'shadow';
    this.horrorFace = paint.horrorFace(creepy).setVisible(false);
    this.horrorEyes = paint.horrorEyes(creepy).setVisible(false);
    const silly = CRAZY_FACES[Math.floor(Math.random() * CRAZY_FACES.length)] ?? 'spiral';
    this.crazyFace = paint.crazyFace(silly).setVisible(false);

    // The parts are drawn where they are on a standing doll, so each bending part
    // is moved back by the spot it bends around
    const face = [
      paint.head(),
      this.eyes,
      this.lids,
      this.deadEyes,
      this.ashEyes,
      this.brows,
      this.horrorFace,
      this.horrorEyes,
      this.crazyFace,
    ];
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
    this.claws = [this.frontArm, this.backArm].map(({ lower }) => {
      const claw = paint.claws().setVisible(false);
      lower.add(claw);
      return claw;
    });
    this.toBones = paint.toBones;
    this.paint = paint;
    this.bottle = paint.bottle().setVisible(false);
    this.frontArm.lower.add(this.bottle);
    this.toSoot = paint.toSoot;
    this.solidShapes = paint.solidShapes;
  }

  /**
   * Fire has finished the doll off: all that is left is a black skeleton. Every part
   * is drawn again as charred bone, the head as a skull, and the wounds are gone.
   */
  burnToBones(thin = false, rainbow = false): void {
    this.wasted ||= thin;
    if (this.charred || this.ashen) return;
    this.charred = true;
    this.paint.rainbowBones = rainbow;
    this.loseGear();
    this.toBones.forEach(({ redraw }) => {
      redraw();
    });
    this.wounds.clear();
    this.eyes.setVisible(false);
    this.deadEyes.setVisible(false);
    this.brows.setVisible(false);
    this.showFace();
  }

  /**
   * Lightning has finished the doll off: it is singed. Every part of it is covered in
   * soot, so that it is all dark, but it is still whole.
   */
  singe(): void {
    if (this.singed || this.charred || this.ashen) return;
    this.singed = true;
    this.toSoot.forEach((cover) => {
      cover(SOOT.color, SOOT.alpha);
    });
    this.eyes.setVisible(false);
    this.brows.setVisible(false);
    this.showFace();
  }

  /**
   * A laser has finished the doll off: it is all ash. Every part of it is black, its
   * wounds are gone, and it has pale crosses for eyes.
   */
  turnToAsh(): void {
    if (this.ashen || this.charred) return;
    this.ashen = true;
    this.loseGear();
    this.toSoot.forEach((cover) => {
      cover(ASHEN.color, ASHEN.alpha);
    });
    this.wounds.clear();
    this.eyes.setVisible(false);
    this.deadEyes.setVisible(false);
    this.brows.setVisible(false);
    this.ashEyes.setVisible(!this.faceless);
    this.showFace();
  }

  /**
   * The wind gets up on a doll of ash, blowing to that side. From now on the doll is
   * drawn as the little squares of ash it is made of, so that they can go one by one.
   */
  crumble(direction: Facing): void {
    if (this.squares) return;
    const whole = this.container.getWorldTransformMatrix();
    // Only what is still on the doll and can be seen counts: not a part that was cut off
    const shapes = this.solidShapes
      .filter(({ g }) => this.shows(g))
      .map(({ g, inside }) => ({ placing: g.getWorldTransformMatrix(), inside }));
    const { square, shades } = ASHEN;
    const reach = PERSON.height * ASHEN.reach;
    const found: (Spot & { shade: number; at: Spot })[] = [];
    for (let y = -reach; y <= reach; y += square) {
      for (let x = -reach; x <= reach; x += square) {
        const at = toArea(whole, x, y);
        const solid = shapes.some(({ placing, inside }) => {
          const spot = toPicture(placing, at.x, at.y);
          return inside(spot.x, spot.y);
        });
        if (!solid) continue;
        const pick = shades[Math.floor(Math.random() * shades.length)] ?? ASHEN.color;
        found.push({ x, y, shade: pick, at });
      }
    }
    const order = blowOrder(
      found.map(({ at }) => at),
      direction,
      ASHEN.order,
    );
    const spots = order.flatMap((index) => found[index] ?? []);
    const picture = this.scene.make.graphics({}, false);
    this.squares = { picture, spots, gone: 0, eyes: this.faceless ? [] : this.crossEyes(spots) };
    this.container.each(
      (part: Phaser.GameObjects.GameObject & { setVisible(on: boolean): unknown }) => {
        part.setVisible(false);
      },
    );
    this.container.add(picture);
    this.drawSquares();
  }

  /**
   * The wind has blown more of it away: only this share of it (0 to 1) is left. Gives
   * the spots in the area where squares of ash have just come off.
   */
  blowOff(left: number): Spot[] {
    const squares = this.squares;
    if (!squares) return [];
    const gone = Math.max(squares.gone, blownOff(squares.spots.length, left));
    if (gone === squares.gone) return [];
    const whole = this.container.getWorldTransformMatrix();
    const loose = squares.spots.slice(squares.gone, gone).map(({ x, y }) => toArea(whole, x, y));
    squares.gone = gone;
    this.drawSquares();
    return loose;
  }

  /** Is this part still on the doll, and not hidden? */
  private shows(part: Graphics): boolean {
    let at: Graphics | Container | null = part;
    while (at && at !== this.container) {
      if (!at.visible) return false;
      at = at.parentContainer;
    }
    return at === this.container;
  }

  /**
   * The two crosses it has for eyes, as lines between spots of the whole doll. Each
   * one lasts until the square of ash under it goes.
   */
  private crossEyes(spots: readonly Spot[]): { from: Spot; to: Spot; lastsUntil: number }[] {
    const whole = this.container.getWorldTransformMatrix();
    const face = this.ashEyes.getWorldTransformMatrix();
    const onDoll = (x: number, y: number): Spot => {
      const at = toArea(face, x, y);
      return toPicture(whole, at.x, at.y);
    };
    const { eye } = SHAPE;
    const size = eye.radius + 1;
    return [eye.back, eye.front].flatMap((x) => {
      const middle = onDoll(x, eye.y);
      // The square closest to the eye: the eye goes when that square does
      let closest = 0;
      spots.forEach((spot, index) => {
        const best = spots[closest] ?? spot;
        const nearer =
          Math.hypot(spot.x - middle.x, spot.y - middle.y) <
          Math.hypot(best.x - middle.x, best.y - middle.y);
        if (nearer) closest = index;
      });
      return [
        {
          from: onDoll(x - size, eye.y - size),
          to: onDoll(x + size, eye.y + size),
          lastsUntil: closest,
        },
        {
          from: onDoll(x - size, eye.y + size),
          to: onDoll(x + size, eye.y - size),
          lastsUntil: closest,
        },
      ];
    });
  }

  /** Draw the squares of ash that haven't gone yet, and the eyes that are still there. */
  private drawSquares(): void {
    const squares = this.squares;
    if (!squares) return;
    const g = squares.picture;
    // A little bigger than the squares are apart, so that no gaps show between them
    const size = ASHEN.square + 0.4;
    g.clear();
    for (let index = squares.gone; index < squares.spots.length; index++) {
      const spot = squares.spots[index];
      if (!spot) continue;
      g.fillStyle(spot.shade);
      g.fillRect(spot.x - size / 2, spot.y - size / 2, size, size);
    }
    g.lineStyle(1.8, ASHEN.eye);
    for (const { from, to, lastsUntil } of squares.eyes) {
      if (lastsUntil >= squares.gone) g.lineBetween(from.x, from.y, to.x, to.y);
    }
  }

  /**
   * A blast has finished the doll off: on the side it came from, the arm and the leg
   * are burnt down to the bone. `front` when it came from the way the doll faces.
   */
  burnSide(front: boolean): void {
    if (this.charred || this.ashen) return;
    const arm: BodyPart = front ? 'frontArm' : 'backArm';
    const leg: BodyPart = front ? 'frontLeg' : 'backLeg';
    for (const { part, redraw } of this.toBones) {
      if (part === arm || part === leg) redraw();
    }
  }

  /** Shut its eyes for a blink, or open them again. Only eyes that can be seen blink. */
  blink(shut: boolean): void {
    this.lids.setVisible(shut && this.eyes.visible);
  }

  /** A doll with a superpower glows in the color of the power. With `null` the glow is gone. */
  setAura(color: number | null): void {
    if (!this.aura) {
      this.aura = this.scene.make.graphics({}, false);
      this.container.addAt(this.aura, 0);
    }
    const g = this.aura.clear();
    if (color === null) return;
    const { width, height, up, alpha, rings } = POWER.aura;
    for (let ring = 0; ring < rings; ring++) {
      const size = 1 - ring / (rings + 1);
      g.fillStyle(color, alpha);
      g.fillEllipse(0, -up, width * size, height * size);
    }
  }

  /** Put a piece of gear on: its picture goes onto the part of the doll that wears it. */
  wear(kind: GearKind, slot: GearSlot): void {
    this.takeOff(slot);
    const at = GEAR_AT[slot];
    const picture = drawGear(this.scene.make.graphics({}, false), kind);
    if (slot === 'feet') {
      // One on each foot
      const other = drawGear(this.scene.make.graphics({}, false), kind);
      this.backLeg.lower.add(other.setPosition(at.x, at.y));
      this.frontLeg.lower.add(picture.setPosition(at.x, at.y));
      this.gear.set(slot, [picture, other]);
      return;
    }
    if (slot === 'legs' || slot === 'hands') {
      // A part on each limb, in place of the one picture: the back limb first, so that
      // it is the front one that gets the cracks
      picture.destroy();
      const part = (
        on: Container,
        kind: 'thigh' | 'shin' | 'glove',
        x: number,
        y: number,
      ): Graphics => {
        const g = drawGearPart(this.scene.make.graphics({}, false), kind).setPosition(x, y);
        // Over the limb's own shape, under what hangs from it
        on.addAt(g, 1);
        return g;
      };
      const parts =
        slot === 'legs'
          ? [this.frontLeg, this.backLeg].flatMap((leg) => [
              part(leg.upper, 'thigh', at.x, at.y),
              part(leg.lower, 'shin', at.x, SHAPE.shin.length * 0.42),
            ])
          : [this.frontArm, this.backArm].map((arm) => part(arm.lower, 'glove', at.x, at.y));
      this.gear.set(slot, parts);
      return;
    }
    if (slot === 'back') {
      // Behind the chest, but in front of the back arm, so that it shows. Its flame is
      // a picture of its own, drawn when it burns
      const flame = this.scene.make.graphics({}, false);
      picture.setPosition(at.x, at.y - SHAPE.waist.y);
      flame.setPosition(at.x, at.y - SHAPE.waist.y);
      const behind = this.upperBody.getIndex(this.backArm.upper) + 1;
      this.upperBody.addAt(flame, behind);
      this.upperBody.addAt(picture, behind + 1);
      this.gear.set(slot, [picture, flame]);
      return;
    }
    if (slot === 'arm') {
      this.frontArm.upper.add(picture.setPosition(at.x, at.y));
    } else if (slot === 'chest') {
      // Over the chest and its wounds, under the head and the front arm
      picture.setPosition(at.x, at.y - SHAPE.waist.y);
      this.upperBody.addAt(picture, this.upperBody.getIndex(this.headPart));
    } else {
      this.headPart.add(picture.setPosition(at.x, at.y - SHAPE.neck.y));
    }
    this.gear.set(slot, [picture]);
  }

  /** The piece of gear in this place is gone: taken off, or broken. */
  takeOff(slot: GearSlot): void {
    this.gear.get(slot)?.forEach((picture) => picture.destroy());
    this.gear.delete(slot);
  }

  /** The flame of the jetpack on its back: flickering while it burns, and gone when it is off. */
  jetFlame(burning: boolean, random: () => number = Math.random): void {
    const flame = this.gear.get('back')?.[1];
    if (!flame) return;
    flame.clear();
    if (!burning) return;
    const { min, max, width, outer, core } = JET.flame;
    const long = min + random() * (max - min);
    const top = 15;
    flame.fillStyle(outer);
    flame.fillTriangle(-width, top, width, top, (random() - 0.5) * 4, top + long);
    flame.fillStyle(core);
    flame.fillTriangle(-width / 2, top, width / 2, top, 0, top + long * 0.55);
  }

  /** A hit has left a crack in a piece of gear: a short jagged line somewhere on it. */
  crackGear(slot: GearSlot, random: () => number = Math.random): void {
    const g = this.gear.get(slot)?.[0];
    if (!g) return;
    const { crackSpan, crackBits } = GEAR;
    let x = (random() - 0.5) * crackSpan;
    let y = -crackSpan / 2 + (random() - 0.5) * 4;
    g.lineStyle(GEAR.crackWidth, GEAR.crack, 0.9);
    g.beginPath();
    g.moveTo(x, y);
    for (let bit = 0; bit < crackBits; bit++) {
      x += (random() - 0.5) * 7;
      y += crackSpan / crackBits;
      g.lineTo(x, y);
    }
    g.strokePath();
  }

  /** Where in the area the middle of a piece of gear is right now. */
  gearSpot(slot: GearSlot): Spot | null {
    const g = this.gear.get(slot)?.[0];
    if (!g) return null;
    const placing = g.getWorldTransformMatrix();
    return { x: placing.tx, y: placing.ty };
  }

  /** Fire or ash leaves nothing of what it had on. */
  private loseGear(): void {
    [...this.gear.keys()].forEach((slot) => {
      this.takeOff(slot);
    });
  }

  /** Frozen solid: a block of ice around the whole doll, or no ice any more. */
  setIce(frozen: boolean): void {
    if (!this.ice) {
      const { pad } = ICE;
      const width = PERSON.halfWidth * 2 + pad * 2;
      const height = PERSON.height + pad * 2;
      const g = this.scene.make.graphics({}, false);
      g.fillStyle(ICE.fill, ICE.alpha);
      g.fillRoundedRect(-width / 2, -PERSON.height - pad, width, height, 8);
      g.lineStyle(2, ICE.edge, 0.8);
      g.strokeRoundedRect(-width / 2, -PERSON.height - pad, width, height, 8);
      g.lineStyle(3, ICE.shine, 0.7);
      g.lineBetween(-width / 2 + 8, -PERSON.height + 4, -width / 2 + 22, -PERSON.height - 2);
      g.lineBetween(-width / 2 + 7, -PERSON.height + 22, -width / 2 + 7, -PERSON.height + 52);
      g.lineBetween(width / 2 - 9, -30, width / 2 - 9, -8);
      this.ice = g;
      this.container.add(g);
    }
    this.ice.setVisible(frozen);
  }

  /** How many times its usual size it is drawn. */
  get bulk(): number {
    return this.size;
  }

  /**
   * Make the doll this many times its usual size. Bigger than usual, it is muscular
   * too: its shoulders, arms, thighs and chest bulge, and its belly has six squares.
   */
  setBulk(size: number): void {
    this.size = size;
    const big = size > 1;
    if (big && this.muscles.length === 0) this.muscles = this.addMuscles();
    this.muscles.forEach((muscle) => muscle.setVisible(big));
  }

  private addMuscles(): Graphics[] {
    const edge = shade(this.skin, MUSCLE.edge);
    const shine = shade(this.skin, MUSCLE.shine);
    // A muscle: a bulge with a dark edge and a shine on it
    const bulge = (g: Graphics, x: number, y: number, width: number, height: number): void => {
      g.fillStyle(edge);
      g.fillEllipse(x, y, width + 2.4, height + 2.4);
      g.fillStyle(this.skin);
      g.fillEllipse(x, y, width, height);
      g.fillStyle(shine, MUSCLE.shineAlpha);
      g.fillEllipse(x - width * 0.14, y - height * 0.2, width * 0.5, height * 0.38);
    };
    const on = (part: Container, draw: (g: Graphics) => void): Graphics => {
      const g = this.scene.make.graphics({}, false);
      draw(g);
      // Over the part's own shape, under what hangs from it
      part.addAt(g, 1);
      return g;
    };
    const { upperArm, forearm, thigh } = SHAPE;
    const arm = (limb: Limb): Graphics[] => [
      on(limb.upper, (g) => {
        bulge(g, 0, 1, 18, 17);
        bulge(g, 2.5, upperArm.length * 0.55, 15, 18);
      }),
      on(limb.lower, (g) => {
        bulge(g, 1, forearm.length * 0.4, 12.5, 15);
      }),
    ];
    const leg = (limb: Limb): Graphics =>
      on(limb.upper, (g) => {
        bulge(g, 1.5, thigh.length * 0.48, 17, 24);
      });
    const chest = this.scene.make.graphics({}, false).setPosition(0, -SHAPE.waist.y);
    const { x, y, width } = SHAPE.chest;
    bulge(chest, x + width * 0.27, y + 8, 15.5, 13);
    bulge(chest, x + width * 0.75, y + 8, 15.5, 13);
    chest.fillStyle(shade(this.skin, MUSCLE.line));
    for (const row of [16.5, 21.5]) {
      for (const column of [-5.5, 0.6]) {
        chest.fillRoundedRect(column, y + row, 5, 3.6, 1.2);
      }
    }
    chest.fillStyle(this.skin);
    for (const row of [16.5, 21.5]) {
      for (const column of [-5.5, 0.6]) {
        chest.fillRoundedRect(column + 0.6, y + row + 0.6, 3.8, 2.4, 0.9);
      }
    }
    this.upperBody.addAt(chest, this.upperBody.getIndex(this.wounds));
    return [
      ...arm(this.backArm),
      ...arm(this.frontArm),
      leg(this.backLeg),
      leg(this.frontLeg),
      chest,
    ];
  }

  /** How much thinner than usual it is drawn: lava leaves hardly anything of the bones. */
  get thinness(): number {
    return this.wasted ? CHARRED.thinScale : 1;
  }

  /** The pose the doll is in right now. */
  get pose(): Pose {
    return this.current;
  }

  setPose(pose: Pose): void {
    this.current = pose;
    // A part that has been cut off lies where it fell: the doll doesn't move it
    const loose = this.severed;
    const top = loose !== 'upperBody';
    if (top && loose !== 'frontArm') {
      this.frontArm.upper.rotation = pose.frontArm;
      this.frontArm.lower.rotation = pose.frontElbow;
    }
    if (top && loose !== 'backArm') {
      this.backArm.upper.rotation = pose.backArm;
      this.backArm.lower.rotation = pose.backElbow;
    }
    if (loose !== 'frontLeg') {
      this.frontLeg.upper.rotation = pose.frontLeg;
      this.frontLeg.lower.rotation = pose.frontKnee;
    }
    if (loose !== 'backLeg') {
      this.backLeg.upper.rotation = pose.backLeg;
      this.backLeg.lower.rotation = pose.backKnee;
    }
    if (top) this.upperBody.rotation = pose.waist;
    if (top && loose !== 'head') this.headPart.rotation = pose.head;
  }

  /**
   * A blade goes right through the doll: this part comes off, at its joint. It is
   * taken out of the doll and put into the area where it was, and both cut ends get
   * a mark. Only one part ever comes off a doll. Gives `null` when one already has.
   */
  /** How high its shoulders are on the screen right now. */
  get shoulderY(): number {
    return this.frontArm.upper.getWorldTransformMatrix().ty;
  }

  /**
   * Show just one part of it while `draw` runs: its `body` (all but the arms), or one
   * arm. Everything else is hidden for that moment, and shown again after.
   */
  drawOnly(part: 'body' | 'frontArm' | 'backArm', draw: () => void): void {
    type Shown = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible;
    const hidden: Shown[] = [];
    const hide = (thing: Phaser.GameObjects.GameObject): void => {
      const shown = thing as Shown;
      if (!shown.visible) return;
      shown.setVisible(false);
      hidden.push(shown);
    };
    if (part === 'body') {
      hide(this.frontArm.upper);
      hide(this.backArm.upper);
    } else {
      const keep = part === 'frontArm' ? this.frontArm.upper : this.backArm.upper;
      // Everything but the arm and what holds it is hidden
      const holders = new Set<Phaser.GameObjects.GameObject>();
      for (let at = keep.parentContainer as Container | null; at; at = at.parentContainer) {
        holders.add(at);
      }
      const walk = (box: Container): void => {
        for (const child of box.list) {
          if (child === keep) continue;
          if (holders.has(child)) walk(child as Container);
          else hide(child);
        }
      };
      walk(this.container);
    }
    draw();
    hidden.forEach((thing) => thing.setVisible(true));
  }

  cutOff(part: BodyPart): LoosePart | null {
    if (this.severed) return null;
    const { picture, lift, reach } = this.partPicture(part);
    const parent = picture.parentContainer as Container | null;
    if (!parent) return null;
    this.severed = part;
    const at = picture.getWorldTransformMatrix().decomposeMatrix();
    parent.addAt(this.stump().setPosition(picture.x, picture.y), parent.getIndex(picture));
    parent.remove(picture);
    picture.add(this.stump());
    picture.addToDisplayList();
    picture.setPosition(at.translateX, at.translateY);
    picture.setScale(at.scaleX, at.scaleY);
    picture.setVisible(true);
    picture.rotation = at.rotation;
    return { picture, x: at.translateX, y: at.translateY, lift, reach };
  }

  private partPicture(part: BodyPart): { picture: Container; lift: number; reach: number } {
    const arm = (SHAPE.upperArm.length + SHAPE.forearm.length) * 0.6;
    const leg = (SHAPE.thigh.length + SHAPE.shin.length) * 0.6;
    switch (part) {
      case 'head':
        return { picture: this.headPart, lift: SHAPE.head.radius * 0.5, reach: SHAPE.head.radius };
      case 'frontArm':
        return { picture: this.frontArm.upper, lift: SHAPE.upperArm.width / 2, reach: arm };
      case 'backArm':
        return { picture: this.backArm.upper, lift: SHAPE.upperArm.width / 2, reach: arm };
      case 'frontLeg':
        return { picture: this.frontLeg.upper, lift: SHAPE.thigh.width / 2, reach: leg };
      case 'backLeg':
        return { picture: this.backLeg.upper, lift: SHAPE.thigh.width / 2, reach: leg };
      case 'upperBody':
        return { picture: this.upperBody, lift: SHAPE.chest.width / 2, reach: SHAPE.chest.width };
    }
  }

  /** The mark on a cut end: a round patch of blood with a dark rim. */
  private stump(): Graphics {
    const { radius, rim } = BLOOD.stump;
    const g = this.scene.make.graphics({}, false);
    g.fillStyle(shade(this.bloodColor, -rim));
    g.fillCircle(0, 0, radius);
    g.fillStyle(this.bloodColor);
    g.fillCircle(0, 0, radius - 1.6);
    return g;
  }

  /** Hide the legs of a doll sitting inside a vehicle, where they are out of sight anyway. */
  showLegs(visible: boolean): void {
    this.frontLeg.upper.setVisible(visible);
    this.backLeg.upper.setVisible(visible);
  }

  /** Angry eyebrows on or off. */
  setAngry(angry: boolean): void {
    this.angry = angry;
    this.showFace();
  }

  /** A doll with no lives left gets crosses for eyes. */
  setDead(dead: boolean): void {
    if (this.charred || this.ashen) return;
    this.lifeless = dead;
    this.showFace();
  }

  /** Horror mode on or off: the creepy face and the claws, or its own face again. */
  setHorror(on: boolean): void {
    if (this.horror === on) return;
    this.horror = on;
    this.showFace();
  }

  /** A green bottle in its front hand, or not. */
  holdBottle(on: boolean): void {
    if (this.drinking === on) return;
    this.drinking = on;
    this.showFace();
  }

  /** Crazy mode on or off: a crazy face, or its own face again. */
  setCrazy(on: boolean): void {
    if (this.crazy === on) return;
    this.crazy = on;
    this.showFace();
  }

  /**
   * Show the face it has now: its own eyes (crosses once it is dead, angry brows while
   * it is angry), or in horror mode the creepy face, with the red glow in its eyes
   * only while it is alive. Burnt, singed or ash, it keeps the face that gave it.
   */
  private showFace(): void {
    const spoilt = this.charred || this.ashen || this.singed;
    const spooky = this.horror && !spoilt && !this.ghastly;
    this.horrorFace.setVisible(spooky && !this.faceless);
    this.horrorEyes.setVisible(spooky && !this.lifeless);
    this.claws.forEach((claw) => claw.setVisible(spooky || (this.ghastly && !spoilt)));
    // Crazy mode gives a living doll a crazy face, unless horror mode has made it creepy
    const silly = this.crazy && !spoilt && !spooky && !this.lifeless && !this.faceless;
    this.crazyFace.setVisible(silly && !this.ghastly);
    this.bottle.setVisible(this.drinking && !spoilt && !this.lifeless);
    if (spoilt) return;
    const own = !this.faceless && !spooky && !(silly && !this.ghastly);
    this.eyes.setVisible(own && !this.lifeless);
    this.deadEyes.setVisible(own && this.lifeless);
    // The shadow monster has no angry brows: it is creepy enough without
    this.brows.setVisible(own && this.angry && !this.lifeless && !this.ghastly);
    if (!this.eyes.visible) this.lids.setVisible(false);
  }

  /**
   * A new mark somewhere on the chest, in the shape of what made it: a bruise, a
   * slash, a stab wound, a bullet hole or a burn.
   */
  addWound(kind: WoundKind, random: () => number = Math.random): void {
    if (this.charred || this.ashen || this.woundCount >= BLOOD.maxWounds) return;
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
      case 'claw':
        // Three long scratches side by side, raked across the chest
        for (const dy of [-5, 0, 5]) {
          g.lineStyle(2.6, dark);
          g.lineBetween(x - 7, y + dy - 4, x + 7, y + dy + 3);
          g.lineStyle(1.2, blood);
          g.lineBetween(x - 6, y + dy - 3.5, x + 6, y + dy + 2.5);
        }
        trickle(x - 2, y + 3, 4 + random() * 6);
        break;
      case 'bruise':
        // A blotch that is dark in the middle and sickly at the edge
        g.fillStyle(marks.bruiseEdge, 0.45);
        g.fillEllipse(x, y, 13 + random() * 3, 10 + random() * 2);
        g.fillStyle(marks.bruise, 0.75);
        g.fillEllipse(x + 0.5, y + 0.3, 9, 7);
        g.fillStyle(dark, 0.55);
        g.fillEllipse(x - 1, y - 0.5, 4.5, 3.2);
        break;
      case 'cut':
      case 'saw':
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
      case 'prongs':
        // Three deep holes side by side, each with its own trickle
        for (const dx of [-7, 0, 7]) {
          g.fillStyle(dark);
          g.fillEllipse(x + dx, y, 4, 6.5);
          g.fillStyle(marks.hole);
          g.fillEllipse(x + dx, y, 1.8, 4.2);
          trickle(x + dx, y + 2.5, 5 + random() * 7);
        }
        break;
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
      case 'shock':
      case 'laser':
      case 'blast':
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

  /**
   * Stick something into the body. It goes behind the body's parts, so the end that
   * is in the doll is hidden, and it moves with the doll from now on.
   */
  embed(thing: Container, x: number, y: number, pointing: number, tilt: number): void {
    this.container.addAt(thing, 0);
    thing.setPosition(x, y);
    thing.setScale(pointing, 1);
    thing.rotation = tilt;
  }

  /** Pull it out again and put it back into the area. */
  pullOut(thing: Container): void {
    this.container.remove(thing);
    thing.addToDisplayList();
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
  /** For every part it has drawn: how to draw that part again as a charred bone. */
  readonly toBones: { part: BodyPart | 'trunk'; redraw: () => void }[] = [];
  /** For every shape it has drawn: how to cover that shape in soot. */
  readonly toSoot: ((color: number, alpha: number) => void)[] = [];
  /** Every solid shape it has drawn, and whether a spot of that picture is in the shape. */
  readonly solidShapes: SolidShape[] = [];
  /** The part it is drawing right now: the figure says which, before it asks for one. */
  part: BodyPart | 'trunk' = 'trunk';
  /** Bones in the colors of the rainbow, one after another, instead of charred black. */
  rainbowBones = false;
  private bonesDrawn = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly look: PersonLook,
  ) {}

  leg(hipX: number, hipY: number): Limb {
    const { thigh, shin, foot } = SHAPE;
    // A normal person wears trousers and shoes; a doll is one color all over
    const trousers = this.look.human?.trousers;
    const lowerShape = this.blank();
    this.tube(lowerShape, shin.width, shin.length, trousers);
    const shoes = this.look.human?.shoes;
    this.block(lowerShape, -foot.back, shin.length - 2, foot.length, foot.height, 3, shoes);
    const upperShape = this.blank();
    this.tube(upperShape, thigh.width, thigh.length, trousers);
    this.ball(upperShape, 0, 0, SHAPE.jointRadius + 1, true, trousers);
    this.addBones(() => {
      this.bone(upperShape, thigh.length);
      this.bone(lowerShape, shin.length);
      // The bones of the foot
      lowerShape.fillStyle(this.boneColor());
      lowerShape.fillRoundedRect(-foot.back + 3, shin.length, foot.length - 5, 3.5, 1.7);
    });
    return this.limb(hipX, hipY, upperShape, thigh.length, lowerShape, trousers);
  }

  arm(shoulderX: number, shoulderY: number): Limb {
    const { upperArm, forearm, hand } = SHAPE;
    // A normal person has sleeves, and bare hands (and bare forearms under short sleeves)
    const human = this.look.human;
    const sleeve = human?.shirt;
    const fore = human?.sleeves === 'short' ? human.skin : sleeve;
    const lowerShape = this.blank();
    this.tube(lowerShape, forearm.width, forearm.length, fore);
    this.ball(lowerShape, 0, forearm.length + 2, hand.radius, false, human?.skin);
    const upperShape = this.blank();
    this.tube(upperShape, upperArm.width, upperArm.length, sleeve);
    this.ball(upperShape, 0, 0, SHAPE.jointRadius + 0.5, true, sleeve);
    this.addBones(() => {
      this.bone(upperShape, upperArm.length);
      this.bone(lowerShape, forearm.length);
      lowerShape.fillStyle(this.boneColor());
      lowerShape.fillCircle(0, forearm.length + 2, hand.radius - 1.5);
    });
    return this.limb(shoulderX, shoulderY, upperShape, upperArm.length, lowerShape, fore);
  }

  /**
   * What the fighters wear on their heads, drawn over the head: a viking's horned
   * helmet, a pirate's hat and eye patch, a samurai's helmet and mask, an alien's
   * feelers and big eyes, a demon's horns and beard, a mummy's bandages.
   */
  private headgear(g: Graphics, top: number, back: number): void {
    const { head, eye } = SHAPE;
    const dome = (color: number, radius: number, down: number): void => {
      g.fillStyle(color);
      g.beginPath();
      g.arc(0, head.y - down, radius, Math.PI, 0);
      g.closePath();
      g.fillPath();
    };
    switch (this.look.extra) {
      case 'vikingHelmet': {
        const c = EXTRA_COLORS.vikingHelmet;
        // The horns, one on each side, curving up
        for (const side of [-1, 1]) {
          g.fillStyle(c.hornDark);
          g.fillTriangle(side * 9, top + 9, side * 14.5, top + 3, side * 21, top - 13);
          g.fillStyle(c.horn);
          g.fillTriangle(side * 10.5, top + 7.5, side * 14, top + 4, side * 20, top - 11);
        }
        dome(c.dark, head.radius + 1.5, 4);
        dome(c.steel, head.radius, 4);
        g.fillStyle(c.shine, 0.6);
        g.fillEllipse(-4, top + 3.5, 11, 4.5);
        g.fillStyle(c.dark);
        g.fillRoundedRect(back - 1.5, head.y - 5.5, head.radius * 2 + 3, 4, 1.5);
        // The nose guard
        g.fillRoundedRect(4, head.y - 3, 3.2, 8.5, 1.2);
        break;
      }
      case 'pirateHat': {
        const c = EXTRA_COLORS.pirateHat;
        // The patch over one eye, and its strap
        g.lineStyle(1.3, c.hat);
        g.lineBetween(back + 1, head.y - 6, eye.front + 3, eye.y - 1);
        g.fillStyle(c.hat);
        g.fillCircle(eye.front, eye.y, 3.9);
        // The hat: a wide brim turned up, a crown, golden trim and a skull
        g.fillEllipse(0, top + 4.5, 39, 9);
        g.fillStyle(c.light);
        g.fillEllipse(0, top + 3.5, 34, 5);
        g.fillStyle(c.hat);
        g.fillRoundedRect(-12, top - 10, 24, 14, 5);
        g.fillStyle(c.trim);
        g.fillRect(-12, top + 1, 24, 1.6);
        g.fillStyle(c.skull);
        g.fillCircle(1, top - 5, 3);
        g.fillRect(-0.8, top - 3.5, 3.6, 2.6);
        g.fillStyle(c.hat);
        g.fillCircle(0, top - 5.3, 0.9);
        g.fillCircle(2.2, top - 5.3, 0.9);
        break;
      }
      case 'kabuto': {
        const c = EXTRA_COLORS.kabuto;
        // The neck guard flares out at the back, and a mask covers the mouth
        g.fillStyle(c.helmet);
        g.fillTriangle(back + 3, head.y - 6, back - 9, head.y + 10, back + 7, head.y + 8);
        g.fillStyle(c.mask);
        g.fillRoundedRect(-1, head.y + 3.5, head.radius - 1, 9, 3);
        g.fillStyle(c.gold);
        g.fillRect(1, head.y + 7.5, head.radius - 5, 1.2);
        // The golden crescent on the front, and the helmet itself
        for (const side of [-1, 1]) {
          g.fillTriangle(side * 1.5, top + 3, side * 6, top + 4, side * 14, top - 13);
        }
        dome(c.helmet, head.radius + 1.5, 5);
        dome(c.light, head.radius - 1, 6);
        dome(c.helmet, head.radius - 3.5, 6.5);
        g.fillStyle(c.gold);
        g.fillRoundedRect(back - 1.5, head.y - 6.5, head.radius * 2 + 3, 2.6, 1.2);
        g.fillCircle(2, top + 4, 2.2);
        break;
      }
      case 'feelers': {
        const c = EXTRA_COLORS.feelers;
        // Two feelers with a glowing tip, and big black eyes
        g.lineStyle(1.8, c.stalk);
        for (const side of [-1, 1]) {
          g.lineBetween(side * 5, top + 2, side * 9, top - 7);
          g.lineBetween(side * 9, top - 7, side * 12, top - 12);
        }
        g.fillStyle(c.tip);
        g.fillCircle(-12, top - 12, 2.8);
        g.fillCircle(12, top - 12, 2.8);
        g.fillStyle(c.eye);
        g.fillEllipse(eye.back - 1, eye.y, 7, 10);
        g.fillEllipse(eye.front + 1, eye.y, 7.5, 10.5);
        break;
      }
      case 'horns': {
        const c = EXTRA_COLORS.horns;
        for (const side of [-1, 1]) {
          g.fillStyle(c.horn);
          g.fillTriangle(side * 4, top + 3, side * 11, top + 6, side * 13, top - 12);
          g.fillStyle(c.tip);
          g.fillTriangle(side * 10.5, top - 4, side * 12.2, top - 4, side * 13, top - 12);
        }
        // A pointed beard on its chin
        g.fillStyle(c.beard);
        g.fillTriangle(4, head.y + 11, 11.5, head.y + 10, 9, head.y + 20);
        break;
      }
      case 'flatCap': {
        // An old man's flat cap: low on the head, with a short peak in front
        const c = EXTRA_COLORS.flatCap;
        g.fillStyle(c.dark);
        g.fillRoundedRect(4, top + 3.5, head.radius + 5, 4.2, 2);
        dome(c.dark, head.radius + 1.2, 6);
        dome(c.cloth, head.radius - 0.4, 6.5);
        g.fillStyle(c.light, 0.5);
        g.fillEllipse(-3, top + 2.5, 13, 4);
        g.fillStyle(c.dark);
        g.fillCircle(0, top - 0.5, 1.6);
        break;
      }
      case 'apron': {
        // An old lady's round glasses
        g.lineStyle(1.3, EXTRA_COLORS.apron.glasses);
        g.strokeCircle(eye.back - 0.5, eye.y, 3.7);
        g.strokeCircle(eye.front + 0.5, eye.y, 3.7);
        g.lineBetween(back + 2, eye.y - 1, eye.back - 4.2, eye.y);
        break;
      }
      case 'bandages': {
        const c = EXTRA_COLORS.bandages;
        // A dark gap for the eyes, bandages wound around the head, and a loose end at the back
        g.fillStyle(c.dark);
        g.fillRoundedRect(-4, eye.y - 3.6, head.radius + 2.5, 7.2, 3);
        g.fillStyle(c.line);
        g.fillRect(back - 1, head.y + 3, 3.5, 15);
        g.lineStyle(1.5, c.line);
        for (const [from, to] of [
          [-10, -7],
          [-6.5, -10],
          [6, 9],
          [10, 6],
        ] as const) {
          g.lineBetween(back + 2.5, head.y + from, head.radius - 2.5, head.y + to);
        }
        break;
      }
      default:
        break;
    }
  }

  hips(): Graphics {
    const g = this.blank();
    const { hips } = SHAPE;
    this.block(g, hips.x, hips.y, hips.width, hips.height, hips.round, this.look.human?.trousers);
    this.addBones(() => {
      // The pelvis: a narrow bar with a knob at each hip
      g.clear();
      g.fillStyle(this.boneColor());
      g.fillRoundedRect(hips.x + 4, hips.y + 3, hips.width - 8, 5, 2.5);
      g.fillCircle(-SHAPE.hip.x, SHAPE.hip.y, CHARRED.knob + 0.6);
      g.fillCircle(SHAPE.hip.x, SHAPE.hip.y, CHARRED.knob + 0.6);
    });
    return g;
  }

  /** The chest, with the ball joints of the waist and the neck. */
  chest(): Graphics {
    const g = this.blank();
    const { chest, waist, neck } = SHAPE;
    const human = this.look.human;
    this.ball(g, 0, waist.y, waist.radius, true, human?.trousers);
    this.block(g, chest.x, chest.y, chest.width, chest.height, chest.round, human?.shirt);
    if (this.look.extra === 'bandages') {
      // A mummy is wrapped in bandages: lines across the chest, one end hanging loose
      const c = EXTRA_COLORS.bandages;
      g.lineStyle(1.5, c.line);
      for (const [from, to] of [
        [5, 2],
        [10, 13],
        [17, 15],
        [21, 24],
      ] as const) {
        g.lineBetween(chest.x + 1.5, chest.y + from, chest.x + chest.width - 1.5, chest.y + to);
      }
    }
    if (this.look.extra === 'shadow') {
      // Ribs bending round the chest, a spine down the middle, and a hollow under them
      const { bone, socket } = EXTRA_COLORS.shadow;
      const middle = chest.x + chest.width / 2;
      g.fillStyle(socket, 0.6);
      g.fillEllipse(middle, chest.y + chest.height - 2, chest.width - 10, 7);
      g.lineStyle(1.5, bone, 0.9);
      g.lineBetween(middle, chest.y + 1, middle, chest.y + chest.height - 1);
      for (const down of [4, 9, 14, 19]) {
        const y = chest.y + down;
        g.lineBetween(middle, y, chest.x + 3, y + 3);
        g.lineBetween(middle, y, chest.x + chest.width - 3, y + 3);
      }
    }
    if (this.look.extra === 'apron') {
      // A white apron with a pocket, tied on with two straps
      const c = EXTRA_COLORS.apron;
      g.fillStyle(c.shade);
      g.fillRect(chest.x + 7, chest.y, 2, 8);
      g.fillRect(chest.x + chest.width - 9, chest.y, 2, 8);
      g.fillRoundedRect(chest.x + 4, chest.y + 6.5, chest.width - 8, chest.height - 6, 3);
      g.fillStyle(c.cloth);
      g.fillRoundedRect(chest.x + 5, chest.y + 7.5, chest.width - 10, chest.height - 8, 2.5);
      g.fillStyle(c.shade);
      g.fillRoundedRect(chest.x + 10, chest.y + 14, 10, 6, 1.5);
    }
    if (this.look.extra === 'kabuto') {
      // A samurai's armor is made of rows of plates, tied with golden cord
      g.fillStyle(EXTRA_COLORS.kabuto.gold);
      for (const row of [7, 13.5, 20]) {
        g.fillRect(chest.x + 3, chest.y + row, chest.width - 6, 1.5);
      }
    }
    if (this.look.extra === 'patches') {
      // A zombie's chest has dark, rotten patches
      g.fillStyle(EXTRA_COLORS.patches.blotch, 0.85);
      g.fillCircle(chest.x + 9, chest.y + 9, 4.5);
      g.fillCircle(chest.x + 20, chest.y + 17, 3.5);
      g.fillCircle(chest.x + 7, chest.y + 20, 2.5);
    }
    this.ball(g, 0, neck.y, neck.radius, true, human?.skin);
    this.addBones(() => {
      // A spine from the waist to the neck, with ribs and shoulders across it
      g.clear();
      g.fillStyle(this.boneColor());
      g.fillRoundedRect(-CHARRED.thick / 2, neck.y, CHARRED.thick, waist.y - neck.y, 2);
      g.fillRoundedRect(-SHAPE.shoulder.x, SHAPE.shoulder.y - 2, SHAPE.shoulder.x * 2, 3.5, 1.7);
      g.lineStyle(2.2, this.boneColor());
      for (let rib = 0; rib < 4; rib++) {
        const y = chest.y + 9 + rib * 5;
        const half = chest.width / 2 - 2 - rib * 1.6;
        g.lineBetween(-half, y + 1.5, 0, y - 1);
        g.lineBetween(0, y - 1, half, y + 1.5);
      }
      g.fillStyle(CHARRED.shine, 0.6);
      g.fillRect(-0.6, neck.y + 3, 1.2, waist.y - neck.y - 6);
    });
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

    const human = this.look.human;
    const skin = this.tones(human?.skin ?? this.look.body);
    this.toSoot.push((soot, alpha) => {
      g.fillStyle(soot, alpha);
      g.fillCircle(0, head.y, head.radius + 1);
    });
    this.solidShapes.push({ g, inside: (x, y) => Math.hypot(x, y - head.y) <= head.radius + 1 });
    g.fillStyle(skin.rim);
    g.fillCircle(0, head.y, head.radius);
    g.fillStyle(skin.fill);
    g.fillCircle(0, head.y, head.radius - DOLL.rimWidth);
    // A round shine on top makes the head look like a ball
    g.fillStyle(skin.shine, DOLL.shineAlpha);
    g.fillEllipse(-1, head.y - head.radius * 0.45, head.radius * 1.1, head.radius * 0.6);
    if (human) {
      // A normal person has hair, and a mouth
      g.fillStyle(human.hair);
      if (human.style === 'bald') {
        g.fillRoundedRect(back, head.y - 3, 6, 10, 3);
        g.fillRoundedRect(5, head.y + 4.5, 9, 3, 1.5);
      } else {
        g.fillEllipse(-2.5, head.y - head.radius * 0.6, head.radius * 1.9, head.radius * 0.95);
        const down = human.style === 'long' ? 33 : 15;
        g.fillRoundedRect(back - 1.5, head.y - 9, 8.5, down, 4);
        // A bun: the hair is tied up in a knot at the back of the head
        if (human.style === 'bun') g.fillCircle(back + 1.5, top + 3.5, 6.8);
      }
      if (human.beard) {
        g.fillEllipse(6, head.y + 8.5, 16, 11);
      } else {
        g.lineStyle(1.4, shade(human.skin, -0.5));
        g.lineBetween(5.5, head.y + 8, 11, head.y + 8);
      }
    }
    if (this.look.extra === 'wizardHat') {
      // A tall pointed hat with a brim and a golden star
      const c = EXTRA_COLORS.wizardHat;
      g.fillStyle(c.hat);
      g.fillTriangle(-12, top + 4, 12, top + 4, -5, top - 26);
      g.fillStyle(c.light);
      g.fillTriangle(-9, top + 4, 2, top + 4, -5, top - 21);
      g.fillStyle(c.hat);
      g.fillEllipse(0, top + 4, 34, 7);
      g.fillStyle(c.star);
      g.fillCircle(-1, top - 6, 2.4);
    }
    if (this.look.extra === 'crown') {
      // A golden crown with three points and a red jewel
      const c = EXTRA_COLORS.crown;
      g.fillStyle(c.dark);
      g.fillRect(-10.5, top - 1.5, 21, 7);
      g.fillStyle(c.gold);
      g.fillRect(-9.5, top - 0.5, 19, 5);
      for (const x of [-9.5, -3, 3.5]) {
        g.fillTriangle(x, top - 0.5, x + 6, top - 0.5, x + 3, top - 8);
      }
      g.fillStyle(c.jewel);
      g.fillCircle(0, top + 2, 1.8);
    }

    this.headgear(g, top, back);
    if (this.look.extra === 'shadow') {
      // A skull for a face: a hole for a nose, hollow cheeks, and a long jaw of teeth
      const { wisp, bone, socket, teeth } = EXTRA_COLORS.shadow;
      g.fillStyle(socket);
      g.fillTriangle(6.5, head.y + 2, 8.5, head.y + 2, 7.5, head.y - 1.5);
      g.lineStyle(1.2, bone, 0.8);
      g.lineBetween(-2, head.y + 3, 2, head.y + 6);
      g.lineBetween(14, head.y + 2, 12, head.y + 6);
      g.fillStyle(socket);
      g.fillRoundedRect(-1, head.y + 6, 15, 8, 2.5);
      g.fillStyle(teeth);
      for (const x of [0, 2.5, 5, 7.5, 10, 12.5]) {
        g.fillRect(x, head.y + 6.5, 1.5, 3.4);
        g.fillRect(x + 0.3, head.y + 10, 1.3, 3.4);
      }
      // Wisps of shadow rise off its head and drift back, like black smoke
      for (const [x, up, lean, alpha] of [
        [-9, 10, -7, 0.85],
        [-3, 14, -5, 0.75],
        [3, 11, -6, 0.65],
        [-12, 7, -9, 0.5],
      ] as const) {
        g.fillStyle(wisp, alpha);
        g.fillTriangle(x - 3.5, top + 4, x + 3.5, top + 4, x + lean, top - up);
      }
    }
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
    this.addBones(() => {
      // A skull: a round top, a jaw with teeth, and embers still glowing in the eye holes
      const { eye } = SHAPE;
      g.clear();
      g.fillStyle(this.boneColor());
      g.fillCircle(0, head.y - 1, head.radius - 2);
      g.fillRoundedRect(-6, head.y + 5, 15, 9, 3);
      g.fillStyle(CHARRED.shine, 0.55);
      g.fillEllipse(-2, head.y - head.radius * 0.5, head.radius * 0.9, head.radius * 0.45);
      g.fillStyle(CHARRED.socket);
      g.fillEllipse(eye.back, eye.y + 1, 5.5, 6.5);
      g.fillEllipse(eye.front, eye.y + 1, 5.5, 6.5);
      g.fillTriangle(4, head.y + 3, 7, head.y + 3, 5.5, head.y + 0.5);
      g.fillStyle(CHARRED.ember);
      g.fillCircle(eye.back + 0.4, eye.y + 1.4, 1.1);
      g.fillCircle(eye.front + 0.4, eye.y + 1.4, 1.1);
      g.fillStyle(CHARRED.shine);
      g.fillRect(-3, head.y + 9, 11, 2);
      g.fillStyle(CHARRED.socket);
      for (const x of [-0.5, 2.5, 5.5]) {
        g.fillRect(x, head.y + 9, 0.8, 2);
      }
    });
    return g;
  }

  /** Round dot eyes, a little to the front, so you can see which way the doll looks. */
  eyes(): Graphics {
    const g = this.blank();
    const { eye } = SHAPE;
    if (this.look.extra === 'shadow') {
      // The shadow monster's eyes are deep black holes, with a tiny white light far inside each
      const c = EXTRA_COLORS.shadow;
      for (const x of [eye.back - 0.5, eye.front + 0.5]) {
        g.fillStyle(c.socket);
        g.fillEllipse(x, eye.y + 0.5, 7.5, 9.5);
        g.fillStyle(c.glow, 0.35);
        g.fillCircle(x, eye.y + 1, 2.4);
        g.fillStyle(this.look.eye ?? c.glow);
        g.fillCircle(x, eye.y + 1, 1.1);
      }
      return g;
    }
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

  /** Eyelids of this color, shut over both eyes. */
  lids(color: number): Graphics {
    const g = this.blank();
    const { eye } = SHAPE;
    g.fillStyle(color);
    g.fillCircle(eye.back, eye.y, eye.radius + 1);
    g.fillCircle(eye.front, eye.y, eye.radius + 1);
    g.lineStyle(1, shade(color, -0.5));
    g.lineBetween(eye.back - 2.2, eye.y + 0.6, eye.back + 2.2, eye.y + 0.6);
    g.lineBetween(eye.front - 2.2, eye.y + 0.6, eye.front + 2.2, eye.y + 0.6);
    return g;
  }

  deadEyes(
    // An alien's eyes are black all over: its crosses are white, so that they show
    color: number = this.look.extra === 'feelers' ? 0xffffff : PERSON.face.eye,
  ): Graphics {
    const g = this.blank();
    const { eye } = SHAPE;
    const size = eye.radius + 1;
    g.lineStyle(1.8, color);
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

  /**
   * The face it has in horror mode, drawn over its own. Every doll gets one of a few:
   * a wide crooked grin full of sharp teeth with dark streaks under the eyes; a mouth
   * sewn shut and a button for one eye; a long open scream; empty eye holes dripping
   * dark with no mouth at all; or a thin smile far too wide for its face.
   */
  horrorFace(kind: HorrorFace): Graphics {
    const g = this.blank();
    const { head, eye } = SHAPE;
    const c = HORROR.face;
    const top = head.y - head.radius;
    const y = head.y + 8;
    const path = (points: readonly { x: number; y: number }[]): void => {
      g.beginPath();
      points.forEach(({ x: px, y: py }, index) => {
        if (index === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      });
      g.closePath();
      g.fillPath();
    };
    switch (kind) {
      case 'grin': {
        g.fillStyle(c.socket, 0.92);
        g.fillEllipse(eye.back, eye.y + 0.5, 7.5, 9);
        g.fillEllipse(eye.front, eye.y + 0.5, 7.5, 9);
        g.fillStyle(c.streak, 0.85);
        g.fillRoundedRect(eye.back - 0.8, eye.y + 3.5, 1.6, 8, 0.8);
        g.fillRoundedRect(eye.front - 0.7, eye.y + 3.5, 1.4, 5.5, 0.7);
        // The grin: its corners pulled up high, wider at the front of the face
        g.fillStyle(c.mouth);
        path([
          { x: -3, y: y - 3 },
          { x: 4, y: y - 0.5 },
          { x: 13.5, y: y - 4 },
          { x: 11.5, y: y + 2 },
          { x: 4.5, y: y + 4 },
          { x: -1.5, y: y + 1 },
        ]);
        // Sharp teeth hanging from above and sticking up from below
        g.fillStyle(c.teeth);
        for (const x of [-1, 2, 5, 8, 11]) {
          const upper = x < 4 ? y - 2.2 + (x + 1) * 0.35 : y - 0.5 - (x - 4) * 0.35;
          g.fillTriangle(x - 1.1, upper, x + 1.1, upper, x, upper + 2.6);
        }
        for (const x of [0.5, 3.5, 6.5, 9.5]) {
          const lower = x < 4.5 ? y + 1.3 + x * 0.6 : y + 4 - (x - 4.5) * 0.4;
          g.fillTriangle(x - 1, lower, x + 1, lower, x, lower - 2.4);
        }
        break;
      }
      case 'stitched': {
        // A big black button sewn on for the back eye, a dark ring round the other one
        g.fillStyle(c.button);
        g.fillCircle(eye.back - 0.5, eye.y, 4);
        g.lineStyle(1, c.thread);
        g.lineBetween(eye.back - 2, eye.y - 1.5, eye.back + 1, eye.y + 1.5);
        g.lineBetween(eye.back - 2, eye.y + 1.5, eye.back + 1, eye.y - 1.5);
        g.fillStyle(c.socket, 0.9);
        g.fillEllipse(eye.front, eye.y + 0.5, 6.5, 8);
        // The mouth is sewn shut: a dark line with stitches across it
        g.lineStyle(1.6, c.mouth);
        g.lineBetween(-1, y, 12, y - 1);
        g.lineStyle(1, c.thread);
        for (const x of [0.5, 3.5, 6.5, 9.5]) g.lineBetween(x, y - 2.5, x + 0.8, y + 2);
        // And a long scar of stitches up the side of the head
        g.lineStyle(1.3, c.crack);
        g.lineBetween(-10, head.y + 4, -3, top + 3);
        g.lineStyle(1, c.thread);
        for (const step of [0, 1, 2, 3]) {
          const sx = -9.5 + step * 1.9;
          const sy = head.y + 2 - step * 4.6;
          g.lineBetween(sx - 1.6, sy - 0.8, sx + 1.6, sy + 0.8);
        }
        break;
      }
      case 'scream': {
        // Hollow eyes pulled down at the sides, and a long open mouth screaming
        g.fillStyle(c.socket, 0.95);
        g.fillEllipse(eye.back - 0.3, eye.y + 1, 6, 9.5);
        g.fillEllipse(eye.front + 0.3, eye.y + 1, 6, 9.5);
        g.fillStyle(c.mouth);
        g.fillEllipse(6, y + 1, 7.5, 12);
        g.fillStyle(c.streak, 0.9);
        g.fillEllipse(6, y + 3.5, 4, 5);
        g.lineStyle(1, c.crack, 0.9);
        g.lineBetween(-2, head.y + 1, -5, head.y + 7);
        g.lineBetween(12.5, head.y + 2, 14, head.y + 6);
        break;
      }
      case 'hollow': {
        // Big empty holes for eyes, dark running down from them all the way to the chin
        g.fillStyle(c.socket);
        g.fillEllipse(eye.back - 0.4, eye.y + 0.5, 8, 10);
        g.fillEllipse(eye.front + 0.4, eye.y + 0.5, 8, 10);
        g.fillStyle(c.streak, 0.95);
        for (const [x, length] of [
          [eye.back - 1.5, 14],
          [eye.back + 1, 9],
          [eye.front - 1, 12],
          [eye.front + 1.5, 16],
        ] as const) {
          g.fillRoundedRect(x - 0.8, eye.y + 4, 1.6, length, 0.8);
          g.fillCircle(x, eye.y + 4 + length, 1.2);
        }
        break;
      }
      case 'smile': {
        // A thin smile that goes on far too far, nearly round to the back of the head
        g.lineStyle(1.6, c.mouth);
        g.beginPath();
        g.moveTo(-8, y - 6);
        g.lineTo(-4, y - 1);
        g.lineTo(3, y + 1.5);
        g.lineTo(10, y + 0.5);
        g.lineTo(14, y - 4);
        g.strokePath();
        g.lineStyle(0.8, c.mouth);
        for (const x of [-2, 1, 4, 7, 10]) g.lineBetween(x, y - 1, x, y + 2.5);
        break;
      }
    }
    // Every one of them has a crack down the top of its head
    g.lineStyle(1.3, c.crack);
    g.beginPath();
    g.moveTo(-5, top + 1);
    g.lineTo(-2, top + 5);
    g.lineTo(-4.5, top + 8);
    g.lineTo(-1, top + 12);
    g.strokePath();
    return g;
  }

  /**
   * What is alive in its eyes, which is gone once it is dead: a red glow with a dark
   * slit, or tiny white or red points deep in the dark, or big white staring eyes.
   */
  horrorEyes(kind: HorrorFace): Graphics {
    const g = this.blank();
    const { eye } = SHAPE;
    const c = HORROR.face;
    const glowing = (x: number): void => {
      g.fillStyle(c.glow, c.glowAlpha);
      g.fillCircle(x, eye.y, 4);
      g.fillStyle(c.eye);
      g.fillCircle(x, eye.y, 1.9);
      g.fillStyle(c.slit);
      g.fillRect(x - 0.35, eye.y - 1.6, 0.7, 3.2);
    };
    switch (kind) {
      case 'grin':
        glowing(eye.back);
        glowing(eye.front);
        break;
      case 'stitched':
        glowing(eye.front);
        break;
      case 'scream':
        g.fillStyle(c.pale);
        g.fillCircle(eye.back - 0.3, eye.y + 1, 1);
        g.fillCircle(eye.front + 0.3, eye.y + 1, 1);
        break;
      case 'hollow':
        g.fillStyle(c.eye);
        g.fillCircle(eye.back - 0.4, eye.y + 1, 0.9);
        g.fillCircle(eye.front + 0.4, eye.y + 1, 0.9);
        break;
      case 'smile':
        for (const x of [eye.back - 0.5, eye.front + 0.5]) {
          g.fillStyle(c.white);
          g.fillCircle(x, eye.y, 3.6);
          g.fillStyle(c.pupil);
          g.fillCircle(x + 0.8, eye.y + 0.2, 0.9);
        }
        break;
    }
    return g;
  }

  /** Three long, curved claws growing out of a hand. The shadow monster's are long bony fingers. */
  claws(): Graphics {
    const g = this.blank();
    const c = HORROR.face;
    const handY = SHAPE.forearm.length + 2;
    const long = this.look.extra === 'shadow' ? 2 : 1;
    for (const dx of [-3.5, 0, 3.5]) {
      const tip = handY + 3 + 9 * long;
      g.fillStyle(c.claw);
      g.fillTriangle(dx - 1.3, handY + 3, dx + 1.3, handY + 3, dx + 2.5 * long, tip);
      g.fillStyle(long > 1 ? EXTRA_COLORS.shadow.bone : c.clawTip);
      g.fillTriangle(dx + 0.9 * long, tip - 3, dx + 2 * long, tip - 3, dx + 2.5 * long, tip);
    }
    return g;
  }

  /**
   * The face it has in crazy mode, drawn over its own: spirals for eyes and a grin with
   * the tongue out; one huge eye and one tiny one, looking different ways, over a mouth
   * wide open; or both eyes looking at its nose, with big front teeth and the tongue out.
   */
  crazyFace(kind: CrazyFace): Graphics {
    const g = this.blank();
    const { eye } = SHAPE;
    const c = CRAZY.face;
    const ball = (x: number, radius: number, lookX: number, lookY: number): void => {
      g.fillStyle(c.white);
      g.fillCircle(x, eye.y, radius);
      g.lineStyle(0.8, c.line);
      g.strokeCircle(x, eye.y, radius);
      g.fillStyle(c.pupil);
      g.fillCircle(x + lookX, eye.y + lookY, radius * 0.45);
    };
    const tongue = (x: number, y: number): void => {
      g.fillStyle(c.tongue);
      g.fillEllipse(x, y + 2.5, 4, 6);
      g.lineStyle(0.6, c.mouth);
      g.lineBetween(x, y + 1, x, y + 4);
    };
    switch (kind) {
      case 'spiral':
        for (const x of [eye.back, eye.front]) {
          g.fillStyle(c.white);
          g.fillCircle(x, eye.y, 3.8);
          g.lineStyle(0.9, c.spiral);
          g.beginPath();
          for (let step = 0; step <= 24; step++) {
            const angle = step * 0.55;
            const r = 0.2 + step * 0.15;
            const px = x + Math.cos(angle) * r;
            const py = eye.y + Math.sin(angle) * r;
            if (step === 0) g.moveTo(px, py);
            else g.lineTo(px, py);
          }
          g.strokePath();
        }
        g.lineStyle(1.4, c.line);
        g.beginPath();
        g.arc(5.5, -98, 6, 0.25, Math.PI - 0.25);
        g.strokePath();
        tongue(7.5, -93);
        break;
      case 'googly':
        ball(eye.back - 0.5, 4.6, -1.6, 1.4);
        ball(eye.front + 1.5, 2.6, 0.9, -0.9);
        g.fillStyle(c.mouth);
        g.fillEllipse(6, -94, 9, 6.5);
        tongue(6.5, -93.5);
        break;
      case 'crossed':
        ball(eye.back, 3.3, 1.5, 0.4);
        ball(eye.front, 3.3, -1.5, 0.4);
        g.lineStyle(1.3, c.line);
        g.beginPath();
        g.moveTo(0, -95.5);
        g.lineTo(3, -94);
        g.lineTo(6, -95.5);
        g.lineTo(9, -94);
        g.lineTo(12, -95.5);
        g.strokePath();
        g.fillStyle(c.white);
        g.fillRect(4.6, -95, 2.2, 2.6);
        g.fillRect(7, -95, 2.2, 2.6);
        tongue(10.5, -94.5);
        break;
    }
    return g;
  }

  /** The color of the next bone it draws: charred black, or the next color of the rainbow. */
  private boneColor(): number {
    if (!this.rainbowBones) return CHARRED.bone;
    const colors = UNICORN.rainbow;
    this.bonesDrawn += 1;
    return colors[this.bonesDrawn % colors.length] ?? CHARRED.bone;
  }

  /**
   * A green glass bottle in the hand, lying across it: a round body with a label and
   * green drink inside, a neck of normal length, and a lip at the end.
   */
  bottle(): Graphics {
    const g = this.blank();
    const c = CRAZY.bottle;
    const handY = SHAPE.forearm.length + 2;
    // With the hand up at the face its neck points back, into the mouth, and the
    // bottom of the bottle is up in the air in front
    g.fillStyle(c.glass);
    g.fillRoundedRect(-14, handY - 4.5, 17, 9, 3);
    g.fillRect(3, handY - 2.2, 9, 4.4);
    g.fillStyle(c.lip);
    g.fillRect(11.5, handY - 2.8, 2.5, 5.6);
    g.fillStyle(c.liquid, 0.75);
    g.fillRoundedRect(-13, handY - 1, 15, 4.5, 2);
    g.fillStyle(c.label);
    g.fillRect(-10, handY - 4.5, 7, 9);
    g.fillStyle(c.shine, 0.7);
    g.fillRect(-12.5, handY - 3.5, 13, 1.3);
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
    color?: number,
  ): Limb {
    const joint = this.blank();
    this.ball(joint, 0, 0, SHAPE.jointRadius, true, color);
    this.addBones(() => {
      joint.clear();
    });
    const lower = this.scene.make.container({ x: 0, y: length }, false).add([lowerShape, joint]);
    const upper = this.scene.make.container({ x, y }, false).add([upperShape, lower]);
    return { upper, lower };
  }

  /** Remember how to draw the part it is on again as charred bone. */
  private addBones(redraw: () => void): void {
    this.toBones.push({ part: this.part, redraw });
  }

  /** Draw a part again as a charred bone hanging down from (0, 0), with a knob at each end. */
  private bone(g: Graphics, length: number): void {
    const { thick, knob } = CHARRED;
    g.clear();
    g.fillStyle(this.boneColor());
    g.fillRoundedRect(-thick / 2, 0, thick, length, thick / 2);
    g.fillCircle(0, 0, knob);
    g.fillCircle(0, length, knob);
    g.fillStyle(CHARRED.shine, 0.6);
    g.fillRect(-0.6, 3, 1.2, length - 6);
  }

  /** A round tube hanging down from (0, 0): dark rim, body color, bright stripe. */
  private tube(g: Graphics, width: number, length: number, color?: number): void {
    this.block(g, -width / 2, -2, width, length + 4, width / 2, color);
    if (this.look.extra === 'shadow') {
      // The shadow monster's bones show through: a long bone down the middle, knobbly at the ends
      const { bone } = EXTRA_COLORS.shadow;
      g.lineStyle(1.6, bone, 0.85);
      g.lineBetween(0, 1, 0, length);
      g.fillStyle(bone, 0.85);
      g.fillCircle(-1, 1.5, 1.6);
      g.fillCircle(1, 1.5, 1.6);
      g.fillCircle(-1, length - 0.5, 1.6);
      g.fillCircle(1, length - 0.5, 1.6);
    }
  }

  /** A color with the dark rim and the bright stripe that go with it. */
  private tones(color: number): { rim: number; fill: number; shine: number } {
    return { rim: shade(color, DOLL.rim), fill: color, shine: shade(color, DOLL.shine) };
  }

  /** A rounded block of the body, shaded like the tubes. */
  private block(
    g: Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    round: number,
    color: number = this.look.body,
  ): void {
    const rim = DOLL.rimWidth;
    const tones = this.tones(color);
    this.toSoot.push((soot, alpha) => {
      g.fillStyle(soot, alpha);
      g.fillRoundedRect(x, y, width, height, round);
    });
    this.solidShapes.push({
      g,
      inside: (px, py) => px >= x && px <= x + width && py >= y && py <= y + height,
    });
    g.fillStyle(tones.rim);
    g.fillRoundedRect(x, y, width, height, round);
    g.fillStyle(tones.fill);
    g.fillRoundedRect(
      x + rim,
      y + rim,
      width - rim * 2,
      height - rim * 2,
      Math.max(1, round - rim),
    );
    g.fillStyle(tones.shine, DOLL.shineAlpha);
    const stripe = width * 0.3;
    g.fillRoundedRect(
      x + (width - stripe) / 2,
      y + rim + 1,
      stripe,
      height - rim * 2 - 2,
      stripe / 2,
    );
  }

  /**
   * A ball: a joint between two parts, or a hand when `joint` is false. A normal
   * person's are given their own `color`: that of the sleeve, the trousers or the skin.
   */
  private ball(
    g: Graphics,
    x: number,
    y: number,
    radius: number,
    joint = true,
    color?: number,
  ): void {
    const tones = this.tones(color ?? (joint ? this.look.joint : this.look.body));
    this.toSoot.push((soot, alpha) => {
      g.fillStyle(soot, alpha);
      g.fillCircle(x, y, radius);
    });
    this.solidShapes.push({ g, inside: (px, py) => Math.hypot(px - x, py - y) <= radius });
    g.fillStyle(tones.rim);
    g.fillCircle(x, y, radius);
    g.fillStyle(tones.fill);
    g.fillCircle(x, y, radius - DOLL.rimWidth);
    g.fillStyle(tones.shine, DOLL.shineAlpha);
    g.fillCircle(x, y - radius * 0.3, radius * 0.4);
  }
}
