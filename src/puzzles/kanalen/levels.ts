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
      masks: [0, 0, 0, 0, 0, 8, 13, 1, 12, 4, 0, 0, 0, 0, 0, 12, 15, 13, 14, 1,
        0, 0, 0, 0, 0, 8, 8, 6, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      wtw: 5,
      roosters: [7, 9, 19, 25, 26, 29],
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
      masks: [1, 6, 4, 12, 6, 0, 0, 0, 0, 0, 2, 6, 15, 7, 2, 0, 0, 0, 0, 0,
        7, 5, 13, 12, 9, 0, 0, 0, 0, 0, 8, 4, 13, 2, 1, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      wtw: 0,
      roosters: [2, 14, 30, 31, 33, 34],
      afvoer: 10,
      afRoosters: [2, 30, 31, 33],
      kruisingen: [12],
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
      masks: [2, 13, 13, 5, 12, 3, 5, 7, 8, 8, 1, 3, 11, 4, 14, 15, 6, 6, 13, 12,
        2, 5, 15, 10, 15, 3, 2, 8, 14, 8, 8, 5, 14, 2, 1, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      wtw: 4,
      roosters: [0, 8, 9, 10, 13, 20, 26, 27, 29, 30, 33, 34],
      afvoer: 5,
      afRoosters: [8, 9, 20, 27, 29],
      kruisingen: [15, 22, 24],
    },
  },
  {
    id: 'kanalen-4',
    nummer: 4,
    titel: 'KANAALPLAN 4',
    praatje: 'HET PLAN IS INMIDDELS BETER DAN HET HUIS.',
    levering: 'LEVERING VERWACHT: WEEK 47',
    baas: false,
    dekking: 'WOONKAMER + TV-KAMER',
    uitleg: UITLEG_VIER,
    bord: {
      width, height,
      masks: [4, 10, 6, 12, 3, 0, 0, 0, 0, 0, 4, 1, 5, 5, 8, 0, 0, 0, 0, 0,
        9, 11, 12, 14, 9, 0, 0, 0, 0, 0, 1, 14, 5, 5, 11, 12, 1, 13, 9, 1,
        0, 0, 0, 0, 0, 11, 10, 15, 15, 14, 0, 0, 0, 0, 0, 8, 1, 3, 8, 2],
      wtw: 59,
      roosters: [0, 10, 11, 14, 30, 36, 39, 55, 56],
      afvoer: 58,
      afRoosters: [36, 56],
      kruisingen: [47, 48],
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
      masks: [4, 11, 5, 5, 11, 2, 4, 9, 2, 4, 8, 15, 14, 5, 15, 6, 11, 6, 8, 13,
        8, 15, 7, 1, 1, 12, 15, 14, 13, 12, 8, 7, 10, 5, 5, 6, 10, 1, 11, 4,
        0, 0, 0, 0, 0, 11, 15, 7, 15, 3, 0, 0, 0, 0, 0, 2, 4, 1, 4, 2],
      wtw: 0,
      roosters: [5, 6, 8, 9, 18, 20, 23, 24, 30, 37, 39, 55, 56, 57, 58, 59],
      afvoer: 10,
      afRoosters: [6, 8, 9, 18, 20, 23, 37, 39, 56, 58],
      kruisingen: [11, 14, 21, 46, 48],
    },
  },
];
