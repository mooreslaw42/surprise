/**
 * The house, as measured.
 *
 * Every surface here is a slice of a wall plane extracted from the lidar scan
 * by tools/walls.py: real width, real ceiling height, real window positions in
 * metres from the left-hand end of the slice.
 *
 * PROVISIONAL: which wall belongs to which room is still a guess. The geometry
 * is measured, the room names are not. See .context/analysis/walls2/ for the
 * numbered plan and elevations these came from.
 */

export type RoomId = 'woonkamer' | 'keuken' | 'tvkamer';

export type Opening = {
  readonly kind: 'raam' | 'deur';
  /** Metres from the left edge of the surface. */
  readonly x: number;
  /** Metres from the floor. */
  readonly y: number;
  readonly w: number;
  readonly h: number;
};

/** What you see once the wall is gone. */
export type Achtergrond = 'tuin' | 'binnen';

/** How the wall is finished, which is most of what makes a room itself. */
export type Afwerking = 'oker' | 'kalk' | 'behang';

/** Things standing in the room that are not part of the puzzle. */
export type Prop = 'boekenkast' | 'balk' | 'tv' | 'aanrecht' | 'stofzuiger' | 'lamp';

export type Surface = {
  readonly id: string;
  readonly ruimte: RoomId;
  readonly naam: string;
  readonly achtergrond: Achtergrond;
  readonly afwerking: Afwerking;
  readonly props: readonly Prop[];
  /** Metres. */
  readonly width: number;
  readonly height: number;
  readonly openings: readonly Opening[];
  /** Which scanned wall this came from, so it can be checked. */
  readonly bron: string;
};

export const ROOM_NAMES: Record<RoomId, string> = {
  woonkamer: 'WOONKAMER',
  keuken: 'KEUKEN',
  tvkamer: 'TV-KAMER',
};

export const SURFACES: readonly Surface[] = [
  {
    id: 'woonkamer-tuinwand',
    achtergrond: 'tuin',
    afwerking: 'kalk',
    props: ['boekenkast', 'lamp'],
    ruimte: 'woonkamer',
    naam: 'TUINWAND',
    bron: 'scan2 wand 1, x 6.00-11.35',
    width: 5.35,
    height: 2.61,
    openings: [
      { kind: 'raam', x: 0.50, y: 0.25, w: 1.65, h: 1.70 },
      { kind: 'raam', x: 3.25, y: 0.30, w: 1.50, h: 1.55 },
    ],
  },
  {
    id: 'keuken-achterwand',
    achtergrond: 'tuin',
    afwerking: 'kalk',
    props: ['aanrecht'],
    ruimte: 'keuken',
    naam: 'ACHTERWAND',
    bron: 'scan2 wand 2, x 5.00-11.25',
    width: 6.25,
    height: 2.61,
    openings: [
      { kind: 'raam', x: 0.00, y: 0.80, w: 0.40, h: 1.45 },
      { kind: 'deur', x: 0.75, y: 0.00, w: 1.40, h: 2.15 },
      { kind: 'deur', x: 4.10, y: 0.00, w: 1.70, h: 2.15 },
    ],
  },
  {
    id: 'tvkamer-kopgevel',
    achtergrond: 'tuin',
    afwerking: 'behang',
    props: ['tv', 'stofzuiger'],
    ruimte: 'tvkamer',
    naam: 'KOPGEVEL',
    bron: 'scan2 wand 6',
    width: 3.05,
    height: 2.61,
    openings: [
      { kind: 'raam', x: 0.60, y: 1.00, w: 1.50, h: 1.20 },
    ],
  },
];

export function surfacesFor(room: RoomId): Surface[] {
  return SURFACES.filter((s) => s.ruimte === room);
}
