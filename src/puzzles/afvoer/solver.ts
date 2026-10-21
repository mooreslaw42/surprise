import { type Doorsnede, type Pad, index, vrij } from './model.ts';

/**
 * Least pipe that drains every appliance.
 *
 * Water only ever goes right or down, so the cells form a DAG and the whole
 * thing can be worked out in one sweep in reading order. Runs may join, so
 * the answer is a tree and the cost counts a shared length once — a Steiner
 * tree, done as a table over (which appliances, which cell, how long it has
 * been flat).
 *
 * The flat count is carried because the rule depends on history: a run that
 * has already gone two cells flat may not go a third. Where two runs join,
 * the shared pipe takes the worse of the two counts — anything kinder would
 * let the table call a layout legal that the per-appliance check then
 * rejects, which is exactly what the first version did.
 *
 * Par is therefore a proven minimum.
 */

export type SolveResult = { par: number; paden: Pad[] };

type Herkomst =
  | { soort: 'start' }
  | { soort: 'stap'; van: number; vanF: number }
  | { soort: 'knoop'; a: number; aF: number; b: number; bF: number };

export function solve(d: Doorsnede): SolveResult {
  const n = d.apparaten.length;
  const cellen = d.width * d.height;
  const flats = d.maxVlak + 1;
  const vol = (1 << n) - 1;

  const key = (s: number, c: number, f: number) => (s * cellen + c) * flats + f;
  const kosten = new Float64Array((vol + 1) * cellen * flats).fill(Infinity);
  const waarvan = new Array<Herkomst | undefined>((vol + 1) * cellen * flats);

  d.apparaten.forEach((a, i) => {
    if (!vrij(d, a.x, a.y)) throw new Error(`${a.naam} sits inside a joist`);
    const k = key(1 << i, index(d, a.x, a.y), 0);
    kosten[k] = 1;
    waarvan[k] = { soort: 'start' };
  });

  const subsets = [...Array(vol + 1).keys()].slice(1)
    .sort((a, b) => popcount(a) - popcount(b));

  for (const s of subsets) {
    // Reading order is a topological order: every step goes right or down.
    for (let y = 0; y < d.height; y++) {
      for (let x = 0; x < d.width; x++) {
        if (!vrij(d, x, y)) continue;
        const c = index(d, x, y);

        // Arrive here from the left or from above.
        for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
          const px = x - dx;
          const py = y - dy;
          if (px < 0 || py < 0 || !vrij(d, px, py)) continue;
          const p = index(d, px, py);
          for (let f = 0; f < flats; f++) {
            const was = kosten[key(s, p, f)]!;
            if (!Number.isFinite(was)) continue;
            // Down resets the flat run; right lengthens it.
            const nieuwF = dy > 0 ? 0 : f + 1;
            if (nieuwF >= flats) continue;
            const k = key(s, c, nieuwF);
            if (was + 1 < kosten[k]!) {
              kosten[k] = was + 1;
              waarvan[k] = { soort: 'stap', van: key(s, p, f), vanF: f };
            }
          }
        }

        // Two runs meeting here become one, carrying the worse flat count.
        for (let a = (s - 1) & s; a > 0; a = (a - 1) & s) {
          const b = s ^ a;
          if (b === 0 || a > b) continue;
          for (let fa = 0; fa < flats; fa++) {
            const ka = kosten[key(a, c, fa)]!;
            if (!Number.isFinite(ka)) continue;
            for (let fb = 0; fb < flats; fb++) {
              const kb = kosten[key(b, c, fb)]!;
              if (!Number.isFinite(kb)) continue;
              const k = key(s, c, Math.max(fa, fb));
              if (ka + kb - 1 < kosten[k]!) {
                kosten[k] = ka + kb - 1;
                waarvan[k] = { soort: 'knoop', a: key(a, c, fa), aF: fa, b: key(b, c, fb), bF: fb };
              }
            }
          }
        }
      }
    }
  }

  const stand = index(d, d.stand.x, d.stand.y);
  let beste = Infinity;
  let besteKey = -1;
  for (let f = 0; f < flats; f++) {
    const k = key(vol, stand, f);
    if (kosten[k]! < beste) { beste = kosten[k]!; besteKey = k; }
  }
  if (!Number.isFinite(beste)) throw new Error('this section cannot be drained');

  // Walk the table back for the cells the answer uses.
  const gebruikt = new Set<number>();
  const stapel = [besteKey];
  while (stapel.length) {
    const k = stapel.pop()!;
    const bron = waarvan[k];
    gebruikt.add(Math.floor(k / flats) % cellen);
    if (!bron || bron.soort === 'start') continue;
    if (bron.soort === 'stap') stapel.push(bron.van);
    else { stapel.push(bron.a); stapel.push(bron.b); }
  }

  return { par: gebruikt.size, paden: padenUit(d, gebruikt) };
}

function popcount(n: number): number {
  let c = 0;
  for (let v = n; v; v >>= 1) c += v & 1;
  return c;
}

/** Follow the laid pipe from each appliance down to the stack. */
function padenUit(d: Doorsnede, gebruikt: ReadonlySet<number>): Pad[] {
  return d.apparaten.map((a) => {
    const start = { x: a.x, y: a.y };
    const gezien = new Set<string>();
    const loop = (hier: { x: number; y: number }, vlak: number): Pad | null => {
      if (hier.x === d.stand.x && hier.y === d.stand.y) return [hier];
      const sleutel = `${hier.x},${hier.y},${vlak}`;
      if (gezien.has(sleutel)) return null;
      gezien.add(sleutel);
      for (const [dx, dy] of [[0, 1], [1, 0]] as const) {
        const volgende = { x: hier.x + dx, y: hier.y + dy };
        if (!vrij(d, volgende.x, volgende.y)) continue;
        if (!gebruikt.has(index(d, volgende.x, volgende.y))) continue;
        const nieuwVlak = dy > 0 ? 0 : vlak + 1;
        if (nieuwVlak > d.maxVlak) continue;
        const rest = loop(volgende, nieuwVlak);
        if (rest) return [hier, ...rest];
      }
      return null;
    };
    return loop(start, 0) ?? [];
  });
}
