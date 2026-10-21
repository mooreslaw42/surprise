/**
 * Verdeler: balance the floor heating loops.
 *
 * Every loop runs off one manifold, so they fight each other for flow. Open
 * one and its neighbours on the manifold lose pressure and shut; shut one and
 * they come back. Turning a valve therefore flips that loop and the ones
 * beside it, and the job is getting the lot open at once.
 *
 * Which is the same shape as Lights Out, and the same thing to think about:
 * nothing here is routed or placed, only worked out.
 */

export type Verdeler = {
  readonly width: number;
  readonly height: number;
  /** True where a loop is open. */
  readonly open: boolean[];
  /** Loops that have no valve: whatever they are doing, they keep doing. */
  readonly vast: readonly number[];
};

export function index(v: { width: number }, x: number, y: number): number {
  return y * v.width + x;
}

export function binnen(v: Verdeler, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < v.width && y < v.height;
}

export function heeftKraan(v: Verdeler, i: number): boolean {
  return !v.vast.includes(i);
}

/** The loop itself and the ones beside it on the manifold. */
export function raakt(v: Verdeler, i: number): number[] {
  const x = i % v.width;
  const y = Math.floor(i / v.width);
  const out = [i];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    if (binnen(v, x + dx, y + dy)) out.push(index(v, x + dx, y + dy));
  }
  return out;
}

export function draaiKraan(v: Verdeler, open: readonly boolean[], i: number): boolean[] {
  const next = [...open];
  if (!heeftKraan(v, i)) return next;
  for (const j of raakt(v, i)) next[j] = !next[j];
  return next;
}

export function dicht(open: readonly boolean[]): number {
  return open.filter((o) => !o).length;
}

export function isSolved(open: readonly boolean[]): boolean {
  return open.every(Boolean);
}

export function stars(zetten: number, par: number): number {
  if (zetten <= par) return 3;
  if (zetten <= par + 2) return 2;
  return 1;
}

/** Manifolds are authored as ASCII: 'O' open, '.' shut, '#' no valve. */
export function parseVerdeler(rows: readonly string[]): Verdeler {
  const width = rows[0]?.length ?? 0;
  const open: boolean[] = [];
  const vast: number[] = [];
  rows.forEach((row, y) => {
    if (row.length !== width) throw new Error(`ragged manifold row ${y}`);
    [...row].forEach((ch, x) => {
      if (ch !== 'O' && ch !== '.' && ch !== '#') throw new Error(`unknown manifold cell "${ch}"`);
      open.push(ch === 'O');
      if (ch === '#') vast.push(y * width + x);
    });
  });
  return { width, height: rows.length, open, vast };
}
