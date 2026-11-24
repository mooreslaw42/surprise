import {
  type Doorsnede, type Plaatsing,
  BREEDTE, HOOGTE, STUKKEN, balans, lozeRuimte, zwaartepunt,
} from './model.ts';
import { elkeOplossing } from './solver.ts';

/**
 * How the tuinhuis level was chosen. The game never runs this; levels.ts
 * holds what it printed, and a test holds the two together.
 *
 * With the rules that make it a liveable house there are few enough houses
 * to look at every one of them, so this does: of all the houses that keep
 * every rule, the tightest that hangs neatly, and of those the one nearest
 * the axle. That one is also the hint, so it must be worth three stars.
 */

/**
 * Where the axle hangs and how forgiving it is, in cells. Three and three
 * quarter metres from the nose, a little behind the middle, as on a real
 * trailer. A quarter of a metre either way tows.
 */
export const AS = 7.5;
export const BAND = 0.5;

/**
 * The window in the back wall: a metre and a half wide, from a metre to two
 * metres up, over where the worktop goes. It is what decides where the tall
 * things cannot stand.
 */
export const RAAM = { x: 9, y: 2, w: 3, h: 2 } as const;

export const DOORSNEDE: Doorsnede = {
  width: BREEDTE,
  height: HOOGTE,
  stukken: STUKKEN,
  as: AS,
  band: BAND,
  raam: RAAM,
};

export type Gekozen = {
  readonly doorsnede: Doorsnede;
  /** The house the level is stored with, and what the hint hands out. */
  readonly oplossing: readonly Plaatsing[];
  /** The dead space of the tightest house there is. */
  readonly par: number;
  /** How many houses keep every rule, for the record. */
  readonly huizen: number;
};

export function kies(d: Doorsnede = DOORSNEDE): Gekozen {
  let beste: Plaatsing[] | null = null;
  let besteScore = Infinity;
  let huizen = 0;
  elkeOplossing(d, (huis) => {
    huizen++;
    const uit = Math.abs(zwaartepunt(d, huis)! - d.as);
    const score = (balans(d, huis) === 'netjes' ? 0 : 1000) + lozeRuimte(d, huis) * 10 + uit;
    if (score < besteScore - 1e-9) {
      besteScore = score;
      beste = [...huis];
    }
    return false;
  });
  if (!beste) throw new Error('geen enkel huis houdt zich aan alle regels');
  return { doorsnede: d, oplossing: beste, par: lozeRuimte(d, beste), huizen };
}
