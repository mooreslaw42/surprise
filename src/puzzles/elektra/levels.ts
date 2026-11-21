import { surfacesIn, type RoomId, type Surface } from '../../data/house.ts';
import { surfaceToRows } from '../sloop/generate.ts';
import {
  TILE, type Board, type Device, type GroepSoort, type Point, type TileValue, index,
} from './model.ts';

/**
 * Elektra levels on the same walls as Sloop. Windows, doors and
 * lintels are what you route around, so the real geometry is the puzzle.
 *
 * The set escalates: sockets to the meterkast, then a lamp that has to reach
 * a schakelaar first, then two lamps sharing one switch.
 */

export type ElektraLevel = {
  readonly id: string;
  readonly ruimte: RoomId;
  readonly vlak: string;
  readonly praatje: string;
  readonly uitleg: readonly string[];
  readonly blokkade: readonly Point[];
  readonly board: Board;
};

type Placement = {
  readonly groepen: readonly { cel: Point; naam: string; soort: GroepSoort }[];
  readonly devices: readonly Device[];
  /** Waterleiding already on the wall. Cable cannot cross it. */
  readonly blokkade?: readonly Point[];
  readonly praatje: string;
};

const MAX_AMP = 16;

const stopcontact = (x: number, y: number, amp: number): Device =>
  ({ kind: 'stopcontact', cel: { x, y }, amp });
const lamp = (x: number, y: number, amp: number): Device =>
  ({ kind: 'lamp', cel: { x, y }, amp });
const schakelaar = (x: number, y: number): Device =>
  ({ kind: 'schakelaar', cel: { x, y }, amp: 0 });

/**
 * Half of a wisselschakelaar: a lamp switched from two places. The first
 * switch runs to the second, and only the second reaches the lichtgroep, so
 * the chain is three links long.
 */
const wissel = (x: number, y: number, naar?: number): Device =>
  ({ kind: 'schakelaar', cel: { x, y }, amp: 0, naar });

/** A lamp that must reach one particular switch. */
const lampNaar = (x: number, y: number, amp: number, naar: number): Device =>
  ({ kind: 'lamp', cel: { x, y }, amp, naar });

/** Two socket groups, for the stages before the lights arrive. */
const TWEE_WCD = (x: number, yTop: number) => [
  { cel: { x, y: yTop }, naam: 'WCD1', soort: 'wcd' as const },
  { cel: { x, y: yTop + 1 }, naam: 'WCD2', soort: 'wcd' as const },
];

/**
 * A lighting group and two socket groups. Lights and sockets may not share a
 * breaker, so the lamps are forced onto LICHT — the choice that is left is
 * which of the two socket groups each stopcontact goes on, and that is
 * decided by the amps.
 */
const LICHT_EN_WCD = (x: number, yTop: number) => [
  { cel: { x, y: yTop }, naam: 'LICHT', soort: 'licht' as const },
  { cel: { x, y: yTop + 1 }, naam: 'WCD1', soort: 'wcd' as const },
  { cel: { x, y: yTop + 2 }, naam: 'WCD2', soort: 'wcd' as const },
];

/**
 * Where everything sits. These came out of tools/elektra-zoek.ts, which
 * scatters a wall's devices over the cells cable can reach and keeps a
 * scatter the solver can wire with a good deal of detour. A door runs floor
 * to lintel and cable does not cross it, so on a wall with a door everything
 * is on the meterkast's side.
 */
const PLACEMENTS: Record<string, Placement> = {
  'woonkamer-tuinwand': {
    groepen: TWEE_WCD(0, 4),
    devices: [stopcontact(3, 5, 10), stopcontact(11, 6, 6), stopcontact(13, 2, 4)],
    praatje: 'SAMEN 20A. EEN GROEP TREKT ER 16.',
  },
  'keuken-achterwand': {
    groepen: TWEE_WCD(0, 4),
    devices: [stopcontact(5, 3, 8), stopcontact(7, 6, 8), stopcontact(4, 4, 6)],
    praatje: 'DE OVEN ALLEEN OP EEN GROEP.',
  },
  'woonkamer-okerwand': {
    groepen: LICHT_EN_WCD(0, 3),
    devices: [
      lamp(12, 0, 6), schakelaar(3, 2),
      stopcontact(2, 6, 10), stopcontact(11, 3, 8),
    ],
    praatje: 'LICHT OP DE LICHTGROEP. STOPCONTACTEN NIET.',
  },
  'keuken-zijwand': {
    groepen: LICHT_EN_WCD(0, 3),
    devices: [
      lamp(14, 0, 6), schakelaar(14, 2),
      stopcontact(14, 6, 10), stopcontact(11, 4, 8),
    ],
    // The waterleiding was there first.
    blokkade: [{ x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 }],
    praatje: 'DE WATERLEIDING ZAT ER AL. ERLANGS.',
  },
  'tvkamer-tuinwand': {
    groepen: LICHT_EN_WCD(0, 3),
    devices: [
      lamp(3, 0, 4), lamp(6, 0, 4), schakelaar(8, 3),
      stopcontact(4, 3, 10), stopcontact(9, 6, 8),
    ],
    praatje: 'TWEE LAMPEN, EEN SCHAKELAAR, EEN LICHTGROEP.',
  },
  'tvkamer-kopgevel': {
    groepen: LICHT_EN_WCD(0, 3),
    devices: [
      lamp(0, 0, 6), schakelaar(7, 3),
      stopcontact(4, 6, 10), stopcontact(8, 2, 8),
    ],
    praatje: 'KOPGEVEL. DRIE GROEPEN, WEINIG MUUR.',
  },
  // The two hardest walls. Each has a lamp switched from two places, so the
  // run goes lamp -> schakelaar -> schakelaar -> lichtgroep, and only the far
  // switch may touch the groep.
  'tvkamer-zijwand': {
    groepen: LICHT_EN_WCD(0, 3),
    devices: [
      lampNaar(7, 0, 4, 2),       // 0: lamp, to the near switch
      lampNaar(3, 0, 4, 2),       // 1: and the other lamp, to the same one
      wissel(3, 2, 3),            // 2: near switch, to the far one
      wissel(5, 3),               // 3: far switch, to LICHT
      stopcontact(8, 4, 10),
      stopcontact(6, 6, 8),
    ],
    blokkade: [{ x: 4, y: 4 }, { x: 4, y: 5 }, { x: 4, y: 6 }],
    praatje: 'TWEE LAMPEN, EEN WISSELSCHAKELING, EEN LEIDING.',
  },
  'tvkamer-deurwand': {
    groepen: LICHT_EN_WCD(0, 3),
    devices: [
      lampNaar(1, 0, 4, 1),
      wissel(2, 2, 2),
      wissel(6, 2),
      stopcontact(4, 6, 8),
      stopcontact(7, 6, 10),
      stopcontact(5, 5, 6),
    ],
    praatje: 'ALLES AAN DEZE KANT VAN DE DEUR. ZES DRADEN.',
  },
};

const UITLEG_BASIS = [
  'ELK STOPCONTACT WIL EEN DRAAD NAAR DE METERKAST. SLEEP HEM ERHEEN.',
  'HET GETAL EROP IS WAT HIJ TREKT, IN AMPERE. EEN GROEP HOUDT ER 16. SAMEN MEER? DAN MOETEN ZE OVER TWEE GROEPEN.',
  'DRADEN MOGEN NAAST ELKAAR LOPEN, MAAR NOOIT OVER ELKAAR HEEN.',
];

const UITLEG_WISSEL = [
  'DEZE LAMP MOET VANAF TWEE PLEKKEN AAN KUNNEN. EEN WISSELSCHAKELING.',
  'DUS: LAMP NAAR DE EERSTE SCHAKELAAR, DIE NAAR DE TWEEDE, EN PAS DIE NAAR DE LICHTGROEP.',
  'DRIE DRADEN ACHTER ELKAAR. EN NOG STEEDS NIKS KRUISEN.',
];

const UITLEG_GROEPEN = [
  'NIEUW: LICHT EN STOPCONTACTEN MOGEN NIET OP DEZELFDE GROEP.',
  'DE LAMPEN GAAN VIA DE SCHAKELAAR NAAR LICHT. DE STOPCONTACTEN NAAR WCD1 OF WCD2: JIJ KIEST WELKE.',
  'ELKE GROEP HOUDT 16A. EN DRADEN KRUISEN NOG STEEDS NIET.',
];

const UITLEG_LAMPEN = [
  'EEN LAMP GAAT NIET RECHTSTREEKS NAAR DE METERKAST. EERST NAAR EEN SCHAKELAAR.',
  'EN DAN VAN DE SCHAKELAAR NAAR EEN GROEP. DE LAMP TELT MEE OP DIE GROEP.',
  'VERDER HETZELFDE: NAAST ELKAAR MAG, OVER ELKAAR NIET.',
];

export function boardFor(surface: Surface): Board {
  const rows = surfaceToRows(surface);
  const placement = PLACEMENTS[surface.id];
  if (!placement) throw new Error(`no socket placement for ${surface.id}`);

  const width = rows[0]!.length;
  const height = rows.length;
  const tiles: TileValue[] = [];
  for (const row of rows) {
    for (const ch of row) tiles.push(ch === '#' ? TILE.MUUR : TILE.GESLOTEN);
  }

  for (const cel of placement.blokkade ?? []) {
    tiles[cel.y * width + cel.x] = TILE.GESLOTEN;
  }

  const board: Board = {
    width, height, tiles,
    groepen: placement.groepen.map((g) => ({ ...g, maxAmp: MAX_AMP })),
    devices: placement.devices,
  };
  for (const groep of board.groepen) tiles[index(board, groep.cel)] = TILE.METERKAST;
  for (const device of board.devices) {
    tiles[index(board, device.cel)] =
      device.kind === 'lamp' ? TILE.LAMP
        : device.kind === 'schakelaar' ? TILE.SCHAKELAAR
          : TILE.STOPCONTACT;
  }
  return board;
}

export const ELEKTRA_LEVELS: readonly ElektraLevel[] = surfacesIn('elektra').map((surface) => {
  const board = boardFor(surface);
  const heeftLampen = board.devices.some((d) => d.kind === 'lamp');
  const heeftLichtgroep = board.groepen.some((g) => g.soort === 'licht');
  const heeftWissel = board.devices.some((d) => d.kind === 'schakelaar' && d.naar !== undefined);
  return {
    id: `elektra-${surface.id}`,
    ruimte: surface.ruimte,
    vlak: surface.naam,
    praatje: PLACEMENTS[surface.id]!.praatje,
    blokkade: PLACEMENTS[surface.id]!.blokkade ?? [],
    uitleg: heeftWissel ? UITLEG_WISSEL
      : heeftLichtgroep ? UITLEG_GROEPEN
        : heeftLampen ? UITLEG_LAMPEN : UITLEG_BASIS,
    board,
  };
});
