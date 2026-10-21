import { parsePlan, type Plan } from './model.ts';

/**
 * Ventilatieplannen: the prefab duct, lying in the roof space.
 *
 * '.' empty   '#' fixed, a beam or the unit   'T' the hoofdkanaal
 * any other letter is a duct section; touching letters of a kind are one run.
 *
 * One of these comes up between phases, a little harder each time. None of
 * them is ever installed.
 */

export type VentilatieLevel = {
  readonly id: string;
  readonly nummer: number;
  readonly titel: string;
  readonly praatje: string;
  readonly levering: string;
  readonly uitleg: readonly string[];
  readonly plan: Plan;
};

const UITLEG_EERSTE = [
  'EVEN IETS ANDERS: HET VENTILATIEKANAAL. DAT KOMT IN VASTE LENGTES, EN DIE LIGGEN AL BOVEN.',
  'SCHUIF HET GELE HOOFDKANAAL NAAR DE AANSLUITING RECHTS. SLEPEN MAAR.',
  'EEN STUK SCHUIFT ALLEEN IN ZIJN EIGEN RICHTING. DE REST ZIT IN DE WEG. DIE MOET DUS EERST.',
];

const UITLEG_LATER = [
  'HET VENTILATIEKANAAL, WEER. IETS MEER STUKKEN DAN DE VORIGE KEER.',
  'ZELFDE IDEE: HET GELE STUK NAAR RECHTS, DE REST OPZIJ. HOE MINDER ZETTEN, HOE BETER.',
];

export const VENTILATIE_LEVELS: readonly VentilatieLevel[] = [
  {
    id: 'ventilatie-1',
    nummer: 1,
    titel: 'VENTILATIEPLAN 1',
    praatje: 'HET GELE STUK NAAR RECHTS. DE REST LIGT IN DE WEG.',
    levering: 'LEVERING VERWACHT: WEEK 14',
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
    id: 'ventilatie-2',
    nummer: 2,
    titel: 'VENTILATIEPLAN 2',
    praatje: 'MEER STUKKEN, EN DE SCHOORSTEEN ZIT ER NOG.',
    levering: 'LEVERING VERWACHT: WEEK 23',
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
    id: 'ventilatie-3',
    nummer: 3,
    titel: 'VENTILATIEPLAN 3',
    praatje: 'EN DIT IS DE DEFINITIEVE VERSIE. ECHT.',
    levering: 'LEVERING VERWACHT: NADER TE BEPALEN',
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
