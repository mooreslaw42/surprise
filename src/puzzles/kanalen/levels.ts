import type { Bord } from './model.ts';
import { PLATTEGROND } from '../../data/plattegrond.ts';

/**
 * Kanaalplannen: the ventilation drawing, with the pieces turned wrong.
 *
 * Generated rather than drawn — a spanning tree of duct over the rooms, then
 * a set number of pieces turned off true — so every board is solvable by
 * construction and its par is known. Baked in here so a plan never changes
 * under someone mid-game.
 *
 * Every board is the whole footprint, with duct only in the rooms that plan
 * covers; the rest of the house is drawn around it. The shape is the real one
 * from the scan, which is what makes it awkward: an L with a corner missing
 * leaves far less room to route than a rectangle would.
 */
const { width, height } = PLATTEGROND;

export type KanaalLevel = {
  readonly id: string;
  readonly nummer: number;
  readonly titel: string;
  readonly praatje: string;
  readonly levering: string;
  readonly baas: boolean;
  /** Which rooms this plan covers, for the header. */
  readonly dekking: string;
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

const UITLEG_GROOT = [
  'TWEE KAMERS IN EEN PLAN. DE KOKERS MOETEN STRAKS ONDER DE VLOER DOOR, DUS NU MOET HET KLOPPEN.',
  'ZELFDE REGELS, DRIE KEER ZOVEEL STUKKEN. ELKE OPENING OP EEN OPENING, ALLES AAN DE WTW.',
  'EN NEE, HIJ IS ER NOG STEEDS NIET.',
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
    praatje: 'ALLEEN DE KEUKEN. DRAAI DE STUKKEN TOT HET KLOPT.',
    levering: 'LEVERING VERWACHT: WEEK 14',
    baas: false,
    dekking: 'KEUKEN',
    uitleg: UITLEG_EERSTE,
    bord: {
      width, height,
      masks: [0, 0, 0, 0, 0, 1, 7, 5, 5, 6, 0, 0, 0, 0, 0, 8, 10, 1, 5, 13,
        0, 0, 0, 0, 0, 3, 12, 4, 5, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      wtw: 5,
      roosters: [15, 17, 27],
    },
  },
  {
    id: 'kanalen-2',
    nummer: 2,
    titel: 'KANAALPLAN 2',
    praatje: 'NU DE WOONKAMER ERBIJ. ZELFDE IDEE, MEER STUKKEN.',
    levering: 'LEVERING VERWACHT: WEEK 23',
    baas: false,
    dekking: 'WOONKAMER',
    uitleg: UITLEG_LATER,
    bord: {
      width, height,
      masks: [9, 6, 8, 3, 1, 0, 0, 0, 0, 0, 4, 10, 11, 6, 1, 0, 0, 0, 0, 0,
        1, 11, 15, 7, 14, 0, 0, 0, 0, 0, 1, 5, 12, 8, 8, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      wtw: 2,
      roosters: [4, 10, 14, 20, 30, 33, 34],
    },
  },
  {
    id: 'kanalen-3',
    nummer: 3,
    titel: 'KANAALPLAN 3',
    praatje: 'DE HELE BOVENKANT VAN HET HUIS IN EEN PLAN.',
    levering: 'LEVERING VERWACHT: WEEK 31',
    baas: false,
    dekking: 'WOONKAMER + KEUKEN',
    uitleg: UITLEG_GROOT,
    bord: {
      width, height,
      masks: [12, 4, 2, 8, 3, 11, 5, 6, 2, 8, 13, 13, 14, 7, 6, 14, 3, 11, 13, 11,
        2, 10, 4, 5, 7, 9, 2, 9, 4, 8, 1, 13, 4, 1, 12, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      wtw: 5,
      roosters: [1, 2, 3, 8, 9, 20, 22, 26, 28, 29, 30, 32, 33],
    },
  },
  {
    id: 'kanalen-baas',
    nummer: 4,
    titel: 'HET HELE SYSTEEM',
    praatje: 'ALLES IN EEN KEER. HIJ WACHT AL TWEE JAAR.',
    levering: 'GELEVERD',
    baas: true,
    dekking: 'HET HELE HUIS',
    uitleg: UITLEG_BAAS,
    bord: {
      width, height,
      masks: [4, 9, 1, 5, 3, 12, 5, 5, 1, 8, 8, 11, 9, 1, 11, 13, 3, 2, 3, 3,
        4, 14, 11, 9, 2, 13, 14, 1, 10, 4, 1, 6, 4, 11, 5, 11, 10, 1, 7, 3,
        0, 0, 0, 0, 0, 7, 15, 15, 15, 12, 0, 0, 0, 0, 0, 1, 2, 2, 1, 1],
      wtw: 0,
      roosters: [2, 8, 9, 10, 13, 17, 20, 24, 27, 29, 30, 32, 37, 55, 56, 57, 58, 59],
    },
  },
];
