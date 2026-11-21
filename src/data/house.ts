/**
 * The house, as Pim drew it.
 *
 * Three rooms in a row, north to south: the woonkamer (4,5 by 5 m), the
 * keuken (3 by 5,5 m) and the tv-kamer, which the family calls the snug
 * (4,5 by 3 m). The walls here are the ones on his floor plan, numbered I to
 * V there, plus the three inside walls he confirmed off a schematic. Widths
 * are his; window positions are read off his sketch, two photographs and a
 * walk-through video, so they are right to a hand's width and no better.
 * Every wall is described as you see it standing in the room.
 *
 * Four walls are deliberately absent: the bookcase wall and the wall with
 * the kitchen doors in the woonkamer, and both end walls of the keuken. He
 * said to leave them out.
 *
 * The first version of this file came from a lidar scan and guessed which
 * wall belonged to which room. It guessed wrong, which is why this one is
 * drawn rather than measured.
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
  /** How the frame is divided, where it is not the plain two-pane window. */
  readonly stijl?: Raamstijl;
};

/**
 * 'staal' is the big black steel window in the ochre wall, three by three.
 * 'boog' is the little arched one beside it. 'bovenlicht' has a hopper
 * across the top, 'kruis' is four panes, 'gordijn' is the doorway with the
 * orange curtain in it and nothing behind but the next room.
 */
export type Raamstijl = 'staal' | 'boog' | 'bovenlicht' | 'kruis' | 'gordijn';

/** What you see once the wall is gone. */
export type Achtergrond = 'tuin' | 'binnen';

/** How the wall is finished, which is most of what makes a room itself. */
export type Afwerking = 'oker' | 'kalk' | 'behang' | 'kaal';

/** Things standing in the room that are not part of the puzzle. */
export type Prop =
  | 'boekenkast' | 'balk' | 'tv' | 'aanrecht' | 'stofzuiger' | 'lamp'
  | 'gordijn-paars' | 'gordijn-rood';

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
  /**
   * Which stages this wall appears in. Interior walls that never had to come
   * down still need wiring, so they show up in Elektra only.
   */
  readonly stages?: readonly ('sloop' | 'elektra')[];
  /** Which wall on Pim's plan this is, so it can be checked against it. */
  readonly bron: string;
};

export const ROOM_NAMES: Record<RoomId, string> = {
  woonkamer: 'WOONKAMER',
  keuken: 'KEUKEN',
  tvkamer: 'TV-KAMER',
};

const HOOG = 2.6;

export const SURFACES: readonly Surface[] = [
  {
    // Two garden windows with the painting on the pier between them.
    id: 'woonkamer-tuinwand',
    ruimte: 'woonkamer',
    naam: 'TUINWAND',
    bron: 'wand II, oost',
    achtergrond: 'tuin',
    afwerking: 'kalk',
    props: ['tv'],
    width: 5.0,
    height: HOOG,
    openings: [
      { kind: 'raam', x: 0.35, y: 0.60, w: 2.00, h: 1.50 },
      { kind: 'raam', x: 3.40, y: 0.60, w: 1.25, h: 1.50 },
    ],
  },
  {
    // Window over the radiator, the pier, and the back door hung on a window.
    id: 'keuken-achterwand',
    ruimte: 'keuken',
    naam: 'ACHTERWAND',
    bron: 'wand III, oost',
    achtergrond: 'tuin',
    afwerking: 'kalk',
    props: ['gordijn-rood'],
    width: 5.5,
    height: HOOG,
    openings: [
      { kind: 'raam', x: 0.40, y: 0.90, w: 1.10, h: 1.25, stijl: 'bovenlicht' },
      { kind: 'deur', x: 2.95, y: 0.00, w: 0.85, h: 2.10 },
      { kind: 'raam', x: 3.80, y: 0.90, w: 1.40, h: 1.20 },
    ],
  },
  {
    // The wall everybody remembers: ochre, the steel window, purple curtains.
    id: 'woonkamer-okerwand',
    ruimte: 'woonkamer',
    naam: 'OKERWAND',
    bron: 'wand I, noord',
    achtergrond: 'tuin',
    afwerking: 'oker',
    props: ['gordijn-paars', 'lamp'],
    width: 4.5,
    height: HOOG,
    openings: [
      { kind: 'raam', x: 0.45, y: 0.95, w: 0.60, h: 0.75, stijl: 'boog' },
      { kind: 'raam', x: 1.55, y: 0.45, w: 2.30, h: 1.60, stijl: 'staal' },
    ],
  },
  {
    // The kitchen itself: units the whole length, no window anywhere.
    id: 'keuken-zijwand',
    ruimte: 'keuken',
    naam: 'ZIJWAND',
    bron: 'wand d, west',
    achtergrond: 'binnen',
    afwerking: 'kalk',
    props: ['aanrecht'],
    width: 5.5,
    height: HOOG,
    openings: [],
  },
  {
    id: 'tvkamer-tuinwand',
    ruimte: 'tvkamer',
    naam: 'TUINWAND',
    bron: 'wand V, zuid',
    achtergrond: 'tuin',
    afwerking: 'kaal',
    props: ['stofzuiger'],
    width: 4.5,
    height: HOOG,
    openings: [
      { kind: 'raam', x: 3.20, y: 0.70, w: 0.90, h: 1.45, stijl: 'bovenlicht' },
    ],
  },
  {
    // The snug is mid-job: this wall is stripped back to green plaster.
    id: 'tvkamer-kopgevel',
    ruimte: 'tvkamer',
    naam: 'KOPGEVEL',
    bron: 'wand IV, oost',
    achtergrond: 'tuin',
    afwerking: 'kaal',
    props: ['stofzuiger'],
    width: 3.0,
    height: HOOG,
    openings: [
      { kind: 'raam', x: 0.70, y: 0.75, w: 1.60, h: 1.45, stijl: 'kruis' },
    ],
  },
  {
    // Yellow check wallpaper, and not one thing on it.
    id: 'tvkamer-zijwand',
    ruimte: 'tvkamer',
    naam: 'ZIJWAND',
    bron: 'wand f, west',
    achtergrond: 'binnen',
    afwerking: 'behang',
    props: ['stofzuiger'],
    stages: ['elektra'],
    width: 3.0,
    height: HOOG,
    openings: [],
  },
  {
    // The same paper, and the doorway to the keuken with its orange curtain.
    id: 'tvkamer-deurwand',
    ruimte: 'tvkamer',
    naam: 'DEURWAND',
    bron: 'wand g, noord',
    achtergrond: 'binnen',
    afwerking: 'behang',
    props: [],
    stages: ['elektra'],
    width: 4.5,
    height: HOOG,
    openings: [
      { kind: 'deur', x: 2.85, y: 0.00, w: 0.90, h: 2.10, stijl: 'gordijn' },
    ],
  },
];

export function surfacesIn(stage: 'sloop' | 'elektra'): Surface[] {
  return SURFACES.filter((s) => (s.stages ?? ['sloop', 'elektra']).includes(stage));
}

export function surfacesFor(room: RoomId): Surface[] {
  return SURFACES.filter((s) => s.ruimte === room);
}
