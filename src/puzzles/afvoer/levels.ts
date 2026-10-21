import { parseDoorsnede, type Doorsnede } from './model.ts';

/**
 * Afvoerniveaus: a section straight through the room, the appliances along
 * the top and the standleiding at the end.
 *
 * '.' open, '#' a joist, 'S' the standleiding.
 *
 * PROVISIONAL: the sections are stand-ins until the real wall drawings land.
 */

export type AfvoerLevel = {
  readonly id: string;
  readonly ruimte: string;
  readonly titel: string;
  readonly praatje: string;
  readonly uitleg: readonly string[];
  readonly doorsnede: Doorsnede;
};

const UITLEG_EERSTE = [
  'DE AFVOER. DIT IS EEN DOORSNEDE DOOR DE VLOER, VAN OPZIJ GEZIEN.',
  'TREK EEN BUIS VAN ELK APPARAAT NAAR DE STANDLEIDING. WATER LOOPT NAAR RECHTS EN OMLAAG, NOOIT OMHOOG.',
  'EN NIET TE LANG VLAK: NA TWEE VAKKEN VLAK MOET HIJ WEER ZAKKEN, ANDERS BLIJFT HET STAAN.',
];

const UITLEG_LATER = [
  'VOLGENDE DOORSNEDE. MEER APPARATEN, EN DE BALKEN ZITTEN IN DE WEG.',
  'BUIZEN MOGEN SAMENKOMEN. DAT SCHEELT BUIS, MAAR DE GEDEELDE BUIS MOET HET WEL VOOR ALLEBEI HOUDEN.',
];

export const AFVOER_LEVELS: readonly AfvoerLevel[] = [
  {
    id: 'afvoer-keuken',
    ruimte: 'KEUKEN',
    titel: 'AFVOER KEUKEN',
    praatje: 'AANRECHT EN VAATWASSER. ALTIJD NAAR RECHTS EN OMLAAG.',
    uitleg: UITLEG_EERSTE,
    doorsnede: parseDoorsnede(
      [
        '..........',
        '.#........',
        '..........',
        '.#........',
        '..........',
        '.#....#...',
        '.........S',
      ],
      [
        { naam: 'AANRECHT', x: 0, y: 0 },
        { naam: 'VAATWASSER', x: 3, y: 0 },
      ],
    ),
  },
  {
    id: 'afvoer-badkamer',
    ruimte: 'BADKAMER',
    titel: 'AFVOER BADKAMER',
    praatje: 'DRIE AFVOEREN, EN DE BALKEN LIGGEN ER AL.',
    uitleg: UITLEG_LATER,
    doorsnede: parseDoorsnede(
      [
        '............',
        '.#..##.#....',
        '............',
        '............',
        '............',
        '.#...#.#....',
        '............',
        '...........S',
      ],
      [
        { naam: 'WASTAFEL', x: 0, y: 0 },
        { naam: 'DOUCHE', x: 4, y: 0 },
        { naam: 'WC', x: 8, y: 0 },
      ],
    ),
  },
  {
    id: 'afvoer-bijkeuken',
    ruimte: 'BIJKEUKEN',
    titel: 'AFVOER BIJKEUKEN',
    praatje: 'VIER STUKS, EN OVERAL BALKEN.',
    uitleg: UITLEG_LATER,
    doorsnede: parseDoorsnede(
      [
        '.............',
        '....#...#.#..',
        '......##.....',
        '.#..#........',
        '...#.#.....#.',
        '.............',
        '.............',
        '.............',
        '............S',
      ],
      [
        { naam: 'WASMACHINE', x: 0, y: 0 },
        { naam: 'DROGER', x: 3, y: 0 },
        { naam: 'GOOTSTEEN', x: 7, y: 0 },
        { naam: 'CV-KETEL', x: 10, y: 0 },
      ],
    ),
  },
];
