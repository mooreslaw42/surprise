import { parseMuur, type Deken, type Muur } from './model.ts';

/**
 * Isolatieniveaus: a stud cavity and the batts to fill it.
 *
 * '#' is cavity, '.' is a stud or an opening. The stacks are searched for by
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
  'VOLGENDE VLAK. GROTER, EN ER ZIT EEN OPENING IN.',
  'ZELFDE EIS: HELEMAAL VOL. EN DE RC MOET GEHAALD WORDEN, DUS KIJK WAT JE ERIN STOPT.',
];

const deken = (id: string, naam: string, rc: number, vorm: [number, number][]): Deken =>
  ({ id, naam, rc, vorm });

export const ISOLATIE_LEVELS: readonly IsolatieLevel[] = [
  {
    // Best 39.6, and two fills in the whole stack get within reach of it.
    id: 'isolatie-woonkamer',
    ruimte: 'WOONKAMER',
    vlak: 'BUITENMUUR',
    praatje: 'ZES STIJLEN BREED. VOL, EN DE RC HALEN.',
    uitleg: UITLEG_EERSTE,
    muur: parseMuur(
      ['######', '######', '######', '######', '######'],
      [
        deken('D0', 'SNIPPER', 6, [[0,0]]),
        deken('D1', 'HOEKJE', 36, [[0,0],[1,0],[0,1]]),
        deken('D2', 'S-STUK', 64, [[1,0],[2,0],[0,1],[1,1]]),
        deken('D3', 'S-STUK', 64, [[1,0],[2,0],[0,1],[1,1]]),
        deken('D4', 'SNIPPER', 6, [[0,0]]),
        deken('D5', 'STROOK 1x3', 30, [[0,0],[1,0],[2,0]]),
        deken('D6', 'PLAAT 2x3', 66, [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]]),
        deken('D7', 'HOEKJE', 36, [[0,0],[1,0],[0,1]]),
        deken('D8', 'S-STUK', 64, [[1,0],[2,0],[0,1],[1,1]]),
        deken('D9', 'HOEKJE', 36, [[0,0],[1,0],[0,1]]),
        deken('D10', 'STROOK 1x3', 30, [[0,0],[1,0],[2,0]]),
        deken('D11', 'SNIPPER', 6, [[0,0]]),
      ],
      392,
    ),
  },
  {
    // Best 54.8, eleven fills reach the target.
    id: 'isolatie-keuken',
    ruimte: 'KEUKEN',
    vlak: 'BUITENMUUR',
    praatje: 'ER ZIT EEN DOORVOER IN. DAAR OMHEEN.',
    uitleg: UITLEG_LATER,
    muur: parseMuur(
      ['#######', '#######', '###..##', '#######', '#######', '#######'],
      [
        deken('D0', 'PLAAT 2x3', 66, [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]]),
        deken('D1', 'PLAAT 2x2', 44, [[0,0],[1,0],[0,1],[1,1]]),
        deken('D2', 'P-STUK', 72, [[0,0],[1,0],[0,1],[1,1],[2,0]]),
        deken('D3', 'SNIPPER', 6, [[0,0]]),
        deken('D4', 'PLAAT 2x3', 66, [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]]),
        deken('D5', 'P-STUK', 72, [[0,0],[1,0],[0,1],[1,1],[2,0]]),
        deken('D6', 'U-STUK', 78, [[0,0],[2,0],[0,1],[1,1],[2,1]]),
        deken('D7', 'U-STUK', 78, [[0,0],[2,0],[0,1],[1,1],[2,1]]),
        deken('D8', 'T-STUK', 56, [[0,0],[1,0],[2,0],[1,1]]),
        deken('D9', 'PLAAT 2x3', 66, [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]]),
        deken('D10', 'J-STUK', 60, [[0,0],[1,0],[2,0],[2,1]]),
        deken('D11', 'SNIPPER', 6, [[0,0]]),
      ],
      544,
    ),
  },
  {
    // Best 59.8, eight fills reach the target.
    id: 'isolatie-tvkamer',
    ruimte: 'TV-KAMER',
    vlak: 'BUITENMUUR',
    praatje: 'HET RAAM MIDDENIN, EN TE VEEL WOL.',
    uitleg: UITLEG_LATER,
    muur: parseMuur(
      ['########', '########', '###..###', '###..###', '########', '########'],
      [
        deken('D0', 'LANGE L', 80, [[0,0],[1,0],[2,0],[3,0],[0,1]]),
        deken('D1', 'PLAAT 2x2', 44, [[0,0],[1,0],[0,1],[1,1]]),
        deken('D2', 'PLAAT 2x3', 66, [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]]),
        deken('D3', 'PLAAT 2x3', 66, [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]]),
        deken('D4', 'P-STUK', 72, [[0,0],[1,0],[0,1],[1,1],[2,0]]),
        deken('D5', 'Z-STUK', 64, [[0,0],[1,0],[1,1],[2,1]]),
        deken('D6', 'J-STUK', 60, [[0,0],[1,0],[2,0],[2,1]]),
        deken('D7', 'J-STUK', 60, [[0,0],[1,0],[2,0],[2,1]]),
        deken('D8', 'PLAAT 2x3', 66, [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]]),
        deken('D9', 'S-STUK', 64, [[1,0],[2,0],[0,1],[1,1]]),
        deken('D10', 'PLAAT 2x3', 66, [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]]),
        deken('D11', 'PLAAT 2x3', 66, [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]]),
      ],
      594,
    ),
  },
];
