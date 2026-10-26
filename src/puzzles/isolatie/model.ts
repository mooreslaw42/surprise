/**
 * Isolatie: pack the cavity full of wool, with nothing left open.
 *
 * Every gap is a koudebrug, so the fit has to be exact: no overlap, nothing
 * hanging over a stud, and not one cell left bare.
 *
 * There are more batts in the stack than the cavity needs, and the awkward
 * shapes are the ones with the Rc on them. So the puzzle is not only whether
 * it fits, but which ones you spend the space on.
 */

/** Cells a batt covers, relative to its own corner. */
export type Vorm = readonly (readonly [number, number])[];

export type Deken = {
  readonly id: string;
  readonly naam: string;
  readonly vorm: Vorm;
  /** Rc of this batt, in tenths, so the numbers stay whole. */
  readonly rc: number;
};

export type Plaatsing = {
  readonly deken: number;
  readonly x: number;
  readonly y: number;
  /** Quarter turns clockwise. */
  readonly draai: number;
};

export type Muur = {
  readonly width: number;
  readonly height: number;
  /** True where wool has to go. */
  readonly doel: boolean[];
  readonly dekens: readonly Deken[];
  /** The Rc the wall has to reach, in tenths. */
  readonly doelRc: number;
};

export function draaiVorm(vorm: Vorm, kwarten: number): Vorm {
  let out = vorm.map(([x, y]) => [x, y] as [number, number]);
  for (let k = 0; k < ((kwarten % 4) + 4) % 4; k++) {
    out = out.map(([x, y]) => [-y, x] as [number, number]);
  }
  // Pull back to the corner so a shape has one description per turn.
  const minX = Math.min(...out.map(([x]) => x));
  const minY = Math.min(...out.map(([, y]) => y));
  return out
    .map(([x, y]) => [x - minX, y - minY] as [number, number])
    .sort((a, b) => (a[1] - b[1]) || (a[0] - b[0]));
}

/** How many turns before a batt looks like itself again. */
export function periode(vorm: Vorm): number {
  const key = (v: Vorm) => v.map(([x, y]) => `${x},${y}`).join(';');
  const start = key(draaiVorm(vorm, 0));
  for (let k = 1; k <= 4; k++) if (key(draaiVorm(vorm, k)) === start) return k;
  return 4;
}

export function oppervlak(vorm: Vorm): number {
  return vorm.length;
}

export function cellenVan(muur: Muur, plaatsing: Plaatsing): number[] {
  const deken = muur.dekens[plaatsing.deken];
  if (!deken) return [];
  return draaiVorm(deken.vorm, plaatsing.draai)
    .map(([dx, dy]) => (plaatsing.y + dy) * muur.width + (plaatsing.x + dx));
}

export function binnen(muur: Muur, i: number, plaatsing: Plaatsing): boolean {
  const deken = muur.dekens[plaatsing.deken]!;
  const vorm = draaiVorm(deken.vorm, plaatsing.draai);
  return vorm.every(([dx, dy]) => {
    const x = plaatsing.x + dx;
    const y = plaatsing.y + dy;
    return x >= 0 && y >= 0 && x < muur.width && y < muur.height;
  }) && i >= 0;
}

export type Fault =
  | { kind: 'buiten'; which: number }
  | { kind: 'overlap'; at: number }
  | { kind: 'gat'; at: number }
  | { kind: 'dubbel'; deken: number }
  | { kind: 'teweinig'; rc: number };

export function totaalRc(muur: Muur, plaatsingen: readonly Plaatsing[]): number {
  return plaatsingen.reduce((n, p) => n + (muur.dekens[p.deken]?.rc ?? 0), 0);
}

export function faults(muur: Muur, plaatsingen: readonly Plaatsing[]): Fault[] {
  const out: Fault[] = [];
  const bedekt = new Int32Array(muur.width * muur.height).fill(-1);

  const gebruikt = new Set<number>();
  for (let i = 0; i < plaatsingen.length; i++) {
    const p = plaatsingen[i]!;
    if (gebruikt.has(p.deken)) out.push({ kind: 'dubbel', deken: p.deken });
    gebruikt.add(p.deken);

    if (!binnen(muur, i, p)) {
      out.push({ kind: 'buiten', which: i });
      continue;
    }
    for (const cel of cellenVan(muur, p)) {
      if (!muur.doel[cel]) {
        out.push({ kind: 'buiten', which: i });
        break;
      }
      if (bedekt[cel]! >= 0) out.push({ kind: 'overlap', at: cel });
      else bedekt[cel] = i;
    }
  }

  for (let cel = 0; cel < muur.doel.length; cel++) {
    if (muur.doel[cel] && bedekt[cel]! < 0) out.push({ kind: 'gat', at: cel });
  }

  const rc = totaalRc(muur, plaatsingen);
  if (rc < muur.doelRc) out.push({ kind: 'teweinig', rc });

  return out;
}

export function isSolved(muur: Muur, plaatsingen: readonly Plaatsing[]): boolean {
  return faults(muur, plaatsingen).length === 0;
}

export function doelCellen(muur: Muur): number {
  return muur.doel.filter(Boolean).length;
}

export function stars(rc: number, par: number): number {
  if (rc >= par) return 3;
  if (rc >= par - 4) return 2;
  return 1;
}

/** Walls are authored as ASCII: '#' cavity to fill, '.' stud or opening. */
export function parseMuur(
  rows: readonly string[],
  dekens: readonly Deken[],
  doelRc: number,
): Muur {
  const width = rows[0]?.length ?? 0;
  const doel: boolean[] = [];
  rows.forEach((row, y) => {
    if (row.length !== width) throw new Error(`ragged wall row ${y}`);
    for (const ch of row) {
      if (ch !== '#' && ch !== '.') throw new Error(`unknown wall cell "${ch}"`);
      doel.push(ch === '#');
    }
  });
  return { width, height: rows.length, doel, dekens, doelRc };
}
