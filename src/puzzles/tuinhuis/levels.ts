import type { Doorsnede, Plaatsing } from './model.ts';
import { DOORSNEDE } from './generate.ts';

/**
 * The tuinhuis: the boss halfway, and the one time Wiep gets what she asked
 * for. One level, one board.
 *
 * Generated rather than drawn — `generate(1205)` in generate.ts, a finished
 * house built first and handed over as loose pieces — so it is solvable by
 * construction and its par is known. Baked in here so the house never
 * changes under someone mid-game; the test holds this to what the generator
 * still prints.
 */
export type TuinhuisLevel = {
  readonly id: string;
  readonly titel: string;
  readonly praatje: string;
  /** Wiep on the drive, with a trailer. */
  readonly uitleg: readonly string[];
  /** Said once, the first time the needle runs out of the band. */
  readonly uitBalans: readonly string[];
  /** The payoff: the title of the win panel, and the line under the stars. */
  readonly afTitel: string;
  readonly afRegel: string;
  readonly doorsnede: Doorsnede;
  /** The dead space of the tightest house the generator found. */
  readonly par: number;
  /** The house this was made from. The hint hands it out a piece at a time. */
  readonly oplossing: readonly Plaatsing[];
};

export const TUINHUIS_LEVEL: TuinhuisLevel = {
  id: 'tuinhuis',
  titel: 'HET TUINHUIS',
  praatje: 'SLEEP ALLES ERIN. ZWAAR SPUL BIJ DE AS.',
  uitleg: [
    'WIEP HEEFT HET NIET GEVRAAGD DEZE KEER. WIEP STAAT OP DE OPRIT. MET EEN AANHANGER.',
    'ZEVEN METER. VIER METER HOOG, GEEN CENTIMETER MEER, ANDERS KOMT HIJ NIET ONDER HET VIADUCT DOOR.',
    'EN ALLES WAT ZWAAR IS WIL BIJ DE AS. SUCCES.',
  ],
  uitBalans: ['ZO TREKT HIJ NIET. DE ZWARE DINGEN NAAR DE AS.'],
  afTitel: 'HIJ IS AF',
  afRegel: 'EEN MIDDAG. JOUW HUIS DOET ER NU TWEE JAAR OVER.',
  doorsnede: DOORSNEDE,
  par: 0,
  // Nose to tail along the floor: douche, wc, bank, techniek, keukenblok.
  // The vliering lies over the kitchen with the stair in front of it, and
  // the two loose pieces stand on the vliering.
  oplossing: [
    { stuk: 0, x: 0, y: 0 },
    { stuk: 1, x: 2, y: 0 },
    { stuk: 4, x: 4, y: 0 },
    { stuk: 3, x: 7, y: 0 },
    { stuk: 2, x: 9, y: 0 },
    { stuk: 6, x: 8, y: 2 },
    { stuk: 5, x: 6, y: 2 },
    { stuk: 8, x: 11, y: 4 },
    { stuk: 7, x: 8, y: 4 },
  ],
};
