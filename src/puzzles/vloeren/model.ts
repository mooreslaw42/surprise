/**
 * Vloeren: lay the floor, course by course, and waste as little as possible.
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
 *
 * The room is not a rectangle. Each course has its own left wall and its own
 * width — steps, bays, a chimney breast to lay around — so the joints no
 * longer line up from row to row and no single two-plank rhythm carries the
 * whole floor. Every course is its own little sum of restjes en hoekjes.
 */

/** One course of the floor, in absolute floor cells. */
export type Rij = {
  /** Where this course's left wall sits, counted from the floor's far left. */
  readonly links: number;
  /** How many cells wide the course is. */
  readonly breedte: number;
};

export type Vloer = {
  /** The room, course by course from the back wall to the front. */
  readonly vorm: readonly Rij[];
  /** A full plank, in cells. */
  readonly plank: number;
  /** How far an end joint must sit from one in the row above. */
  readonly versprong: number;
};

/** The length of the first plank in each row, in cells. */
export type Legplan = number[];

/** How many courses the floor has. */
export function rijen(v: Vloer): number {
  return v.vorm.length;
}

/** The floor's overall width, far left wall to far right, for drawing. */
export function breedte(v: Vloer): number {
  return Math.max(...v.vorm.map((r) => r.links + r.breedte));
}

/** Where the end joints fall in course `r` when it starts with `eerste`, in absolute cells. */
export function naden(v: Vloer, r: number, eerste: number): number[] {
  const rij = v.vorm[r]!;
  const muur = rij.links + rij.breedte;
  const out: number[] = [];
  for (let x = rij.links + eerste; x < muur; x += v.plank) out.push(x);
  return out;
}

/** What is left of the plank that got cut at the far wall of course `r`. */
export function restant(v: Vloer, r: number, eerste: number): number {
  const b = v.vorm[r]!.breedte;
  const laatste = ((b - eerste) % v.plank + v.plank) % v.plank;
  return laatste === 0 ? 0 : v.plank - laatste;
}

/** Planks opened for course `r`, given what the row above left over. */
export function planken(v: Vloer, r: number, eerste: number, aangereikt: number): number {
  const b = v.vorm[r]!.breedte;
  const stukken = 1 + Math.ceil((b - eerste) / v.plank);
  return eerste === aangereikt && aangereikt > 0 ? stukken - 1 : stukken;
}

/** Do the end joints of two stacked courses sit too close together? */
export function nadenBotsen(v: Vloer, boven: number, eBoven: number, onder: number, eOnder: number): boolean {
  for (const a of naden(v, onder, eOnder)) {
    for (const b of naden(v, boven, eBoven)) {
      if (Math.abs(a - b) < v.versprong) return true;
    }
  }
  return false;
}

export type Fault =
  | { kind: 'buiten'; rij: number }
  | { kind: 'naad'; rij: number; x: number };

export function faults(v: Vloer, plan: Legplan): Fault[] {
  const out: Fault[] = [];
  for (let r = 0; r < v.vorm.length; r++) {
    const eerste = plan[r];
    const b = v.vorm[r]!.breedte;
    if (eerste === undefined || eerste < 1 || eerste > v.plank || eerste > b) {
      out.push({ kind: 'buiten', rij: r });
      continue;
    }
    if (r === 0) continue;
    const boven = plan[r - 1];
    if (boven === undefined) continue;
    for (const naad of naden(v, r, eerste)) {
      for (const bovenNaad of naden(v, r - 1, boven)) {
        if (Math.abs(naad - bovenNaad) < v.versprong) {
          out.push({ kind: 'naad', rij: r, x: naad });
        }
      }
    }
  }
  return out;
}

export function isSolved(v: Vloer, plan: Legplan): boolean {
  return plan.length === v.vorm.length && faults(v, plan).length === 0;
}

/** Full planks opened for the whole floor. */
export function totaalPlanken(v: Vloer, plan: Legplan): number {
  let totaal = 0;
  let aangereikt = 0;
  for (let r = 0; r < v.vorm.length; r++) {
    const eerste = plan[r];
    if (eerste === undefined) continue;
    totaal += planken(v, r, eerste, aangereikt);
    aangereikt = restant(v, r, eerste);
  }
  return totaal;
}

export function stars(gebruikt: number, par: number): number {
  if (gebruikt <= par) return 3;
  if (gebruikt <= par + 2) return 2;
  return 1;
}
