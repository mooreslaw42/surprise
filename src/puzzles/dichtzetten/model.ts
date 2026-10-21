/**
 * Dichtzetten: find the frame before you board over it.
 *
 * The plasterboard is going on, and every screw has to land on timber. You
 * cannot see the frame any more, but you can count: the numbers along the
 * top and down the side say how long the runs of timber are in that column
 * or row, in order.
 *
 * So it is a nonogram, and what it draws is the wall's own frame — the
 * stijlen, the regels between them, and the lateien over the openings.
 */

export const MERK = {
  ONBEKEND: 0,
  HOUT: 1,
  LEEG: 2,
} as const;

export type MerkWaarde = (typeof MERK)[keyof typeof MERK];

export type Wand = {
  readonly width: number;
  readonly height: number;
  /** True where there is timber. Not shown; this is the answer. */
  readonly hout: boolean[];
  readonly kolomHints: readonly (readonly number[])[];
  readonly rijHints: readonly (readonly number[])[];
};

export function index(w: { width: number }, x: number, y: number): number {
  return y * w.width + x;
}

/** The runs of timber along a line, in order; [0] when there are none. */
export function hints(lijn: readonly boolean[]): number[] {
  const out: number[] = [];
  let run = 0;
  for (const cel of lijn) {
    if (cel) run++;
    else if (run > 0) { out.push(run); run = 0; }
  }
  if (run > 0) out.push(run);
  return out.length ? out : [0];
}

export function kolom(w: Wand, x: number): boolean[] {
  return Array.from({ length: w.height }, (_, y) => w.hout[index(w, x, y)]!);
}

export function rij(w: Wand, y: number): boolean[] {
  return Array.from({ length: w.width }, (_, x) => w.hout[index(w, x, y)]!);
}

export function maakWand(rows: readonly string[]): Wand {
  const width = rows[0]?.length ?? 0;
  const hout: boolean[] = [];
  rows.forEach((row, y) => {
    if (row.length !== width) throw new Error(`ragged frame row ${y}`);
    for (const ch of row) {
      if (ch !== '#' && ch !== '.') throw new Error(`unknown frame cell "${ch}"`);
      hout.push(ch === '#');
    }
  });
  const basis: Wand = { width, height: rows.length, hout, kolomHints: [], rijHints: [] };
  return {
    ...basis,
    kolomHints: Array.from({ length: width }, (_, x) => hints(kolom(basis, x))),
    rijHints: Array.from({ length: rows.length }, (_, y) => hints(rij(basis, y))),
  };
}

export type Fault =
  | { kind: 'mis'; at: number }
  | { kind: 'open'; at: number };

/** What is wrong with the marks so far: timber marked that is not, and timber not yet found. */
export function faults(w: Wand, merken: readonly MerkWaarde[]): Fault[] {
  const out: Fault[] = [];
  for (let i = 0; i < w.hout.length; i++) {
    if (merken[i] === MERK.HOUT && !w.hout[i]) out.push({ kind: 'mis', at: i });
    if (w.hout[i] && merken[i] !== MERK.HOUT) out.push({ kind: 'open', at: i });
  }
  return out;
}

export function isSolved(w: Wand, merken: readonly MerkWaarde[]): boolean {
  return faults(w, merken).length === 0;
}

/** Screws put into thin air. */
export function missers(w: Wand, merken: readonly MerkWaarde[]): number {
  return faults(w, merken).filter((f) => f.kind === 'mis').length;
}

export function stars(fouten: number): number {
  if (fouten === 0) return 3;
  if (fouten <= 3) return 2;
  return 1;
}
