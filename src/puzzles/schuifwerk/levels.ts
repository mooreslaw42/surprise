import { parsePlan, type Plan } from './model.ts';

/**
 * Leeghalen: the room as it stands, from above.
 *
 * '.' empty floor   '#' fixed, a schouw or a radiator   'T' the piece that
 * has to get out; any other letter is furniture, and touching letters of a
 * kind are one item.
 *
 * One room each, and nothing else can start until all three are empty.
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
  'SCHUIF DE GELE BANK NAAR DE DEUR RECHTS. SLEPEN MAAR.',
  'EEN KAST SCHUIFT ALLEEN IN ZIJN EIGEN RICHTING. DE REST STAAT IN DE WEG. DIE MOET DUS EERST.',
];

const UITLEG_LATER = [
  'VOLGENDE KAMER. IETS VOLLER DAN DE VORIGE.',
  'ZELFDE IDEE: HET GELE DING NAAR DE DEUR, DE REST OPZIJ. HOE MINDER ZETTEN, HOE BETER.',
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
      '....B.',
      'C...B.',
      'CTT.D.',
      '..E.D.',
      '..EAA.',
      '......',
    ]),
  },
  {
    id: 'leeghalen-keuken',
    nummer: 2,
    ruimte: 'KEUKEN',
    titel: 'KEUKEN LEEGHALEN',
    praatje: 'MEER SPUL, EN DE SCHOUW ZIT ER NOG.',
    uitleg: UITLEG_LATER,
    plan: parsePlan([
      '..D.#.',
      '..D...',
      'TTB...',
      'C.B.A.',
      'C.EEA.',
      '......',
    ]),
  },
  {
    id: 'leeghalen-tvkamer',
    nummer: 3,
    ruimte: 'TV-KAMER',
    titel: 'TV-KAMER LEEGHALEN',
    praatje: 'DE VOLSTE KAMER. VEEL PLEZIER.',
    uitleg: UITLEG_LATER,
    plan: parsePlan([
      '..C...',
      '..C.E.',
      'TTA.E.',
      'B.A.F.',
      'B.DDF.',
      '......',
    ]),
  },
];
