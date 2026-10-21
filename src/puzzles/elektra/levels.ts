import { SURFACES, type RoomId, type Surface } from '../../data/house.ts';
import { surfaceToRows } from '../sloop/generate.ts';
import {
  TILE, type Board, type Device, type GroepSoort, type Point, type TileValue, index,
} from './model.ts';

/**
 * Elektra levels on the same measured walls as Sloop. Windows, doors and
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
 * Hand-placed: where a socket or a switch goes is a decision about the room,
 * not something to derive.
 */
const PLACEMENTS: Record<string, Placement> = {
  'woonkamer-tuinwand': {
    groepen: TWEE_WCD(0, 5),
    devices: [stopcontact(14, 3, 10), stopcontact(7, 2, 6), stopcontact(11, 0, 4)],
    praatje: 'SAMEN 20A. EEN GROEP TREKT ER 16.',
  },
  'keuken-achterwand': {
    groepen: TWEE_WCD(6, 5),
    devices: [stopcontact(11, 2, 8), stopcontact(8, 0, 8), stopcontact(11, 6, 6)],
    praatje: 'DE OVEN ALLEEN OP EEN GROEP.',
  },
  'woonkamer-binnenmuur': {
    groepen: LICHT_EN_WCD(0, 4),
    devices: [
      lamp(6, 0, 6), schakelaar(10, 3),
      stopcontact(11, 6, 10), stopcontact(2, 2, 8),
    ],
    praatje: 'LICHT OP DE LICHTGROEP. STOPCONTACTEN NIET.',
  },
  'keuken-zijwand': {
    groepen: LICHT_EN_WCD(0, 4),
    devices: [
      lamp(6, 0, 6), schakelaar(7, 2),
      stopcontact(8, 5, 10), stopcontact(2, 1, 8),
    ],
    // The waterleiding was there first.
    blokkade: [{ x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 }],
    praatje: 'DE WATERLEIDING ZAT ER AL. ERLANGS.',
  },
  'tvkamer-tuinwand': {
    groepen: LICHT_EN_WCD(0, 4),
    devices: [
      lamp(1, 0, 4), lamp(6, 0, 4), schakelaar(6, 2),
      stopcontact(12, 3, 10), stopcontact(4, 4, 8),
    ],
    praatje: 'TWEE LAMPEN, EEN SCHAKELAAR, EEN LICHTGROEP.',
  },
  'tvkamer-kopgevel': {
    groepen: LICHT_EN_WCD(0, 4),
    devices: [
      lamp(8, 0, 6), schakelaar(7, 2),
      stopcontact(1, 2, 8), stopcontact(8, 4, 10),
    ],
    praatje: 'KOPGEVEL. DRIE GROEPEN, WEINIG MUUR.',
  },
};

const UITLEG_BASIS = [
  'ELK STOPCONTACT WIL EEN DRAAD NAAR DE METERKAST. SLEEP HEM ERHEEN.',
  'HET GETAL EROP IS WAT HIJ TREKT, IN AMPERE. EEN GROEP HOUDT ER 16. SAMEN MEER? DAN MOETEN ZE OVER TWEE GROEPEN.',
  'DRADEN MOGEN NAAST ELKAAR LOPEN, MAAR NOOIT OVER ELKAAR HEEN.',
];

const UITLEG_GROEPEN = [
  'NIEUW: LICHT EN STOPCONTACTEN MOGEN NIET OP DEZELFDE GROEP.',
  'DE LAMPEN GAAN VIA DE SCHAKELAAR NAAR LICHT. DE STOPCONTACTEN NAAR WCD1 OF WCD2 — JIJ KIEST WELKE.',
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

export const ELEKTRA_LEVELS: readonly ElektraLevel[] = SURFACES.map((surface) => {
  const board = boardFor(surface);
  const heeftLampen = board.devices.some((d) => d.kind === 'lamp');
  const heeftLichtgroep = board.groepen.some((g) => g.soort === 'licht');
  return {
    id: `elektra-${surface.id}`,
    ruimte: surface.ruimte,
    vlak: surface.naam,
    praatje: PLACEMENTS[surface.id]!.praatje,
    blokkade: PLACEMENTS[surface.id]!.blokkade ?? [],
    uitleg: heeftLichtgroep ? UITLEG_GROEPEN : heeftLampen ? UITLEG_LAMPEN : UITLEG_BASIS,
    board,
  };
});
