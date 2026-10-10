import type Phaser from 'phaser';
import type { BlastDef, GunDef } from '../config';
import type { Spring } from '../logic/fall';
import type { Box } from '../logic/ground';
import type { Spot } from '../logic/pick';
import type { PlaceArea } from '../logic/place';
import type { Facing } from '../logic/walk';
import type { Body } from './Body';
import type { Person } from './Person';

/** What a hit sounds like: a fist, a weapon, or nothing extra (a bullet already banged). */
export type HitSound = 'punch' | 'clang' | 'none';

/** What everything in the area needs to know about the world around it each frame. */
export interface World {
  area: PlaceArea;
  bottom: number;
  people: readonly Person[];
  /** The boxes of all the solid things, except `body` itself. */
  solidBoxes: (body: Body) => Box[];
  /** Show a hit at this spot, and play its sound. `deadly` when it was the last one. */
  hitEffect: (x: number, y: number, deadly: boolean, sound: HitSound) => void;
  /** The boxes of the building pieces and vehicles only (no dolls), except `body` itself. */
  pieces: (body: Body) => Box[];
  /** A vehicle has moved `dx` sideways: everything standing on it goes along. */
  carry: (vehicle: Body, dx: number) => void;
  /** Something heavy and fast runs into whatever tall piece is right at `box`: it falls over. */
  shove: (box: Box, direction: Facing) => void;
  /** Is something solid lying on this doll, so that it can't get up? */
  pinned: (person: Person) => boolean;
  /** A doll hit the ground, falling this fast (pixels per second). */
  landed: (fallSpeed: number) => void;
  /**
   * Fire a bullet from this spot. With no shooter, it hits dolls of any color.
   * `aim` is the way it flies (an arrow of length 1; straight sideways when left
   * out), and it flies through `from`, the vehicle it is fired out of.
   */
  shoot: (
    shooter: Person | null,
    x: number,
    y: number,
    direction: Facing,
    gun: GunDef,
    aim?: Spot,
    from?: Body,
  ) => void;
  /**
   * A laser from this spot hits this doll: a beam flashes, and the doll takes the hit.
   * With `spark` it is a jagged flash of lightning instead of a straight beam.
   */
  zap: (
    fromX: number,
    fromY: number,
    victim: Person,
    damage: number,
    pushSpeed: number,
    spark?: boolean,
  ) => void;
  /** Everything a monster can smash, except itself: building pieces, vehicles and loose items. */
  things: (self: Body) => Body[];
  /** A laser from this spot hits this thing: a beam flashes, and the thing is destroyed. */
  zapThing: (fromX: number, fromY: number, thing: Body) => void;
  /** A monster swallows this doll whole: the doll is gone. */
  swallow: (by: Body, victim: Person) => void;
  /** A part cut off a doll flies off this way and lies around. `lift` keeps it on top of the floor. */
  sever: (picture: Phaser.GameObjects.Container, lift: number, direction: Facing) => void;
  /**
   * Lightning strikes this thing and runs along the floor: every doll that touches the
   * floor is out, except `spare`, the doll that slammed it down.
   */
  thunder: (source: Body, spare?: Body) => void;
  /**
   * Something has landed at height `groundY`, reaching from `left` to `right`: the
   * trampoline right under it, or `null`. The trampoline gets squashed.
   */
  spring: (left: number, right: number, groundY: number) => Spring | null;
  /** A boss smashes this thing to pieces, which fly off the way it faces. */
  smash: (thing: Body, direction: Facing) => void;
  /** The ground shakes under a stomp. */
  quake: () => void;
  /** A puff of smoke rises from this spot. */
  smoke: (x: number, y: number) => void;
  /** A little spark flies off something at this spot. */
  spark: (x: number, y: number) => void;
  /** A ghost scares this doll: an eerie sound. */
  spook: () => void;
  /** Something smashes to pieces, which fly off with this push (pixels per second). */
  breakApart: (body: Body, pushX: number, pushY: number) => void;
  /** Blood sprays or drips from this spot: this many drops of this color. */
  bleed: (x: number, y: number, drops: number, color: number, spray: boolean) => void;
  /** Something goes off with a blast: a bomb or a barrel. */
  explode: (source: Body, blast: BlastDef) => void;
}
