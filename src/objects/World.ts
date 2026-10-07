import type { BlastDef, GunDef } from '../config';
import type { Box } from '../logic/ground';
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
  /** A doll hit the ground, falling this fast (pixels per second). */
  landed: (fallSpeed: number) => void;
  /** Fire a bullet from this spot. With no shooter, it hits dolls of any color. */
  shoot: (shooter: Person | null, x: number, y: number, direction: Facing, gun: GunDef) => void;
  /** Something smashes to pieces, which fly off with this push (pixels per second). */
  breakApart: (body: Body, pushX: number, pushY: number) => void;
  /** Blood sprays or drips from this spot: this many drops of this color. */
  bleed: (x: number, y: number, drops: number, color: number, spray: boolean) => void;
  /** Something goes off with a blast: a bomb or a barrel. */
  explode: (source: Body, blast: BlastDef) => void;
}
