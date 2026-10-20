import { SURFACES, type RoomId, type Surface } from '../../data/house.ts';
import { surfaceToRows } from '../sloop/generate.ts';
import { TILE, type Board, type Point, type TileValue, index } from './model.ts';

/**
 * Elektra levels built on the same measured walls as Sloop. Windows, doors and
 * lintels are what you have to route around, so the real geometry is the
 * puzzle rather than decoration.
 */

export type ElektraLevel = {
  readonly id: string;
  readonly ruimte: RoomId;
  readonly vlak: string;
  readonly praatje: string;
  readonly board: Board;
};

type Placement = {
  readonly meterkast: Point;
  readonly stopcontacten: readonly Point[];
  readonly belasting: readonly number[];
  readonly praatje: string;
};

/**
 * Hand-placed, because where a socket goes is a decision about the room, not
 * something to derive. Positions are in wall cells, from the top left.
 */
const PLACEMENTS: Record<string, Placement> = {
  'woonkamer-tuinwand': {
    meterkast: { x: 0, y: 6 },
    stopcontacten: [{ x: 14, y: 3 }, { x: 7, y: 2 }, { x: 11, y: 0 }],
    belasting: [6, 4, 2],
    praatje: 'GEEN DRAAD MAG EEN ANDERE KRUISEN.',
  },
  'keuken-achterwand': {
    meterkast: { x: 6, y: 6 },
    stopcontacten: [{ x: 11, y: 2 }, { x: 8, y: 0 }, { x: 11, y: 6 }],
    belasting: [8, 4, 2],
    praatje: 'TUSSEN DE DEUREN DOOR. MEER RUIMTE IS ER NIET.',
  },
  'tvkamer-kopgevel': {
    meterkast: { x: 0, y: 6 },
    stopcontacten: [{ x: 8, y: 1 }, { x: 1, y: 2 }, { x: 8, y: 3 }],
    belasting: [5, 3, 3],
    praatje: 'DRIE STOPCONTACTEN, EEN METERKAST.',
  },
};

export function boardFor(surface: Surface): Board {
  const rows = surfaceToRows(surface);
  const placement = PLACEMENTS[surface.id];
  if (!placement) throw new Error(`no socket placement for ${surface.id}`);

  const width = rows[0]!.length;
  const height = rows.length;
  const tiles: TileValue[] = [];
  for (const row of rows) {
    for (const ch of row) {
      // Wall is where cable can go. Openings and lintels are not.
      tiles.push(ch === '#' ? TILE.MUUR : TILE.GESLOTEN);
    }
  }

  const board: Board = {
    width, height, tiles,
    meterkast: placement.meterkast,
    stopcontacten: placement.stopcontacten,
    belasting: placement.belasting,
    maxAmp: 16,
  };
  tiles[index(board, placement.meterkast)] = TILE.METERKAST;
  for (const socket of placement.stopcontacten) {
    tiles[index(board, socket)] = TILE.STOPCONTACT;
  }
  return board;
}

export const ELEKTRA_LEVELS: readonly ElektraLevel[] = SURFACES.map((surface) => ({
  id: `elektra-${surface.id}`,
  ruimte: surface.ruimte,
  vlak: surface.naam,
  praatje: PLACEMENTS[surface.id]!.praatje,
  board: boardFor(surface),
}));
