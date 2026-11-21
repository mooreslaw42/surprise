import { SURFACES, type Surface } from '../../data/house.ts';
import { surfaceToRows } from '../sloop/generate.ts';
import { parseMuur, type Deken, type Muur } from './model.ts';

/**
 * Isolatieniveaus: an outside wall of the house, opened up, and the batts to
 * fill it.
 *
 * The cavity is the real wall: the oker wall of the woonkamer with its arch
 * and its steel window, the cross-window gable of the tv-kamer, the keuken's
 * garden wall with the window, the pier and the back door. Openings stay
 * open; over a lintel there is wall, so it gets wool. A cell is 45 cm, or
 * 50 in the keuken, whose wall at 45 is more cavity than twelve batts cover. The stacks are searched for by
 * tools/wol-zoek.ts: the cavity is tiled at random out of a book of shapes,
 * spares are thrown on top, and the stack is kept when very few different
 * fills reach the target Rc. The numbers beside each level say how few.
 *
 * The spares are the point. There is more wool here than the wall needs, the
 * awkward shapes carry the most Rc, and the target sits four tenths under
 * the best the stack can do — so filling the wall is not enough. It has to
 * be nearly the best fill there is, and the batt that looks most useful is
 * usually the one that has to stay on the pile.
 */

export type IsolatieLevel = {
  readonly id: string;
  readonly ruimte: string;
  readonly vlak: string;
  /** Which wall this is, so the room can be drawn around it. */
  readonly surface: Surface;
  /** Metres a cell, which the windows are placed by. */
  readonly cel: number;
  readonly praatje: string;
  readonly uitleg: readonly string[];
  readonly muur: Muur;
};

const UITLEG_EERSTE = [
  'ISOLATIE. DIT IS DE RUIMTE TUSSEN DE STIJLEN, VAN OPZIJ GEZIEN.',
  'SLEEP DE DEKENS ERIN TOT ALLES VOL ZIT. GEEN GAT, GEEN OVERLAP: ELK GAT IS EEN KOUDEBRUG.',
  'R DRAAIT DE DEKEN DIE JE VASTHEBT. ER LIGT MEER WOL DAN JE NODIG HEBT, EN DE RARE VORMEN ISOLEREN HET BEST.',
  'VOL IS NIET GENOEG: DE RC MOET GEHAALD WORDEN. DUS WELKE DEKENS BLIJVEN LIGGEN?',
];

const UITLEG_LATER = [
  'VOLGENDE MUUR. GROTER, EN MET MEER RAMEN.',
  'ZELFDE EIS: HELEMAAL VOL. EN DE RC MOET GEHAALD WORDEN, DUS KIJK WAT JE ERIN STOPT.',
];

const deken = (id: string, naam: string, rc: number, vorm: [number, number][]): Deken =>
  ({ id, naam, rc, vorm });

function surfaceVan(id: string): Surface {
  const surface = SURFACES.find((s) => s.id === id);
  if (!surface) throw new Error(`no surface ${id}`);
  return surface;
}

/** The wall as a cavity: openings stay open, lintels are covered over. */
function holte(surface: Surface, cel: number): string[] {
  return surfaceToRows(surface, cel).map((r) => r.replace(/B/g, '#'));
}

const TV = surfaceVan('tvkamer-kopgevel');
const WOON = surfaceVan('woonkamer-okerwand');
const KEUKEN = surfaceVan('keuken-achterwand');

export const ISOLATIE_LEVELS: readonly IsolatieLevel[] = [
  {
    // Best 47.0, and one fill in the whole stack reaches the target.
    id: 'isolatie-tvkamer',
    ruimte: 'TV-KAMER',
    vlak: 'KOPGEVEL',
    praatje: 'OM HET RAAM HEEN. VOL, EN DE RC HALEN.',
    uitleg: UITLEG_EERSTE,
    surface: TV,
    cel: 0.45,
    muur: parseMuur(
      holte(TV, 0.45),
      [
        deken('D0', 'L-STUK', 60, [[0,0],[1,0],[2,0],[0,1]]),
        deken('D1', 'PLAAT 2x3', 66, [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]]),
        deken('D2', 'S-STUK', 64, [[1,0],[2,0],[0,1],[1,1]]),
        deken('D3', 'STROOK 1x3', 30, [[0,0],[1,0],[2,0]]),
        deken('D4', 'LANGE L', 80, [[0,0],[1,0],[2,0],[3,0],[0,1]]),
        deken('D5', 'Z-STUK', 64, [[0,0],[1,0],[1,1],[2,1]]),
        deken('D6', 'PLAAT 2x2', 44, [[0,0],[1,0],[0,1],[1,1]]),
        deken('D7', 'LANGE L', 80, [[0,0],[1,0],[2,0],[3,0],[0,1]]),
        deken('D8', 'HOEKJE', 36, [[0,0],[1,0],[0,1]]),
        deken('D9', 'STROOK 1x2', 20, [[0,0],[1,0]]),
        deken('D10', 'SNIPPER', 6, [[0,0]]),
        deken('D11', 'STROOK 1x3', 30, [[0,0],[1,0],[2,0]]),
      ],
      466,
    ),
  },
  {
    // Best 46.4, two fills reach the target.
    id: 'isolatie-woonkamer',
    ruimte: 'WOONKAMER',
    vlak: 'OKERWAND',
    praatje: 'DE BOOG EN HET STALEN RAAM. DAAR OMHEEN.',
    uitleg: UITLEG_LATER,
    surface: WOON,
    cel: 0.45,
    muur: parseMuur(
      holte(WOON, 0.45),
      [
        deken('D0', 'U-STUK', 78, [[0,0],[2,0],[0,1],[1,1],[2,1]]),
        deken('D1', 'STROOK 1x3', 30, [[0,0],[1,0],[2,0]]),
        deken('D2', 'LANGE L', 80, [[0,0],[1,0],[2,0],[3,0],[0,1]]),
        deken('D3', 'L-STUK', 60, [[0,0],[1,0],[2,0],[0,1]]),
        deken('D4', 'STROOK 1x3', 30, [[0,0],[1,0],[2,0]]),
        deken('D5', 'STROOK 1x3', 30, [[0,0],[1,0],[2,0]]),
        deken('D6', 'P-STUK', 72, [[0,0],[1,0],[0,1],[1,1],[2,0]]),
        deken('D7', 'STROOK 1x3', 30, [[0,0],[1,0],[2,0]]),
        deken('D8', 'Z-STUK', 64, [[0,0],[1,0],[1,1],[2,1]]),
        deken('D9', 'PLAAT 2x2', 44, [[0,0],[1,0],[0,1],[1,1]]),
        deken('D10', 'LANGE L', 80, [[0,0],[1,0],[2,0],[3,0],[0,1]]),
        deken('D11', 'L-STUK', 60, [[0,0],[1,0],[2,0],[0,1]]),
      ],
      460,
    ),
  },
  {
    // Best 51.0, one fill reaches the target.
    id: 'isolatie-keuken',
    ruimte: 'KEUKEN',
    vlak: 'ACHTERWAND',
    praatje: 'RAAM, PENANT, ACHTERDEUR. EN TE VEEL WOL.',
    uitleg: UITLEG_LATER,
    surface: KEUKEN,
    cel: 0.5,
    muur: parseMuur(
      holte(KEUKEN, 0.5),
      [
        deken('D0', 'PLAAT 2x2', 44, [[0,0],[1,0],[0,1],[1,1]]),
        deken('D1', 'T-STUK', 56, [[0,0],[1,0],[2,0],[1,1]]),
        deken('D2', 'L-STUK', 60, [[0,0],[1,0],[2,0],[0,1]]),
        deken('D3', 'PLAAT 2x3', 66, [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]]),
        deken('D4', 'PLAAT 2x3', 66, [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]]),
        deken('D5', 'T-STUK', 56, [[0,0],[1,0],[2,0],[1,1]]),
        deken('D6', 'STROOK 1x3', 30, [[0,0],[1,0],[2,0]]),
        deken('D7', 'L-STUK', 60, [[0,0],[1,0],[2,0],[0,1]]),
        deken('D8', 'PLAAT 2x3', 66, [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]]),
        deken('D9', 'STROOK 1x3', 30, [[0,0],[1,0],[2,0]]),
        deken('D10', 'U-STUK', 78, [[0,0],[2,0],[0,1],[1,1],[2,1]]),
        deken('D11', 'S-STUK', 64, [[1,0],[2,0],[0,1],[1,1]]),
      ],
      506,
    ),
  },
];
