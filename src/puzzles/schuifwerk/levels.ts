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
 * The rooms are found, not drawn: tools/schuif-zoek.ts fills a room, walks
 * every position it can reach, and keeps the one furthest from having the
 * door clear, then swaps furniture about for as long as that makes it
 * worse. Twelve slides, twenty-one, thirty. The first versions were six,
 * eleven and twelve, and could be done by shoving whatever was in front.
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
      '..GGGB',
      '..E..B',
      'TTE...',
      'A.E.FF',
      'A.DDC.',
      '....C.',
    ], {
      T: 'bank', E: 'boekenkast', G: 'eettafel', A: 'fauteuil',
      B: 'kast', C: 'dozen', D: 'salontafel', F: 'tvmeubel',
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
      'A.....',
      'ABBBG.',
      'TT..GF',
      '.IIEGF',
      '..DECC',
      'HHDE..',
    ], {
      T: 'koelkast', B: 'aanrecht', G: 'kast', E: 'eettafel', A: 'fornuis',
      F: 'dozen', I: 'dozen', C: 'dozen', D: 'kast', H: 'salontafel',
    }),
  },
  {
    id: 'leeghalen-tvkamer',
    nummer: 3,
    ruimte: 'TV-KAMER',
    titel: 'TV-KAMER LEEGHALEN',
    praatje: 'DE VOLSTE KAMER. DERTIG KEER SCHUIVEN.',
    uitleg: UITLEG_LATER,
    plan: parsePlan([
      '..CCCK',
      '..IEEK',
      'TTIF.K',
      'J..FBB',
      'J.HHAA',
      'DDGGG.',
    ], {
      T: 'bank', K: 'boekenkast', C: 'kast', G: 'tvmeubel', I: 'fauteuil',
      J: 'fauteuil', E: 'salontafel', H: 'salontafel', F: 'dozen', B: 'dozen',
      A: 'dozen', D: 'dozen',
    }),
  },
];
