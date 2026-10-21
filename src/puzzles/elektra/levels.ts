import { SURFACES, type RoomId, type Surface } from '../../data/house.ts';
import { surfaceToRows } from '../sloop/generate.ts';
import { TILE, type Board, type Device, type Point, type TileValue, index } from './model.ts';

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
  readonly board: Board;
};

type Placement = {
  readonly groepen: readonly { cel: Point; naam: string }[];
  readonly devices: readonly Device[];
  readonly praatje: string;
};

const MAX_AMP = 16;

const stopcontact = (x: number, y: number, amp: number): Device =>
  ({ kind: 'stopcontact', cel: { x, y }, amp });
const lamp = (x: number, y: number, amp: number): Device =>
  ({ kind: 'lamp', cel: { x, y }, amp });
const schakelaar = (x: number, y: number): Device =>
  ({ kind: 'schakelaar', cel: { x, y }, amp: 0 });

const TWEE_GROEPEN = (x: number, yTop: number) => [
  { cel: { x, y: yTop }, naam: 'G1' },
  { cel: { x, y: yTop + 1 }, naam: 'G2' },
];

/**
 * Hand-placed: where a socket or a switch goes is a decision about the room,
 * not something to derive.
 */
const PLACEMENTS: Record<string, Placement> = {
  'woonkamer-tuinwand': {
    groepen: TWEE_GROEPEN(0, 5),
    devices: [stopcontact(14, 3, 10), stopcontact(7, 2, 6), stopcontact(11, 0, 4)],
    praatje: 'SAMEN 20A. EEN GROEP TREKT ER 16.',
  },
  'keuken-achterwand': {
    groepen: TWEE_GROEPEN(6, 5),
    devices: [stopcontact(11, 2, 8), stopcontact(8, 0, 8), stopcontact(11, 6, 6)],
    praatje: 'DE OVEN ALLEEN OP EEN GROEP.',
  },
  'tvkamer-kopgevel': {
    groepen: TWEE_GROEPEN(0, 5),
    devices: [stopcontact(8, 1, 6), stopcontact(1, 2, 6), stopcontact(8, 3, 6)],
    praatje: 'DRIE KEER ZES. DAT WORDT TWEE GROEPEN.',
  },
  'woonkamer-binnenmuur': {
    groepen: TWEE_GROEPEN(0, 5),
    devices: [lamp(6, 0, 6), schakelaar(10, 3), stopcontact(11, 6, 12)],
    praatje: 'DE LAMP GAAT EERST NAAR DE SCHAKELAAR.',
  },
  'keuken-zijwand': {
    groepen: TWEE_GROEPEN(0, 5),
    devices: [lamp(4, 0, 6), schakelaar(7, 3), stopcontact(7, 6, 12)],
    praatje: 'SCHAKELAAR OP HANDHOOGTE, NAAST DE DEUR.',
  },
  'tvkamer-tuinwand': {
    groepen: TWEE_GROEPEN(0, 5),
    devices: [lamp(1, 0, 4), lamp(6, 0, 4), schakelaar(6, 2), stopcontact(12, 3, 10)],
    praatje: 'TWEE LAMPEN, EEN SCHAKELAAR.',
  },
};

const UITLEG_BASIS = [
  'ELK STOPCONTACT WIL EEN DRAAD NAAR DE METERKAST. SLEEP HEM ERHEEN.',
  'HET GETAL EROP IS WAT HIJ TREKT, IN AMPERE. EEN GROEP HOUDT ER 16. SAMEN MEER? DAN MOETEN ZE OVER TWEE GROEPEN.',
  'DRADEN MOGEN NAAST ELKAAR LOPEN, MAAR NOOIT OVER ELKAAR HEEN.',
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
  return {
    id: `elektra-${surface.id}`,
    ruimte: surface.ruimte,
    vlak: surface.naam,
    praatje: PLACEMENTS[surface.id]!.praatje,
    uitleg: heeftLampen ? UITLEG_LAMPEN : UITLEG_BASIS,
    board,
  };
});
