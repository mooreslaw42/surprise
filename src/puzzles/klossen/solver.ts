import {
  MERK, type MerkWaarde, type Wand,
  bruikbaar, buren4, buren8, cellen, index, xy,
} from './model.ts';

/**
 * Two solvers, for two different questions.
 *
 * `solve` reasons the way a person has to: a handful of rules, applied over
 * and over until nothing moves. If it gets all the way to the end, the wall
 * can be worked out without guessing — which is the only thing that makes
 * this a puzzle rather than a lottery.
 *
 * `tel` just counts answers, exhaustively, and is there to prove the one the
 * rules find is the only one.
 */

/** Everything that is ruled out before you have thought about anything. */
export function initieel(w: Wand): MerkWaarde[] {
  const cel: MerkWaarde[] = new Array(cellen(w)).fill(MERK.ONBEKEND);
  for (let i = 0; i < cel.length; i++) {
    const dient = buren4(w, i).some((j) => w.dingen.some((d) => d.at === j));
    if (!bruikbaar(w, i) || !dient) cel[i] = MERK.LEEG;
  }
  return cel;
}

function zet(cel: MerkWaarde[], i: number, merk: MerkWaarde): boolean {
  if (cel[i] !== MERK.ONBEKEND) return false;
  cel[i] = merk;
  return true;
}

/** The cells a thing could still be hanging from. */
function kandidaten(w: Wand, cel: readonly MerkWaarde[], ding: number): number[] {
  return buren4(w, w.dingen[ding]!.at).filter((c) => cel[c] !== MERK.LEEG);
}

/** A klos that can only belong to one thing settles that thing for good. */
function zekerGediend(w: Wand, cel: readonly MerkWaarde[]): boolean[] {
  const uit = w.dingen.map(() => false);
  w.dingen.forEach((ding, d) => {
    for (const klos of buren4(w, ding.at)) {
      if (cel[klos] !== MERK.KLOS) continue;
      const anderen = buren4(w, klos).filter((c) => w.dingen.some((x) => x.at === c));
      if (anderen.length === 1) uit[d] = true;
    }
  });
  return uit;
}

export type Regels = {
  /** No two klossen touching. */
  readonly raak: boolean;
  /** The detector's counts per line. */
  readonly tellen: boolean;
  /** A thing with only one spot left. */
  readonly enige: boolean;
  /** Two or three things squeezed into just as many spots. */
  readonly knel: boolean;
  /** A spot whose things are all taken care of already. */
  readonly nutteloos: boolean;
};

export const ALLE_REGELS: Regels = {
  raak: true, tellen: true, enige: true, knel: true, nutteloos: true,
};

/** One sweep of the rules. True when something moved. */
export function slag(w: Wand, cel: MerkWaarde[], regels: Regels = ALLE_REGELS): boolean {
  let beweging = false;

  if (regels.raak) {
    for (let i = 0; i < cel.length; i++) {
      if (cel[i] !== MERK.KLOS) continue;
      for (const j of buren8(w, i)) if (zet(cel, j, MERK.LEEG)) beweging = true;
    }
  }

  if (regels.tellen) {
    const lijnen: number[][] = [];
    for (let x = 0; x < w.width; x++) {
      lijnen.push(Array.from({ length: w.height }, (_, y) => index(w, x, y)));
    }
    for (let y = 0; y < w.height; y++) {
      lijnen.push(Array.from({ length: w.width }, (_, x) => index(w, x, y)));
    }
    const doelen = [...w.kolomTel, ...w.rijTel];
    lijnen.forEach((lijn, n) => {
      const doel = doelen[n]!;
      const staan = lijn.filter((i) => cel[i] === MERK.KLOS).length;
      const open = lijn.filter((i) => cel[i] === MERK.ONBEKEND);
      if (staan === doel) {
        for (const i of open) if (zet(cel, i, MERK.LEEG)) beweging = true;
      } else if (staan + open.length === doel) {
        for (const i of open) if (zet(cel, i, MERK.KLOS)) beweging = true;
      }
    });
  }

  if (regels.enige) {
    for (let d = 0; d < w.dingen.length; d++) {
      const kans = kandidaten(w, cel, d);
      if (kans.length === 1 && zet(cel, kans[0]!, MERK.KLOS)) beweging = true;
    }
  }

  if (regels.knel) {
    // Things whose spots overlap: k things with only k spots between them fill
    // every one of those spots, whichever way round they end up.
    const kans = w.dingen.map((_, d) => kandidaten(w, cel, d));
    const n = w.dingen.length;
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        const paar = new Set([...kans[a]!, ...kans[b]!]);
        if (paar.size === 2) {
          for (const i of paar) if (zet(cel, i, MERK.KLOS)) beweging = true;
          continue;
        }
        for (let c = b + 1; c < n; c++) {
          const drie = new Set([...paar, ...kans[c]!]);
          if (drie.size === 3) {
            for (const i of drie) if (zet(cel, i, MERK.KLOS)) beweging = true;
          }
        }
      }
    }
  }

  if (regels.nutteloos) {
    const klaar = zekerGediend(w, cel);
    for (let i = 0; i < cel.length; i++) {
      if (cel[i] !== MERK.ONBEKEND) continue;
      const dienst = buren4(w, i)
        .map((c) => w.dingen.findIndex((d) => d.at === c))
        .filter((d) => d >= 0);
      if (dienst.length > 0 && dienst.every((d) => klaar[d])) {
        if (zet(cel, i, MERK.LEEG)) beweging = true;
      }
    }
  }

  return beweging;
}

export type Uitkomst = {
  readonly cel: MerkWaarde[];
  /** Nothing left unknown: the whole wall came out of the rules. */
  readonly klaar: boolean;
  /** How many sweeps it took. A rough stand-in for how much work it is. */
  readonly slagen: number;
};

export function solve(w: Wand, regels: Regels = ALLE_REGELS): Uitkomst {
  const cel = initieel(w);
  let slagen = 0;
  while (slag(w, cel, regels)) slagen++;
  return { cel, klaar: !cel.includes(MERK.ONBEKEND), slagen };
}

/**
 * The next square the rules can settle, given what the player has so far.
 * Used for the hint key, so a hint is always something they could have got.
 */
export function volgende(w: Wand, gedaan: readonly MerkWaarde[]): { at: number; merk: MerkWaarde } | null {
  const cel = initieel(w);
  for (let i = 0; i < cel.length; i++) {
    if (gedaan[i] === MERK.KLOS && w.klossen.includes(i)) cel[i] = MERK.KLOS;
  }
  while (slag(w, cel)) {
    for (let i = 0; i < cel.length; i++) {
      if (cel[i] === MERK.KLOS && gedaan[i] !== MERK.KLOS) return { at: i, merk: MERK.KLOS };
    }
  }
  for (let i = 0; i < cel.length; i++) {
    if (cel[i] === MERK.KLOS && gedaan[i] !== MERK.KLOS) return { at: i, merk: MERK.KLOS };
    if (cel[i] === MERK.LEEG && gedaan[i] === MERK.ONBEKEND && bruikbaar(w, i)) {
      return { at: i, merk: MERK.LEEG };
    }
  }
  return null;
}

/**
 * Every arrangement of klossen that fits the clues, counted up to `limiet`.
 * Each thing picks its own klos, so this walks the matchings; two matchings
 * can land on the same set of klossen, so sets are what gets counted.
 */
export function tel(w: Wand, limiet = 2): number {
  const vrij = initieel(w).map((m) => m !== MERK.LEEG);
  const orde = w.dingen
    .map((_, d) => d)
    .sort((a, b) =>
      buren4(w, w.dingen[a]!.at).filter((c) => vrij[c]).length
      - buren4(w, w.dingen[b]!.at).filter((c) => vrij[c]).length);

  const kolomOver = [...w.kolomTel];
  const rijOver = [...w.rijTel];
  const gekozen = new Set<number>();
  const gevonden = new Set<string>();

  const loop = (n: number): void => {
    if (gevonden.size >= limiet) return;
    if (n === orde.length) {
      gevonden.add([...gekozen].sort((a, b) => a - b).join(','));
      return;
    }
    const ding = w.dingen[orde[n]!]!;
    for (const plek of buren4(w, ding.at)) {
      if (!vrij[plek] || gekozen.has(plek)) continue;
      const { x, y } = xy(w, plek);
      if (kolomOver[x]! <= 0 || rijOver[y]! <= 0) continue;
      if (buren8(w, plek).some((j) => gekozen.has(j))) continue;
      gekozen.add(plek);
      kolomOver[x]!--;
      rijOver[y]!--;
      loop(n + 1);
      gekozen.delete(plek);
      kolomOver[x]!++;
      rijOver[y]!++;
      if (gevonden.size >= limiet) return;
    }
  };
  loop(0);
  return gevonden.size;
}

export function eenduidig(w: Wand): boolean {
  return tel(w, 2) === 1;
}
