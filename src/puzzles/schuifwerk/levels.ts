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
 * The rooms are the real rooms, drawn the same way up as Pim's floor plans
 * and the Vloeren levels, with the way out in the right-hand wall. What is
 * fixed in the room is fixed here ('#'): the tree-trunk post in the
 * woonkamer, a third in and a third up; the kitchen units along the whole
 * left wall of the keuken and the pier in its garden wall; the two boxed-out
 * corners of the tv-kamer. A square is half a metre, except in the
 * woonkamer, where at half a metre the board is too big for the search to
 * finish and a square is nearer two thirds.
 *
 * The furniture is found, not drawn: tools/schuif-zoek.ts fills a room
 * around the fixed cells, walks every position it can reach, and keeps the
 * one furthest from having the door clear, then swaps furniture about for as
 * long as that makes it worse. Twenty-two slides, twenty-two, thirty-two.
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
      'I..K...',
      'IFFKAAA',
      'LL.JJC.',
      '..TT.C.',
      '.BBB.G.',
      '..#DDG.',
      '...E...',
      '...EHHH',
    ], {
      T: 'bank', A: 'boekenkast', B: 'eettafel', H: 'tvmeubel', I: 'fauteuil', K: 'fauteuil',
      F: 'salontafel', C: 'kast', G: 'kast', L: 'dozen', J: 'dozen', D: 'dozen', E: 'dozen',
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
      '#.....',
      '#.....',
      '#HHH..',
      '#FFG..',
      '#A.G.#',
      '#ACC.#',
      '#A.DEE',
      '#TTD.B',
      '#I...B',
      '#I.JJB',
      '#.....',
    ], {
      T: 'koelkast', H: 'aanrecht', A: 'kast', B: 'kast', C: 'eettafel', D: 'fornuis',
      I: 'salontafel', F: 'dozen', G: 'dozen', E: 'dozen', J: 'dozen',
    }),
  },
  {
    id: 'leeghalen-tvkamer',
    nummer: 3,
    ruimte: 'TV-KAMER',
    titel: 'TV-KAMER LEEGHALEN',
    praatje: 'DE VOLSTE KAMER. RUIM DERTIG KEER SCHUIVEN.',
    uitleg: UITLEG_LATER,
    plan: parsePlan([
      '#.H......',
      '..H.DGGA.',
      'TTI.DC.A.',
      '..IFFC.A.',
      '.BBBE....',
      '....EJJJ#',
    ], {
      T: 'bank', A: 'boekenkast', B: 'tvmeubel', C: 'kast', J: 'kast', G: 'salontafel',
      H: 'fauteuil', D: 'fauteuil', I: 'dozen', F: 'dozen', E: 'dozen',
    }),
  },
];
