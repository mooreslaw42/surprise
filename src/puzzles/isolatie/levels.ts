import { parseMuur, type Deken, type Muur } from './model.ts';

/**
 * Isolatieniveaus: a stud cavity and the batts to fill it.
 *
 * '#' is cavity, '.' is a stud or an opening. The stacks are generated — the
 * cavity is tiled at random and then a few spares are thrown on top — so each
 * one is known to fit, and the best Rc it can reach is known too.
 *
 * The spares are the point. There is more wool here than the wall needs, and
 * the awkward shapes carry the most Rc, so which batts get the space is the
 * decision.
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
  'R DRAAIT DE DEKEN DIE JE VASTHEBT. ER LIGT MEER WOL DAN JE NODIG HEBT.',
];

const UITLEG_LATER = [
  'VOLGENDE VLAK. GROTER, EN ER ZIT EEN OPENING IN.',
  'ZELFDE EIS: HELEMAAL VOL. EN DE RC MOET GEHAALD WORDEN, DUS KIJK WAT JE ERIN STOPT.',
];

const deken = (id: string, naam: string, rc: number, vorm: [number, number][]): Deken =>
  ({ id, naam, rc, vorm });

export const ISOLATIE_LEVELS: readonly IsolatieLevel[] = [
  {
    id: 'isolatie-woonkamer',
    ruimte: 'WOONKAMER',
    vlak: 'BUITENMUUR',
    praatje: 'VIER STIJLEN BREED. ALLES VOL.',
    uitleg: UITLEG_EERSTE,
    muur: parseMuur(
      ['####', '####', '####', '####', '####'],
      [
        deken('D0', 'PLAAT 2x3', 66, [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]]),
        deken('D1', 'PLAAT 2x3', 66, [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]]),
        deken('D2', 'PLAAT 2x3', 66, [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]]),
        deken('D3', 'STROOK 1x2', 20, [[0, 0], [0, 1]]),
        deken('X0', 'STROOK 1x2', 20, [[0, 0], [0, 1]]),
        deken('X1', 'STROOK 1x2', 20, [[0, 0], [0, 1]]),
      ],
      200,
    ),
  },
  {
    id: 'isolatie-keuken',
    ruimte: 'KEUKEN',
    vlak: 'BUITENMUUR',
    praatje: 'ER ZIT EEN DOORVOER IN. DAAR OMHEEN.',
    uitleg: UITLEG_LATER,
    muur: parseMuur(
      ['#####', '#####', '##..#', '#####', '#####', '#####'],
      [
        deken('D0', 'PLAAT 2x3', 66, [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]]),
        deken('D1', 'PLAAT 2x3', 66, [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]]),
        deken('D2', 'Z-STUK', 64, [[0, 0], [1, 0], [1, 1], [2, 1]]),
        deken('D3', 'PLAAT 2x3', 66, [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]]),
        deken('D4', 'L-STUK', 60, [[0, 0], [0, 1], [0, 2], [1, 2]]),
        deken('D5', 'STROOK 1x2', 20, [[0, 0], [0, 1]]),
        deken('X0', 'STROOK 1x2', 20, [[0, 0], [0, 1]]),
        deken('X1', 'STROOK 1x2', 20, [[0, 0], [0, 1]]),
        deken('X2', 'STROOK 1x2', 20, [[0, 0], [0, 1]]),
      ],
      320,
    ),
  },
  {
    id: 'isolatie-tvkamer',
    ruimte: 'TV-KAMER',
    vlak: 'BUITENMUUR',
    praatje: 'HET RAAM ZIT ER MIDDENIN. VEEL SNIPPERS.',
    uitleg: UITLEG_LATER,
    muur: parseMuur(
      ['######', '######', '##..##', '##..##', '######', '######'],
      [
        deken('D0', 'PLAAT 2x3', 66, [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]]),
        deken('D1', 'PLAAT 2x3', 66, [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]]),
        deken('D2', 'STROOK 1x3', 30, [[0, 0], [0, 1], [0, 2]]),
        deken('D3', 'L-STUK', 60, [[0, 0], [0, 1], [0, 2], [1, 2]]),
        deken('D4', 'PLAAT 2x3', 66, [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]]),
        deken('D5', 'SNIPPER', 6, [[0, 0]]),
        deken('D6', 'Z-STUK', 64, [[0, 0], [1, 0], [1, 1], [2, 1]]),
        deken('D7', 'SNIPPER', 6, [[0, 0]]),
        deken('D8', 'SNIPPER', 6, [[0, 0]]),
        deken('X0', 'STROOK 1x2', 20, [[0, 0], [0, 1]]),
        deken('X1', 'STROOK 1x2', 20, [[0, 0], [0, 1]]),
        deken('X2', 'STROOK 1x2', 20, [[0, 0], [0, 1]]),
      ],
      360,
    ),
  },
];
