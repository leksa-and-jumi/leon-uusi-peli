import type { GunDef } from '../config';
import type { Box } from '../logic/ground';
import type { PlaceArea } from '../logic/place';
import type { Facing } from '../logic/walk';
import type { Body } from './Body';
import type { Item } from './Item';
import type { Person } from './Person';

/** What everything in the area needs to know about the world around it each frame. */
export interface World {
  area: PlaceArea;
  bottom: number;
  people: readonly Person[];
  /** The boxes of all the solid things, except `body` itself. */
  solidBoxes: (body: Body) => Box[];
  /** Show a hit at this spot. `deadly` when it was the last one. */
  hitEffect: (x: number, y: number, deadly: boolean) => void;
  /** Fire a bullet from this spot. */
  shoot: (shooter: Person, x: number, y: number, direction: Facing, gun: GunDef) => void;
  /** A bomb goes off. */
  explode: (bomb: Item) => void;
}
