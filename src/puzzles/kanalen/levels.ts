import type { Bord } from './model.ts';

/**
 * Kanaalplannen: the ventilation drawing, with the pieces turned wrong.
 *
 * Generated rather than drawn — a spanning tree of duct over the grid, then
 * a set number of pieces turned off true — so every board is solvable by
 * construction and its par is known. Baked in here so a plan never changes
 * under someone mid-game.
 */

export type KanaalLevel = {
  readonly id: string;
  readonly nummer: number;
  readonly titel: string;
  readonly praatje: string;
  readonly levering: string;
  readonly baas: boolean;
  readonly uitleg: readonly string[];
  readonly bord: Bord;
};

const UITLEG_EERSTE = [
  'HET VENTILATIEPLAN. ALLE KANALEN STAAN VERKEERD OM.',
  'KLIK OP EEN STUK EN HET DRAAIT EEN KWARTSLAG. RECHTERMUIS DRAAIT DE ANDERE KANT OP.',
  'HET KLOPT ALS ELKE OPENING OP EEN OPENING UITKOMT, NIETS BLIND ZIT, EN ALLES AAN DE WTW HANGT.',
];

const UITLEG_LATER = [
  'HET PLAN, WEER. GROTER, EN MEER STUKKEN STAAN VERKEERD.',
  'KLIKKEN OM TE DRAAIEN. ALLES MOET AAN ELKAAR, EN ALLES MOET AAN DE WTW.',
];

const UITLEG_BAAS = [
  'DIT IS HEM DAN. HET HELE VENTILATIESYSTEEM, IN EEN KEER, ZOALS HET ALTIJD BEDOELD WAS.',
  'ELKE KOKER, ELK ROOSTER, ELKE BOCHT. ALLES MOET KLOPPEN EN ALLES MOET AAN DE WTW HANGEN.',
  'NEEM DE TIJD. HIJ HEEFT TWEE JAAR GEWACHT.',
];

export const KANAAL_LEVELS: readonly KanaalLevel[] = [
  {
    id: 'kanalen-1',
    nummer: 1,
    titel: 'KANAALPLAN 1',
    praatje: 'DRAAI DE STUKKEN TOT HET KLOPT.',
    levering: 'LEVERING VERWACHT: WEEK 14',
    baas: false,
    uitleg: UITLEG_EERSTE,
    bord: {
      width: 5,
      height: 4,
      masks: [4, 12, 6, 5, 4, 2, 11, 15, 8, 4, 2, 11, 15, 5, 13, 2, 9, 3, 2, 1],
      wtw: 8,
      roosters: [0, 4, 5, 9, 10, 15, 18, 19],
    },
  },
  {
    id: 'kanalen-2',
    nummer: 2,
    titel: 'KANAALPLAN 2',
    praatje: 'MEER KOKERS. ZELFDE IDEE.',
    levering: 'LEVERING VERWACHT: WEEK 23',
    baas: false,
    uitleg: UITLEG_LATER,
    bord: {
      width: 6,
      height: 5,
      masks: [12, 5, 12, 8, 14, 8, 1, 2, 15, 11, 15, 6, 2, 5, 13, 5, 5, 5,
        1, 8, 13, 8, 5, 10, 3, 5, 12, 2, 9, 1],
      wtw: 27,
      roosters: [3, 5, 6, 7, 12, 18, 19, 21, 29],
    },
  },
  {
    id: 'kanalen-baas',
    nummer: 3,
    titel: 'HET HELE SYSTEEM',
    praatje: 'ALLES IN EEN KEER. HIJ WACHT AL TWEE JAAR.',
    levering: 'GELEVERD',
    baas: true,
    uitleg: UITLEG_BAAS,
    bord: {
      width: 8,
      height: 6,
      masks: [9, 11, 5, 7, 5, 5, 11, 3, 2, 11, 1, 5, 4, 1, 9, 8,
        2, 15, 8, 9, 11, 13, 10, 8, 2, 15, 11, 4, 12, 13, 6, 8,
        2, 13, 8, 1, 1, 3, 15, 1, 4, 11, 5, 13, 4, 2, 13, 8],
      wtw: 34,
      roosters: [8, 10, 12, 13, 15, 16, 18, 23, 24, 27, 31, 32, 35, 36, 39, 40, 44, 45, 47],
    },
  },
];
