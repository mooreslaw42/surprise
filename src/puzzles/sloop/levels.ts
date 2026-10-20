import { SURFACES, type Achtergrond, type RoomId } from '../../data/house.ts';
import { surfaceToRows } from './generate.ts';
import { parseGrid, type Grid } from './model.ts';

/**
 * Sloop levels, generated from the measured surfaces in data/house.ts rather
 * than drawn by hand. The wall you are knocking down is the wall that is
 * actually there, windows and all.
 *
 * Par is computed by the solver, never written down, so it cannot drift.
 */
export type SloopLevel = {
  readonly id: string;
  readonly ruimte: RoomId;
  readonly vlak: string;
  readonly praatje: string;
  readonly achtergrond: Achtergrond;
  readonly rows: readonly string[];
};

const PRAATJES: Record<string, string> = {
  'woonkamer-tuinwand': 'DE LATEIEN BOVEN DE RAMEN BLIJVEN.',
  'keuken-achterwand': 'TWEE DEUREN, TWEE LATEIEN.',
  'tvkamer-kopgevel': 'KOPGEVEL. EEN RAAM, EEN LATEI.',
};

export const SLOOP_LEVELS: readonly SloopLevel[] = SURFACES.map((surface) => ({
  id: `sloop-${surface.id}`,
  ruimte: surface.ruimte,
  vlak: surface.naam,
  achtergrond: surface.achtergrond,
  praatje: PRAATJES[surface.id] ?? 'SLOPEN MAAR. VOORZICHTIG.',
  rows: surfaceToRows(surface),
}));

export function gridFor(level: SloopLevel): Grid {
  return parseGrid(level.rows);
}
