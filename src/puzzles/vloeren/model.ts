/**
 * Vloeren: lay the floor, row by row, and waste as little as possible.
 *
 * You decide one thing per row: how long the first plank is. Everything after
 * it is a full plank until the far wall, where the last one gets cut — and
 * that off-cut is what you start the next row with, which is how it is
 * actually done. Take it and the row costs you nothing to begin; ignore it
 * and you cut into a fresh plank and throw the rest away.
 *
 * The catch is the joints. An end joint may not sit too near one in the row
 * above, or the floor reads as a stripe, so the cheap start is often the one
 * you cannot have.
 */

export type Vloer = {
  readonly breedte: number;
  readonly rijen: number;
  /** A full plank, in cells. */
  readonly plank: number;
  /** How far an end joint must sit from one in the row above. */
  readonly versprong: number;
};

/** The length of the first plank in each row, in cells. */
export type Legplan = number[];

/** Where the end joints fall in a row that starts with a plank of `eerste`. */
export function naden(v: Vloer, eerste: number): number[] {
  const out: number[] = [];
  for (let x = eerste; x < v.breedte; x += v.plank) out.push(x);
  return out;
}

/** What is left of the plank that got cut at the far wall. */
export function restant(v: Vloer, eerste: number): number {
  const laatste = ((v.breedte - eerste) % v.plank + v.plank) % v.plank;
  return laatste === 0 ? 0 : v.plank - laatste;
}

/** Planks opened for one row, given what the row above left over. */
export function planken(v: Vloer, eerste: number, aangereikt: number): number {
  const stukken = 1 + Math.ceil((v.breedte - eerste) / v.plank);
  return eerste === aangereikt && aangereikt > 0 ? stukken - 1 : stukken;
}

export type Fault =
  | { kind: 'buiten'; rij: number }
  | { kind: 'naad'; rij: number; x: number };

export function faults(v: Vloer, plan: Legplan): Fault[] {
  const out: Fault[] = [];
  for (let r = 0; r < v.rijen; r++) {
    const eerste = plan[r];
    if (eerste === undefined || eerste < 1 || eerste > v.plank || eerste > v.breedte) {
      out.push({ kind: 'buiten', rij: r });
      continue;
    }
    if (r === 0) continue;
    const boven = plan[r - 1];
    if (boven === undefined) continue;
    for (const naad of naden(v, eerste)) {
      for (const bovenNaad of naden(v, boven)) {
        if (Math.abs(naad - bovenNaad) < v.versprong) {
          out.push({ kind: 'naad', rij: r, x: naad });
        }
      }
    }
  }
  return out;
}

export function isSolved(v: Vloer, plan: Legplan): boolean {
  return plan.length === v.rijen && faults(v, plan).length === 0;
}

/** Full planks opened for the whole floor. */
export function totaalPlanken(v: Vloer, plan: Legplan): number {
  let totaal = 0;
  let aangereikt = 0;
  for (let r = 0; r < v.rijen; r++) {
    const eerste = plan[r];
    if (eerste === undefined) continue;
    totaal += planken(v, eerste, aangereikt);
    aangereikt = restant(v, eerste);
  }
  return totaal;
}

export function stars(gebruikt: number, par: number): number {
  if (gebruikt <= par) return 3;
  if (gebruikt <= par + 2) return 2;
  return 1;
}
