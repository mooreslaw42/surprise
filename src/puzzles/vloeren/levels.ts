import type { Vloer } from './model.ts';

/**
 * Vloerniveaus. Cells are planks' worth of width, not metres.
 *
 * None of the rooms is a rectangle: courses step in and out around counters,
 * a chimney breast and a bay, so the joints never line up two rows running
 * and you cannot coast through on one om-en-om rhythm.
 *
 * PROVISIONAL: the room shapes are stand-ins until the real drawings land.
 */

export type VloerLevel = {
  readonly id: string;
  readonly ruimte: string;
  readonly titel: string;
  readonly praatje: string;
  readonly uitleg: readonly string[];
  readonly vloer: Vloer;
};

const UITLEG_EERSTE = [
  'DE VLOER. JE BEPAALT PER RIJ MAAR EEN DING: HOE LANG DE EERSTE PLANK IS.',
  'DE REST VAN DE RIJ GAAT VOL DOOR TOT DE MUUR, EN DAAR ZAAG JE DE LAATSTE AF.',
  'DAT AFGEZAAGDE STUK MAG DE VOLGENDE RIJ BEGINNEN. DOE JE DAT, DAN KOST DIE RIJ EEN PLANK MINDER.',
  'EN NEE, DE KAMER IS NIET RECHT. ELKE RIJ IS EEN ANDER STUK, DUS OM-EN-OM REDT JE NIET.',
];

const UITLEG_LATER = [
  'VOLGENDE VLOER. LET OP DE NADEN: TE DICHT ONDER ELKAAR EN HET WORDT EEN STREEP.',
  'DE RIJEN SPRINGEN IN EN UIT, DUS EEN NAAD DIE BOVEN MOCHT MAG HIER NET NIET.',
  'SOMS IS HET GOEDKOPE BEGIN NET HET BEGIN DAT NIET MAG. DAN ZAAG JE TOCH MAAR EEN NIEUWE AAN.',
];

export const VLOER_LEVELS: readonly VloerLevel[] = [
  {
    id: 'vloeren-keuken',
    ruimte: 'KEUKEN',
    titel: 'VLOER KEUKEN',
    praatje: 'KORTE PLANKEN, EEN HAP UIT DE HOEK.',
    uitleg: UITLEG_EERSTE,
    // A kitchen with a counter nook biting into one course.
    vloer: {
      plank: 5,
      versprong: 2,
      vorm: [
        { links: 0, breedte: 8 },
        { links: 0, breedte: 13 },
        { links: 0, breedte: 11 },
        { links: 3, breedte: 8 },
        { links: 0, breedte: 11 },
        { links: 0, breedte: 13 },
      ],
    },
  },
  {
    id: 'vloeren-woonkamer',
    ruimte: 'WOONKAMER',
    titel: 'VLOER WOONKAMER',
    praatje: 'OM DE SCHOORSTEEN HEEN.',
    uitleg: UITLEG_LATER,
    // Two courses pinch in around a chimney breast in the middle of the room.
    vloer: {
      plank: 6,
      versprong: 3,
      vorm: [
        { links: 0, breedte: 16 },
        { links: 0, breedte: 13 },
        { links: 4, breedte: 11 },
        { links: 4, breedte: 11 },
        { links: 0, breedte: 15 },
        { links: 0, breedte: 16 },
        { links: 0, breedte: 13 },
      ],
    },
  },
  {
    id: 'vloeren-tvkamer',
    ruimte: 'TV-KAMER',
    titel: 'VLOER TV-KAMER',
    praatje: 'DE GROOTSTE. ALLE HOEKEN EEN ANDER STUK.',
    uitleg: UITLEG_LATER,
    // The biggest and most ragged: a stepped bay and a long run of odd widths.
    vloer: {
      plank: 7,
      versprong: 3,
      vorm: [
        { links: 0, breedte: 20 },
        { links: 0, breedte: 17 },
        { links: 4, breedte: 16 },
        { links: 4, breedte: 13 },
        { links: 0, breedte: 20 },
        { links: 0, breedte: 18 },
        { links: 0, breedte: 15 },
        { links: 0, breedte: 20 },
      ],
    },
  },
];
