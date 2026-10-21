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
  'SCHILDEREN. DE ROL BEGINT IN DE HOEK EN JE SLEEPT HEM OVER DE MUUR.',
  'ALLES MOET ONDER, IN EEN KEER DOOR. DAT HEET DE NATTE RAND BIJHOUDEN.',
  'TWEE KEER OVER HETZELFDE STUK MAG WEL, MAAR DAT ZIE JE TERUG. DUS LIEVER NIET.',
];

const UITLEG_LATER = [
  'VOLGENDE WAND. TWEE RAMEN OM HEEN.',
  'ZELFDE IDEE: ALLES ONDER, EN ZO MIN MOGELIJK OVER JE EIGEN VERF.',
];

function muurVan(surface: Surface, startX: number, startY: number): Muur {
  // Lintels get painted too; only the openings stay bare.
  const rows = surfaceToRows(surface).map((r) => r.replace(/B/g, '#'));
  const metStart = rows.map((row, y) =>
    y === startY ? row.slice(0, startX) + 'X' + row.slice(startX + 1) : row);
  return parseMuur(metStart);
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
    praatje: 'BEGIN IN DE HOEK. ALLES ONDER, IN EEN KEER.',
    uitleg: UITLEG_EERSTE,
    surface: surfaceVan('tvkamer-kopgevel'),
    muur: muurVan(surfaceVan('tvkamer-kopgevel'), 0, 0),
  },
  {
    id: 'schilderen-woonkamer-tuinwand',
    ruimte: 'WOONKAMER',
    vlak: 'TUINWAND',
    praatje: 'TWEE RAMEN. DAAR MOET JE OMHEEN.',
    uitleg: UITLEG_LATER,
    surface: surfaceVan('woonkamer-tuinwand'),
    muur: muurVan(surfaceVan('woonkamer-tuinwand'), 0, 0),
  },
  {
    id: 'schilderen-tvkamer-tuinwand',
    ruimte: 'TV-KAMER',
    vlak: 'TUINWAND',
    praatje: 'DE LAATSTE WAND. EN DAN IS HET KLAAR.',
    uitleg: UITLEG_LATER,
    surface: surfaceVan('tvkamer-tuinwand'),
    muur: muurVan(surfaceVan('tvkamer-tuinwand'), 0, 0),
  },
];
