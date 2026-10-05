import { clamp } from './bounds';

/** The part of the screen where people can be put. */
export interface PlaceArea {
  left: number;
  right: number;
  top: number;
  floorY: number;
}

export interface PersonSize {
  height: number;
  halfWidth: number;
}

/**
 * Where a person's feet go when you click at a point: the person appears around the
 * click, but always fully inside the area and never below the floor.
 */
export function placeFeet(
  px: number,
  py: number,
  area: PlaceArea,
  size: PersonSize,
): { x: number; y: number } {
  return {
    x: clamp(px, area.left + size.halfWidth, area.right - size.halfWidth),
    y: clamp(py + size.height / 2, area.top + size.height, area.floorY),
  };
}
