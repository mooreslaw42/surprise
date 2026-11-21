import type { Bord } from './model.ts';
import { PLATTEGROND } from '../../data/plattegrond.ts';

/**
 * Kanaalplannen: the ventilation drawing, with the pieces turned wrong.
 *
 * Generated rather than drawn, by tools/kanaal-zoek.ts: duct grown over the
 * rooms as trees, every piece then turned at random, and the board kept only
 * if exactly one arrangement makes it right. So each is solvable, its par is
 * known, and nowhere on it does the player have to guess. Baked in here so a
 * plan never changes under someone mid-game.
 *
 * The first is one system, to learn the turning on. From the second on there
 * are two — toevoer and afvoer, which may not meet — and kruisingen where
 * one is carried over the other. That is what stopped this being a patience.
 *
 * Every board is the whole footprint, with duct only in the rooms that plan
 * covers; the rest of the house is drawn around it. The shape is Pim's floor
 * plan on its side, which is what makes it awkward: the keuken is a narrow
 * neck between two wider rooms, and everything for the far end goes through
 * it.
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
  'HET KLOPT ALS ELKE OPENING OP EEN OPENING UITKOMT, NIETS BLIND ZIT, EN ALLES AAN DE WTW HANGT. ER IS MAAR EEN MANIER, DUS EERST KIJKEN, DAN DRAAIEN.',
];

const UITLEG_TWEE = [
  'HET PLAN, WEER. MAAR EEN WTW IS TWEE SYSTEMEN: TOEVOER BLAAST VERSE LUCHT IN, AFVOER ZUIGT DE OUDE WEG.',
  'GROEN IS TOEVOER, ROOD IS AFVOER. ELK ROOSTER MOET AAN ZIJN EIGEN KLEUR HANGEN, EN DE TWEE MOGEN ELKAAR NERGENS RAKEN.',
  'WAAR ZE ELKAAR KRUISEN LIGT EEN KRUISING: DE EEN GAAT OVER DE ANDER HEEN. DIE ZIT VAST EN DRAAIT NIET.',
];

const UITLEG_GROOT = [
  'TWEE KAMERS IN EEN PLAN, TWEE SYSTEMEN, DRIE KRUISINGEN.',
  'BEGIN BIJ WAT VASTLIGT: DE RAND, DE KRUISINGEN, DE ROOSTERS MET HUN KLEUR. DE REST VOLGT.',
  'EN NEE, HIJ IS ER NOG STEEDS NIET.',
];

const UITLEG_VIER = [
  'PLAN VIER. NU MET DE TV-KAMER ERBIJ, WANT DIE STOND ER DE VORIGE KEER NIET OP.',
  'JE KENT HET: GROEN AAN GROEN, ROOD AAN ROOD, NERGENS DOOR ELKAAR.',
  'DE UNIT ZELF IS ONDERWEG. DAT IS HIJ AL EEN TIJDJE.',
];

const UITLEG_VIJF = [
  'HET HELE HUIS, IN EEN PLAN. ELKE KOKER, ELK ROOSTER, VIJF KRUISINGEN.',
  'ALS DIT KLOPT, HOEFT HIJ ALLEEN NOG MAAR GELEVERD TE WORDEN.',
  'ALLEEN NOG MAAR.',
];

export const KANAAL_LEVELS: readonly KanaalLevel[] = [
  {
    id: 'kanalen-1',
    nummer: 1,
    titel: 'KANAALPLAN 1',
    praatje: 'ALLEEN DE KEUKEN. ER IS MAAR EEN MANIER.',
    levering: 'LEVERING VERWACHT: WEEK 14',
    baas: false,
    dekking: 'KEUKEN',
    uitleg: UITLEG_EERSTE,
    bord: {
      width, height,
      masks: [0, 0, 0, 0, 0, 1, 13, 2, 12, 5, 4, 0, 0, 0, 0, 0, 0, 0, 0, 12,
        15, 13, 3, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 8, 12, 5, 13, 3, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      wtw: 5,
      roosters: [7, 10, 23, 24, 33, 34],
    },
  },
  {
    id: 'kanalen-2',
    nummer: 2,
    titel: 'KANAALPLAN 2',
    praatje: 'DE WOONKAMER. GROEN BLAAST, ROOD ZUIGT.',
    levering: 'LEVERING VERWACHT: WEEK 23',
    baas: false,
    dekking: 'WOONKAMER',
    uitleg: UITLEG_TWEE,
    bord: {
      width, height,
      masks: [1, 10, 7, 8, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 3, 11, 10, 11, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 2, 14, 15, 6, 4, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 3, 6, 10, 7, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 10, 12, 3,
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      wtw: 0,
      roosters: [3, 4, 28, 32, 46, 56, 60],
      afvoer: 14,
      afRoosters: [28, 46, 60],
      kruisingen: [30],
    },
  },
  {
    id: 'kanalen-3',
    nummer: 3,
    titel: 'KANAALPLAN 3',
    praatje: 'WOONKAMER EN KEUKEN IN EEN PLAN.',
    levering: 'LEVERING VERWACHT: WEEK 31',
    baas: false,
    dekking: 'WOONKAMER + KEUKEN',
    uitleg: UITLEG_GROOT,
    bord: {
      width, height,
      masks: [4, 13, 10, 9, 1, 3, 10, 1, 6, 10, 8, 0, 0, 0, 1, 9, 2, 15, 3, 14,
        13, 9, 5, 4, 2, 0, 0, 0, 8, 9, 7, 14, 6, 12, 1, 12, 14, 7, 12, 0,
        0, 0, 3, 15, 15, 15, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 6, 2, 9,
        2, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      wtw: 4,
      roosters: [0, 7, 10, 14, 16, 23, 24, 28, 34, 56, 58, 60],
      afvoer: 5,
      afRoosters: [7, 10, 23, 24, 28, 34],
      kruisingen: [43, 44, 45],
    },
  },
  {
    id: 'kanalen-4',
    nummer: 4,
    titel: 'KANAALPLAN 4',
    praatje: 'HET PLAN IS INMIDDELS BETER DAN HET HUIS.',
    levering: 'LEVERING VERWACHT: WEEK 47',
    baas: false,
    dekking: 'KEUKEN + TV-KAMER',
    uitleg: UITLEG_VIER,
    bord: {
      width, height,
      masks: [0, 0, 0, 0, 0, 8, 3, 1, 1, 9, 4, 1, 10, 3, 0, 0, 0, 0, 0, 3,
        15, 7, 10, 7, 14, 9, 9, 12, 0, 0, 0, 0, 0, 2, 9, 10, 5, 10, 10, 15,
        14, 9, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 12, 12, 10, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 8, 3, 4],
      wtw: 69,
      roosters: [5, 7, 8, 10, 11, 33, 67],
      afvoer: 68,
      afRoosters: [7, 8, 10, 33, 67],
      kruisingen: [20, 39],
    },
  },
  {
    id: 'kanalen-5',
    nummer: 5,
    titel: 'KANAALPLAN 5',
    praatje: 'HET HELE HUIS. HET LAATSTE PLAN. ECHT.',
    levering: 'LEVERING VERWACHT: MORGEN',
    baas: false,
    dekking: 'HET HELE HUIS',
    uitleg: UITLEG_VIJF,
    bord: {
      width, height,
      masks: [8, 13, 5, 7, 10, 14, 10, 10, 12, 6, 14, 3, 8, 1, 9, 15, 10, 15, 5, 15,
        10, 5, 15, 12, 5, 14, 15, 14, 5, 11, 2, 12, 2, 9, 10, 8, 9, 8, 8, 4,
        5, 4, 11, 15, 6, 6, 2, 0, 0, 0, 0, 0, 0, 4, 15, 12, 2, 4, 6, 14,
        4, 0, 0, 0, 0, 0, 0, 4, 3, 4],
      wtw: 0,
      roosters: [12, 13, 30, 32, 35, 37, 38, 39, 41, 46, 53, 56, 57, 60, 67, 69],
      afvoer: 14,
      afRoosters: [12, 13, 38, 39, 41, 46, 53, 56, 60, 67, 69],
      kruisingen: [15, 17, 19, 22, 43],
    },
  },
];
