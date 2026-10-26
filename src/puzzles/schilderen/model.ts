/**
 * Schilderen: roll the whole wall in one go, keeping the wet edge.
 *
 * The roller starts where the painter starts and moves a square at a time.
 * Going back over paint you have already laid is allowed — you can always
 * finish — but it shows, so the best job is the one that covers the wall
 * without ever doubling back.
 *
 * Which makes the perfect run a Hamiltonian path over the wall, and par the
 * number of squares there are to cover.
 */

export type Muur = {
  readonly width: number;
  readonly height: number;
  /** True where there is wall to paint; false at a window or a door. */
  readonly verfbaar: boolean[];
  /** Where the painter starts, as a cell index. */
  readonly start: number;
};

export type Streek = number[];

export function index(m: { width: number }, x: number, y: number): number {
  return y * m.width + x;
}

export function xy(m: Muur, i: number): { x: number; y: number } {
  return { x: i % m.width, y: Math.floor(i / m.width) };
}

export function teVerven(m: Muur): number {
  return m.verfbaar.filter(Boolean).length;
}

export function buren(m: Muur, i: number): number[] {
  const { x, y } = xy(m, i);
  const out: number[] = [];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= m.width || ny >= m.height) continue;
    const j = index(m, nx, ny);
    if (m.verfbaar[j]) out.push(j);
  }
  return out;
}

export type Fault =
  | { kind: 'begin' }
  | { kind: 'sprong'; at: number }
  | { kind: 'raam'; at: number }
  | { kind: 'kaal'; at: number };

export function faults(m: Muur, streek: Streek): Fault[] {
  const out: Fault[] = [];
  if (streek.length === 0 || streek[0] !== m.start) out.push({ kind: 'begin' });

  for (let i = 0; i < streek.length; i++) {
    const cel = streek[i]!;
    if (!m.verfbaar[cel]) { out.push({ kind: 'raam', at: cel }); break; }
    if (i > 0 && !buren(m, streek[i - 1]!).includes(cel)) {
      out.push({ kind: 'sprong', at: cel });
      break;
    }
  }

  const geverfd = new Set(streek);
  for (let i = 0; i < m.verfbaar.length; i++) {
    if (m.verfbaar[i] && !geverfd.has(i)) out.push({ kind: 'kaal', at: i });
  }
  return out;
}

export function isSolved(m: Muur, streek: Streek): boolean {
  return faults(m, streek).length === 0;
}

/** Squares gone over twice: the bits that will show. */
export function overlap(streek: Streek): number {
  return streek.length - new Set(streek).size;
}

export function stars(streken: number, par: number): number {
  if (streken <= par) return 3;
  if (streken <= par + 3) return 2;
  return 1;
}

/** Walls are authored as ASCII: '#' wall to paint, '.' an opening, 'X' the start. */
export function parseMuur(rows: readonly string[]): Muur {
  const width = rows[0]?.length ?? 0;
  const verfbaar: boolean[] = [];
  let start = -1;
  rows.forEach((row, y) => {
    if (row.length !== width) throw new Error(`ragged wall row ${y}`);
    [...row].forEach((ch, x) => {
      if (ch !== '#' && ch !== '.' && ch !== 'X') throw new Error(`unknown wall cell "${ch}"`);
      if (ch === 'X') start = y * width + x;
      verfbaar.push(ch !== '.');
    });
  });
  if (start < 0) throw new Error('wall has no starting point');
  return { width, height: rows.length, verfbaar, start };
}
