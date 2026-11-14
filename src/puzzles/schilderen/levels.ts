import { SURFACES, type Surface } from '../../data/house.ts';
import { surfaceToRows } from '../sloop/generate.ts';
import { parseMuur, type Muur } from './model.ts';

/**
 * Schilderniveaus, on the measured walls. Paint goes on the wall and over the
 * lintels; the openings stay bare.
 *
 * The walls with big door openings are left out: there is no way to cover
 * them in a single run at all, which the solver says plainly when asked.
 */

export type SchilderLevel = {
  readonly id: string;
  readonly ruimte: string;
  readonly vlak: string;
  readonly praatje: string;
  readonly uitleg: readonly string[];
  /** Which surface this is, so the room can be drawn around it. */
  readonly surface: Surface;
  readonly muur: Muur;
};

const UITLEG_EERSTE = [
  'SCHILDEREN. SLEEP DE ROL OVER DE MUUR. ALLES MOET ONDER, IN EEN KEER DOOR: DE NATTE RAND BIJHOUDEN.',
  'DE GETALLEN ZIJN WAAR DE LADDER STAAT. DIE VERZET IK, DUS JE MOET ER IN VOLGORDE LANGS: EERST 1, DAN 2. HET LAATSTE GETAL IS DE VERFBAK. DAAR EINDIG JE.',
  'TWEE KEER OVER HETZELFDE STUK MAG, MAAR DAT ZIE JE TERUG. ER IS PRECIES EEN MANIER OM HET IN EEN KEER GOED TE DOEN.',
];

const UITLEG_LATER = [
  'VOLGENDE WAND. RAMEN OM OMHEEN TE ROLLEN, EN DE LADDER STAAT WEER OVERAL.',
  'IN VOLGORDE LANGS DE GETALLEN, EINDIGEN BIJ DE VERFBAK, EN NERGENS TWEE KEER.',
];

type Plek = readonly [number, number];

/**
 * The wall, where the roller starts, and where the ladder stands.
 *
 * The spots come out of tools/verf-zoek.ts, which keeps adding them until
 * exactly one clean run is left. Do not move one by hand: the test suite
 * counts the answers and will say so.
 */
function muurVan(surface: Surface, start: Plek, punten: readonly Plek[]): Muur {
  // Lintels get painted too; only the openings stay bare.
  const rows = surfaceToRows(surface).map((r) => r.replace(/B/g, '#'));
  const metStart = rows.map((row, y) =>
    y === start[1] ? row.slice(0, start[0]) + 'X' + row.slice(start[0] + 1) : row);
  const muur = parseMuur(metStart);
  return { ...muur, punten: punten.map(([x, y]) => y * muur.width + x) };
}

function surfaceVan(id: string): Surface {
  const surface = SURFACES.find((s) => s.id === id);
  if (!surface) throw new Error(`no surface ${id}`);
  return surface;
}

export const SCHILDER_LEVELS: readonly SchilderLevel[] = [
  {
    id: 'schilderen-tvkamer-kopgevel',
    ruimte: 'TV-KAMER',
    vlak: 'KOPGEVEL',
    praatje: 'LANGS 1, 2, 3... EN EINDIGEN BIJ DE VERFBAK.',
    uitleg: UITLEG_EERSTE,
    surface: surfaceVan('tvkamer-kopgevel'),
    muur: muurVan(surfaceVan('tvkamer-kopgevel'), [7, 1],
      [[7, 0], [7, 2], [4, 5], [3, 6], [2, 5], [7, 5], [4, 0], [1, 5]]),
  },
  {
    id: 'schilderen-woonkamer-tuinwand',
    ruimte: 'WOONKAMER',
    vlak: 'TUINWAND',
    praatje: 'TWEE RAMEN, ZES LADDERPLEKKEN, EEN MANIER.',
    uitleg: UITLEG_LATER,
    surface: surfaceVan('woonkamer-tuinwand'),
    muur: muurVan(surfaceVan('woonkamer-tuinwand'), [9, 1],
      [[8, 5], [7, 4], [0, 2], [6, 3], [11, 1], [7, 6]]),
  },
  {
    id: 'schilderen-tvkamer-tuinwand',
    ruimte: 'TV-KAMER',
    vlak: 'TUINWAND',
    praatje: 'DE LAATSTE WAND. EN DAN IS HET KLAAR.',
    uitleg: UITLEG_LATER,
    surface: surfaceVan('tvkamer-tuinwand'),
    muur: muurVan(surfaceVan('tvkamer-tuinwand'), [5, 5],
      [[6, 5], [7, 0], [0, 2], [5, 1], [5, 2], [6, 1], [1, 3], [0, 4]]),
  },
];
