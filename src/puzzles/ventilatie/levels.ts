import { parsePlan, type Plan } from './model.ts';

/**
 * Ventilatieplannen, seen from above.
 *
 * '.' outside   '#' floor   'W' the WTW unit   'R' a rooster
 *
 * One of these comes up after each stage, a little bigger every time. None
 * of them is ever built.
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
  'EVEN IETS ANDERS: HET VENTILATIESYSTEEM. DIT IS DE PLATTEGROND, VAN BOVEN.',
  'TREK EEN KANAAL VAN ELK ROOSTER NAAR DE WTW-UNIT. KANALEN MOGEN SAMEN DOOR EEN KOKER.',
  'MAAR DAN TELT HUN LUCHT OOK BIJ ELKAAR OP, EN EEN KANAAL HOUDT MAAR ZOVEEL.',
];

const UITLEG_LATER = [
  'HET VENTILATIEPLAN, WEER. IETS GROTER DAN DE VORIGE KEER.',
  'ZELFDE IDEE: ROOSTERS NAAR DE UNIT, SAMEN DOOR EEN KOKER MAG, MITS HET KANAAL HET TREKT.',
  'HOE MINDER METER KANAAL, HOE BETER.',
];

export const VENTILATIE_LEVELS: readonly VentilatieLevel[] = [
  {
    id: 'ventilatie-1',
    nummer: 1,
    titel: 'VENTILATIEPLAN 1',
    praatje: 'DRIE ROOSTERS. EEN KANAAL TREKT 110.',
    levering: 'LEVERING VERWACHT: WEEK 14',
    uitleg: UITLEG_EERSTE,
    plan: parsePlan(
      [
        '.............',
        '.###########.',
        '.#R##...##R#.',
        '.#####W#####.',
        '.#.........#.',
        '.#R#######R#.',
        '.............',
      ],
      [
        { x: 2, y: 2, debiet: 50, ruimte: 'WOONKAMER' },
        { x: 10, y: 2, debiet: 50, ruimte: 'KEUKEN' },
        { x: 2, y: 5, debiet: 60, ruimte: 'TV-KAMER' },
      ],
      110,
      24,
    ),
  },
  {
    id: 'ventilatie-2',
    nummer: 2,
    titel: 'VENTILATIEPLAN 2',
    praatje: 'VIER ROOSTERS. DE AFZUIGKAP TELT MEE.',
    levering: 'LEVERING VERWACHT: WEEK 23',
    uitleg: UITLEG_LATER,
    plan: parsePlan(
      [
        '.............',
        '.###########.',
        '.#R##...##R#.',
        '.#####W#####.',
        '.#....#....#.',
        '.#R##...##R#.',
        '.###########.',
        '.............',
      ],
      [
        { x: 2, y: 2, debiet: 50, ruimte: 'WOONKAMER' },
        { x: 10, y: 2, debiet: 75, ruimte: 'KEUKEN' },
        { x: 2, y: 5, debiet: 50, ruimte: 'TV-KAMER' },
        { x: 10, y: 5, debiet: 45, ruimte: 'BIJKEUKEN' },
      ],
      130,
      24,
    ),
  },
  {
    id: 'ventilatie-3',
    nummer: 3,
    titel: 'VENTILATIEPLAN 3',
    praatje: 'VIJF ROOSTERS, EN ALLES MOET LANGS DE KOKERS.',
    levering: 'LEVERING VERWACHT: NADER TE BEPALEN',
    uitleg: UITLEG_LATER,
    plan: parsePlan(
      [
        '.............',
        '.###########.',
        '.#R#######R#.',
        '.#.........#.',
        '.#.###W###.#.',
        '.###########.',
        '.#.........#.',
        '.#R#######R#.',
        '.###########.',
      ],
      [
        { x: 2, y: 2, debiet: 50, ruimte: 'WOONKAMER' },
        { x: 10, y: 2, debiet: 75, ruimte: 'KEUKEN' },
        { x: 2, y: 7, debiet: 50, ruimte: 'TV-KAMER' },
        { x: 10, y: 7, debiet: 45, ruimte: 'BIJKEUKEN' },
        { x: 6, y: 8, debiet: 45, ruimte: 'HAL' },
      ],
      140,
      22,
    ),
  },
];
