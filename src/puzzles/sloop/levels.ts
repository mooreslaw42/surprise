import { parseGrid, type Grid } from './model.ts';

/**
 * Sloop levels, authored as ASCII art.
 *   '.' already open   '#' rubble
 *   'B' dragende balk  'L' leiding   'K' kabel
 *
 * Par is computed by the solver rather than written down, so it can never
 * drift away from the level.
 */
export type SloopLevel = {
  readonly id: string;
  readonly ruimte: string;
  readonly vlak: string;
  readonly praatje: string;
  readonly rows: readonly string[];
};

export const SLOOP_LEVELS: readonly SloopLevel[] = [
  {
    id: 'sloop-woonkamer-binnenmuur',
    ruimte: 'woonkamer',
    vlak: 'BINNENMUUR',
    praatje: 'DEZE MUUR MAG WEG. DE BALK NIET.',
    rows: [
      '.########.',
      '##########',
      '###BBBB###',
      '##########',
      '##########',
      '.########.',
    ],
  },
  {
    id: 'sloop-keuken-achterwand',
    ruimte: 'keuken',
    vlak: 'ACHTERWAND',
    praatje: 'ACHTER HET AANRECHT LOPEN DE LEIDINGEN.',
    rows: [
      '############',
      '##L######L##',
      '##L######L##',
      '##LLLLLLLL##',
      '############',
      '############',
    ],
  },
  {
    id: 'sloop-tvkamer-plafond',
    ruimte: 'tvkamer',
    vlak: 'PLAFOND',
    praatje: 'KABELS IN HET PLAFOND. RUSTIG AAN.',
    rows: [
      '##K#####K###',
      '#.K#BBB#K#.#',
      '#.KKKKKKK#.#',
      '#.#######.#.',
      '############',
      '############',
    ],
  },
];

export function gridFor(level: SloopLevel): Grid {
  return parseGrid(level.rows);
}
