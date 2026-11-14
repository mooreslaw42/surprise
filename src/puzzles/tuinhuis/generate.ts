import {
  type Doorsnede, type Plaatsing,
  BREEDTE, HOOGTE, STUKKEN, balans, faults, lozeRuimte, zwaartepunt,
} from './model.ts';
import { plekken } from './solver.ts';

/**
 * The tuinhuis is made backwards, like everything here that has to be
 * possible on the fifth of December.
 *
 * Build a finished house first — floor, then what stands on the floor, the
 * way it would go up — and only then ask where its weight hangs. If that is
 * off the axle, swap two pieces along the floor and build again. What comes
 * out is a tiny house that tows; the player gets the same nine pieces in a
 * tray and the solver is never asked whether it can be done.
 *
 * The level this prints is baked into levels.ts. This file is how it was
 * made; the game never runs it.
 */

/** A small deterministic generator, so a seed always gives the same house. */
export function rng(seed: number): () => number {
  let s = (seed | 0) || 1;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/**
 * Where the axle hangs and how forgiving it is, in cells.
 *
 * Four metres back from the nose: behind the middle, as on a real trailer,
 * so that a house packed evenly end to end leans on the towbar and does not
 * pass. Half a cell either way is a quarter of a metre, which of all the
 * houses these pieces can make lets through about one in five.
 */
export const AS = 8;
export const BAND = 0.5;

export const DOORSNEDE: Doorsnede = {
  width: BREEDTE,
  height: HOOGTE,
  stukken: STUKKEN,
  as: AS,
  band: BAND,
};

function kies<T>(rand: () => number, uit: readonly T[]): T {
  return uit[Math.floor(rand() * uit.length) % uit.length]!;
}

function index(d: Doorsnede, soort: string): number {
  const i = d.stukken.findIndex((s) => s.soort === soort);
  if (i < 0) throw new Error(`geen stuk van de soort ${soort}`);
  return i;
}

/**
 * A floor: the low pieces side by side as one long platform, the tall ones
 * at either end of it. Not every order of the floor can carry a house — the
 * vliering needs three flat metres to lie on — but a platform always can,
 * which is what lets `bouw` promise a house without looking for one.
 */
type Vloer = { laag: number[]; hoog: number[]; /** How many of the tall ones stand at the nose. */ voor: number };

function eersteVloer(d: Doorsnede, rand: () => number): Vloer {
  const vloer = d.stukken.map((_, i) => i).filter((i) => d.stukken[i]!.eis === 'vloer');
  const top = Math.max(...vloer.map((i) => d.stukken[i]!.h));
  const schud = (xs: number[]): number[] => {
    for (let i = xs.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1)) % (i + 1);
      [xs[i], xs[j]] = [xs[j]!, xs[i]!];
    }
    return xs;
  };
  const hoog = schud(vloer.filter((i) => d.stukken[i]!.h === top));
  const laag = schud(vloer.filter((i) => d.stukken[i]!.h !== top));
  return { laag, hoog, voor: Math.floor(rand() * (hoog.length + 1)) % (hoog.length + 1) };
}

/** Swap two pieces along the floor, or walk a tall one to the other end. */
function wissel(vloer: Vloer, rand: () => number): void {
  const worp = rand();
  if (worp < 0.4 && vloer.laag.length > 1) {
    const a = Math.floor(rand() * vloer.laag.length) % vloer.laag.length;
    const b = (a + 1 + Math.floor(rand() * (vloer.laag.length - 1))) % vloer.laag.length;
    [vloer.laag[a], vloer.laag[b]] = [vloer.laag[b]!, vloer.laag[a]!];
  } else if (worp < 0.6 && vloer.hoog.length > 1) {
    [vloer.hoog[0], vloer.hoog[1]] = [vloer.hoog[1]!, vloer.hoog[0]!];
  } else {
    vloer.voor = (vloer.voor + 1) % (vloer.hoog.length + 1);
  }
}

function legVloer(d: Doorsnede, vloer: Vloer): Plaatsing[] {
  const volgorde = [...vloer.hoog.slice(0, vloer.voor), ...vloer.laag, ...vloer.hoog.slice(vloer.voor)];
  const out: Plaatsing[] = [];
  let x = 0;
  for (const i of volgorde) {
    out.push({ stuk: i, x, y: 0 });
    x += d.stukken[i]!.w;
  }
  if (x > d.width) throw new Error('de vloerstukken passen niet naast elkaar');
  return out;
}

/**
 * Stand everything else on a floor. Each piece takes a place picked from the
 * places it can rest right now — a list, not a search — in the order a
 * builder would: the vliering, the stair up to it, then the loose things.
 *
 * It cannot get stuck. The platform is always wide enough for the vliering
 * with the stair beside it, and the top of the vliering is always long
 * enough for both loose pieces end to end; the one thing that could go wrong
 * is the first loose piece landing in the middle of that, so it only gets
 * places that leave one for the second.
 */
function bouwOp(d: Doorsnede, vloer: readonly Plaatsing[], rand: () => number): Plaatsing[] {
  const gezet = [...vloer];
  const vliering = index(d, 'vliering');
  const trap = index(d, 'kasttrap');

  const zet = (i: number, mag: (met: readonly Plaatsing[]) => boolean): void => {
    const kan = plekken(d, gezet, i).filter((p) => mag([...gezet, p]));
    if (kan.length === 0) throw new Error(`${d.stukken[i]!.naam} kan nergens staan`);
    gezet.push(kies(rand, kan));
  };
  const zonderFout = (soort: string) => (met: readonly Plaatsing[]) =>
    !faults(d, met).some((f) => f.kind === soort);

  zet(vliering, () => true);
  zet(trap, zonderFout('trap'));

  const los = d.stukken.map((_, i) => i).filter((i) => !gezet.some((p) => p.stuk === i));
  if (rand() < 0.5) los.reverse();
  los.forEach((i, n) => {
    const rest = los.slice(n + 1);
    // One step of looking ahead: a place only counts if whatever is still in
    // the tray could then go somewhere too.
    zet(i, (met) => rest.every((j) => plekken(d, met, j).length > 0));
  });
  return gezet;
}

/**
 * One finished, balanced house. Valid by construction; balanced by swapping
 * floor pieces until it is. The swap cap is there so a bad set of constants
 * fails loudly here instead of hanging, and the tests run enough seeds to
 * show it is never reached.
 */
export function bouw(d: Doorsnede, rand: () => number): Plaatsing[] {
  const vloer = eersteVloer(d, rand);
  for (let poging = 0; poging < 2000; poging++) {
    const huis = bouwOp(d, legVloer(d, vloer), rand);
    const b = balans(d, huis);
    if (b === 'netjes' || b === 'net') return huis;
    wissel(vloer, rand);
  }
  throw new Error('geen doorsnede in balans te krijgen: as en band kloppen niet met de stukken');
}

export type Gegenereerd = {
  readonly doorsnede: Doorsnede;
  /** The house the level was made from, and what the hint hands out. */
  readonly oplossing: readonly Plaatsing[];
  /** The dead space of the tightest house found. */
  readonly par: number;
};

/**
 * Build a thousand or so and keep the tightest: the least dead space among
 * the ones that hang neatly on the axle, and of those the one nearest it.
 * Neatly, because the stored house is also the hint, and a hint that costs a
 * star is a poor hint.
 */
export function generate(seed: number, pogingen = 1000): Gegenereerd {
  const rand = rng(seed);
  const d = DOORSNEDE;
  let beste: Plaatsing[] | null = null;
  let besteScore = Infinity;
  for (let n = 0; n < pogingen; n++) {
    const huis = bouw(d, rand);
    const uit = Math.abs(zwaartepunt(d, huis)! - d.as);
    const score = (balans(d, huis) === 'netjes' ? 0 : 1000) + lozeRuimte(d, huis) * 10 + uit;
    if (score < besteScore) {
      besteScore = score;
      beste = huis;
    }
  }
  if (!beste) throw new Error('geen pogingen gedaan');
  return { doorsnede: d, oplossing: beste, par: lozeRuimte(d, beste) };
}
