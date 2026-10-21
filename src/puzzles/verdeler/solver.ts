import { type Verdeler, draaiKraan, heeftKraan, isSolved, raakt } from './model.ts';

/**
 * Fewest valves to turn.
 *
 * Turning a valve twice undoes it and the order makes no difference, so a
 * solution is just a set of valves — which makes this linear algebra over
 * GF(2) rather than a search. Gaussian elimination gives one solution and a
 * basis for everything that changes nothing; adding each combination of those
 * to it enumerates every solution, and the smallest wins.
 *
 * So par is a proven minimum, and a manifold that cannot be balanced at all
 * is found rather than shipped.
 */

const MAX_NULLITY = 20;

export type SolveResult = { par: number; kranen: number[] };

export function solve(verdeler: Verdeler): SolveResult {
  const n = verdeler.width * verdeler.height;
  const kraanIndex: number[] = [];
  for (let i = 0; i < n; i++) if (heeftKraan(verdeler, i)) kraanIndex.push(i);
  const m = kraanIndex.length;

  // One row per loop: which valves flip it, and whether it needs flipping.
  const rijen: Uint8Array[] = [];
  for (let loop = 0; loop < n; loop++) {
    const rij = new Uint8Array(m + 1);
    for (let k = 0; k < m; k++) {
      if (raakt(verdeler, kraanIndex[k]!).includes(loop)) rij[k] = 1;
    }
    rij[m] = verdeler.open[loop] ? 0 : 1;
    rijen.push(rij);
  }

  // Gaussian elimination over GF(2).
  const pivots: number[] = [];
  let rij = 0;
  const rijAt = (r: number): Uint8Array => rijen[r]!;
  for (let kolom = 0; kolom < m && rij < rijen.length; kolom++) {
    let draai = -1;
    for (let r = rij; r < rijen.length; r++) if (rijAt(r)[kolom]) { draai = r; break; }
    if (draai < 0) continue;
    [rijen[rij], rijen[draai]] = [rijen[draai]!, rijen[rij]!];
    for (let r = 0; r < rijen.length; r++) {
      if (r !== rij && rijAt(r)[kolom]) {
        const doel = rijAt(r);
        const bron = rijAt(rij);
        for (let c = kolom; c <= m; c++) doel[c] = (doel[c]! ^ bron[c]!) as number;
      }
    }
    pivots.push(kolom);
    rij++;
  }

  // A row that reads 0 = 1 means there is no way to balance this manifold.
  for (let r = rij; r < rijen.length; r++) {
    if (rijAt(r)[m]) throw new Error('this manifold cannot be balanced');
  }

  const basis = new Uint8Array(m);
  pivots.forEach((kolom, r) => { basis[kolom] = rijAt(r)[m]!; });

  // Free columns span everything that can be added without changing a thing.
  const vrij: number[] = [];
  for (let kolom = 0; kolom < m; kolom++) if (!pivots.includes(kolom)) vrij.push(kolom);
  if (vrij.length > MAX_NULLITY) throw new Error('manifold has too many equivalent answers');

  const kern: Uint8Array[] = vrij.map((vrijeKolom) => {
    const vec = new Uint8Array(m);
    vec[vrijeKolom] = 1;
    pivots.forEach((kolom, r) => { vec[kolom] = rijAt(r)[vrijeKolom]!; });
    return vec;
  });

  let beste: Uint8Array | null = null;
  for (let mask = 0; mask < (1 << kern.length); mask++) {
    const kandidaat = new Uint8Array(basis);
    for (let b = 0; b < kern.length; b++) {
      if (!(mask & (1 << b))) continue;
      const vec = kern[b]!;
      for (let c = 0; c < m; c++) kandidaat[c] = (kandidaat[c]! ^ vec[c]!) as number;
    }
    let gewicht = 0;
    for (let c = 0; c < m; c++) gewicht += kandidaat[c]!;
    if (!beste) { beste = kandidaat; continue; }
    let bestGewicht = 0;
    for (let c = 0; c < m; c++) bestGewicht += beste[c]!;
    if (gewicht < bestGewicht) beste = kandidaat;
  }
  if (!beste) throw new Error('this manifold cannot be balanced');

  const kranen: number[] = [];
  for (let c = 0; c < m; c++) if (beste[c]) kranen.push(kraanIndex[c]!);

  // Play it back: the algebra should leave every loop open.
  let open = [...verdeler.open];
  for (const k of kranen) open = draaiKraan(verdeler, open, k);
  if (!isSolved(open)) throw new Error('solver produced an answer that does not balance');

  return { par: kranen.length, kranen };
}
