import type { Vloer } from './model.ts';

/**
 * Vloerniveaus. Cells are planks' worth of width, not metres.
 *
 * PROVISIONAL: the room sizes are stand-ins until the real drawings land.
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
];

const UITLEG_LATER = [
  'VOLGENDE VLOER. LET OP DE NADEN: TE DICHT ONDER ELKAAR EN HET WORDT EEN STREEP.',
  'SOMS IS HET GOEDKOPE BEGIN NET HET BEGIN DAT NIET MAG. DAN ZAAG JE TOCH MAAR EEN NIEUWE AAN.',
];

export const VLOER_LEVELS: readonly VloerLevel[] = [
  {
    id: 'vloeren-keuken',
    ruimte: 'KEUKEN',
    titel: 'VLOER KEUKEN',
    praatje: 'KORTE PLANKEN, WEINIG SPELING.',
    uitleg: UITLEG_EERSTE,
    vloer: { breedte: 13, rijen: 7, plank: 5, versprong: 2 },
  },
  {
    id: 'vloeren-woonkamer',
    ruimte: 'WOONKAMER',
    titel: 'VLOER WOONKAMER',
    praatje: 'NADEN MINSTENS DRIE UIT ELKAAR.',
    uitleg: UITLEG_LATER,
    vloer: { breedte: 14, rijen: 7, plank: 6, versprong: 3 },
  },
  {
    id: 'vloeren-tvkamer',
    ruimte: 'TV-KAMER',
    titel: 'VLOER TV-KAMER',
    praatje: 'DE GROOTSTE. LANGE PLANKEN, VEEL RIJEN.',
    uitleg: UITLEG_LATER,
    vloer: { breedte: 17, rijen: 8, plank: 7, versprong: 3 },
  },
];
