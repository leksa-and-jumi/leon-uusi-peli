/** A building piece of an arena: what it is, how far from the middle of the area, and how high its bottom is above the floor. */
export interface ArenaPiece<Kind> {
  kind: Kind;
  dx: number;
  up: number;
}

/** How big each building piece is. */
export type PieceSizes<Kind extends string> = Record<Kind, { halfWidth: number; height: number }>;

/** The pieces an arena is built from. */
export type ArenaKind =
  'crate' | 'steelCrate' | 'plank' | 'girder' | 'stone' | 'hay' | 'fence' | 'barrel' | 'trampoline';

/** How an arena is laid out. */
export interface ArenaRules {
  /** How far from the middle the two rows of things on either side are. */
  mid: number;
  far: number;
  /** How likely there is something in the middle, and at each of the other places. */
  middleChance: number;
  placeChance: number;
}

/** A thing to build: a few pieces, each with how far it is toward the middle from the thing's own middle. */
type Feature = readonly ArenaPiece<ArenaKind>[];

/**
 * The things an arena can have in it. All of them can be climbed: no step is higher
 * than a doll can jump. The ones that look the same from both sides can stand in the
 * middle of the area.
 */
function features(sizes: PieceSizes<ArenaKind>): {
  even: Feature[];
  uneven: Feature[];
  wide: Feature[];
} {
  const { crate, plank, stone, hay, girder } = sizes;
  const step = crate.halfWidth * 2;
  const one = (kind: ArenaKind): Feature => [{ kind, dx: 0, up: 0 }];
  // Two crates with a plank across them: a little hut. Something may stand on its roof
  const hut = (onTop?: ArenaKind): Feature => [
    { kind: 'crate', dx: -(plank.halfWidth - crate.halfWidth), up: 0 },
    { kind: 'crate', dx: plank.halfWidth - crate.halfWidth, up: 0 },
    { kind: 'plank', dx: 0, up: crate.height },
    ...(onTop ? [{ kind: onTop, dx: 0, up: crate.height + plank.height }] : []),
  ];
  const even: Feature[] = [
    one('crate'),
    one('steelCrate'),
    one('hay'),
    one('fence'),
    one('trampoline'),
    // Two crates side by side and one on top of them: a little pyramid
    [
      { kind: 'crate', dx: -crate.halfWidth, up: 0 },
      { kind: 'crate', dx: crate.halfWidth, up: 0 },
      { kind: 'crate', dx: 0, up: crate.height },
    ],
    hut(),
    hut('crate'),
    hut('hay'),
    hut('barrel'),
    [
      { kind: 'hay', dx: 0, up: 0 },
      { kind: 'stone', dx: 0, up: hay.height },
    ],
  ];
  const uneven: Feature[] = [
    // Steps of stone, higher toward the middle
    [
      { kind: 'stone', dx: -stone.halfWidth, up: 0 },
      { kind: 'stone', dx: stone.halfWidth, up: 0 },
      { kind: 'stone', dx: stone.halfWidth, up: stone.height },
    ],
    // A crate with a steel crate on it, and a stone to step up from
    [
      { kind: 'stone', dx: -(crate.halfWidth + stone.halfWidth), up: 0 },
      { kind: 'crate', dx: 0, up: 0 },
      { kind: 'steelCrate', dx: 0, up: crate.height },
    ],
  ];
  // Stairs of crates, three high toward the middle
  uneven.push([
    { kind: 'crate', dx: -step, up: 0 },
    { kind: 'crate', dx: 0, up: 0 },
    { kind: 'crate', dx: step, up: 0 },
    { kind: 'crate', dx: 0, up: crate.height },
    { kind: 'crate', dx: step, up: crate.height },
    { kind: 'steelCrate', dx: step, up: crate.height * 2 },
  ]);
  // The big things, which only fit in the middle of the area
  const reach = girder.halfWidth - crate.halfWidth;
  const wide: Feature[] = [
    // A big pyramid: three crates, two on those, and one on top
    [
      { kind: 'crate', dx: -step, up: 0 },
      { kind: 'crate', dx: 0, up: 0 },
      { kind: 'crate', dx: step, up: 0 },
      { kind: 'crate', dx: -step / 2, up: crate.height },
      { kind: 'crate', dx: step / 2, up: crate.height },
      { kind: 'steelCrate', dx: 0, up: crate.height * 2 },
    ],
    // A bridge: a steel beam across two towers of crates, with a crate at each end to step up from
    [
      { kind: 'crate', dx: -reach - step, up: 0 },
      { kind: 'crate', dx: -reach, up: 0 },
      { kind: 'crate', dx: reach, up: 0 },
      { kind: 'crate', dx: reach + step, up: 0 },
      { kind: 'crate', dx: -reach, up: crate.height },
      { kind: 'crate', dx: reach, up: crate.height },
      { kind: 'girder', dx: 0, up: crate.height * 2 },
    ],
    // Two huts side by side, and a third one on top of where they meet: a house with an upper floor
    [
      ...hut().map((piece) => ({ ...piece, dx: piece.dx - plank.halfWidth })),
      ...hut().map((piece) => ({ ...piece, dx: piece.dx + plank.halfWidth })),
      ...hut('barrel').map((piece) => ({ ...piece, up: piece.up + crate.height + plank.height })),
    ],
  ];
  return { even, uneven, wide };
}

/**
 * Lay out an arena: a few things built of building pieces, the same on both sides of
 * the middle of the area, and different every time. There may be one thing in the
 * middle, and on each side one a little way out and one far out. There are always at
 * least two things. The pieces come bottom first, so that they can be put in in this
 * order. `random` gives numbers from 0 up to 1, like `Math.random`.
 */
export function layOutArena(
  sizes: PieceSizes<ArenaKind>,
  rules: ArenaRules,
  random: () => number = Math.random,
): ArenaPiece<ArenaKind>[] {
  const { even, uneven, wide } = features(sizes);
  const pick = (from: readonly Feature[]): Feature =>
    from[Math.min(from.length - 1, Math.floor(random() * from.length))] ?? [];
  const any = [...even, ...uneven];
  // In the middle there is room for the big things too
  const middle = random() < rules.middleChance ? pick([...wide, ...wide, ...even]) : null;
  let sides = [rules.mid, rules.far].filter(() => random() < rules.placeChance);
  // Never an empty arena: with nothing in the middle and nothing drawn for the sides, both places get something
  if (sides.length === 0 || (!middle && sides.length < 2)) sides = [rules.mid, rules.far];
  const pieces: ArenaPiece<ArenaKind>[] = middle ? [...middle] : [];
  for (const out of sides) {
    const feature = pick(any);
    for (const { kind, dx, up } of feature) {
      pieces.push({ kind, dx: -out + dx, up }, { kind, dx: out - dx, up });
    }
  }
  return pieces.sort((one, other) => one.up - other.up);
}
