import { parsePlan, type Plan } from './model.ts';

/**
 * Leeghalen: the room as it stands, from above.
 *
 * '.' empty floor   '#' fixed, a schouw or a radiator   'T' the piece that
 * has to get out; any other letter is furniture, and touching letters of a
 * kind are one item. The map beside each plan says what each letter is, so
 * the room reads as a room: the koelkast is a koelkast and the stapel dozen
 * is a stapel dozen, rather than six identical rectangles.
 *
 * One room each, and nothing else can start until all three are empty.
 *
 * The rooms are the real rooms, in proportion: the woonkamer 5 by 4,5 m, the
 * keuken 5,5 by 3 m, the tv-kamer 3 by 4,5 m, each turned so its way out is
 * the right-hand wall. A square is half a metre in the keuken and tv-kamer
 * and a little over that in the woonkamer, which at half a metre is too big
 * a board for the search to finish.
 *
 * The furniture is found, not drawn: tools/schuif-zoek.ts fills a room, walks
 * every position it can reach, and keeps the one furthest from having the
 * door clear, then swaps furniture about for as long as that makes it
 * worse. Fifteen slides, twenty-one, twenty-eight.
 */

export type SchuifLevel = {
  readonly id: string;
  readonly nummer: number;
  readonly ruimte: string;
  readonly titel: string;
  readonly praatje: string;
  readonly uitleg: readonly string[];
  readonly plan: Plan;
};

const UITLEG_EERSTE = [
  'EERST DE KAMER LEEG. DIT IS DE KAMER VAN BOVEN, MET ALLES ER NOG IN.',
  'SCHUIF DE BANK NAAR DE DEUR RECHTS. DAT IS DEGENE MET DE GELE RAND. SLEPEN MAAR.',
  'ALLES SCHUIFT ALLEEN IN ZIJN EIGEN RICHTING: EEN KAST DIE DWARS STAAT GAAT NIET OPZIJ. DE REST STAAT IN DE WEG. DIE MOET DUS EERST.',
];

const UITLEG_LATER = [
  'VOLGENDE KAMER. EEN STUK VOLLER DAN DE VORIGE.',
  'ZELFDE IDEE: HET DING MET DE GELE RAND NAAR DE DEUR, DE REST OPZIJ. HOE MINDER ZETTEN, HOE BETER.',
];

export const SCHUIF_LEVELS: readonly SchuifLevel[] = [
  {
    id: 'leeghalen-woonkamer',
    nummer: 1,
    ruimte: 'WOONKAMER',
    titel: 'WOONKAMER LEEGHALEN',
    praatje: 'DE BANK NAAR DE DEUR. DE REST STAAT IN DE WEG.',
    uitleg: UITLEG_EERSTE,
    plan: parsePlan([
      '.KBBBE..',
      '.KDD.EHH',
      '...G.E.I',
      'LTTG...I',
      'LAFCCCJJ',
      'LAF.....',
      '.AFMMM..',
    ], {
      T: 'bank', B: 'boekenkast', E: 'boekenkast', L: 'kast', A: 'kast', C: 'eettafel',
      M: 'tvmeubel', K: 'fauteuil', G: 'fauteuil', D: 'salontafel', J: 'salontafel',
      F: 'dozen', H: 'dozen', I: 'dozen',
    }),
  },
  {
    id: 'leeghalen-keuken',
    nummer: 2,
    ruimte: 'KEUKEN',
    titel: 'KEUKEN LEEGHALEN',
    praatje: 'DE KOELKAST ERUIT. HET AANRECHT STAAT DWARS.',
    uitleg: UITLEG_LATER,
    plan: parsePlan([
      '..FHHHI....',
      '..F.GDI....',
      '.TT.GDA....',
      '....CBA....',
      '..E.CBA....',
      '..E.CBKKJJJ',
    ], {
      T: 'koelkast', H: 'aanrecht', J: 'aanrecht', A: 'kast', C: 'kast', B: 'eettafel',
      I: 'fornuis', E: 'salontafel', F: 'dozen', G: 'dozen', D: 'dozen', K: 'dozen',
    }),
  },
  {
    id: 'leeghalen-tvkamer',
    nummer: 3,
    ruimte: 'TV-KAMER',
    titel: 'TV-KAMER LEEGHALEN',
    praatje: 'DE VOLSTE KAMER. BIJNA DERTIG KEER SCHUIVEN.',
    uitleg: UITLEG_LATER,
    plan: parsePlan([
      '....F.',
      '.CAAF.',
      '.C..F.',
      '.CDDD.',
      '.TTE..',
      '.IIEH.',
      '.JJEH.',
      '...BGG',
      '...B..',
    ], {
      T: 'bank', F: 'boekenkast', C: 'kast', E: 'kast', D: 'tvmeubel', A: 'salontafel',
      I: 'fauteuil', J: 'fauteuil', H: 'dozen', B: 'dozen', G: 'dozen',
    }),
  },
];
