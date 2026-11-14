/**
 * Stacks of wool for an isolatiewand, searched for rather than written down.
 *
 * Tile the cavity at random out of the shape book, throw spares on top, ask
 * the solver what the best fill is worth, and then count how many different
 * fills reach the target. Keep the stack where that number is smallest:
 * few ways to pass, and the tempting batt is usually the wrong one.
 *
 *   node --experimental-strip-types tools/wol-zoek.ts <rows joined by /> <spares> <pogingen> [seed]
 */
import { draaiVorm, parseMuur, periode, type Deken, type Muur } from '../src/puzzles/isolatie/model.ts';
import { solve } from '../src/puzzles/isolatie/solver.ts';

type V = [number, number][];
const BOEK: { naam: string; rc: number; vorm: V }[] = [
  { naam: 'SNIPPER', rc: 6, vorm: [[0, 0]] },
  { naam: 'STROOK 1x2', rc: 20, vorm: [[0, 0], [1, 0]] },
  { naam: 'STROOK 1x3', rc: 30, vorm: [[0, 0], [1, 0], [2, 0]] },
  { naam: 'HOEKJE', rc: 36, vorm: [[0, 0], [1, 0], [0, 1]] },
  { naam: 'PLAAT 2x2', rc: 44, vorm: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  { naam: 'L-STUK', rc: 60, vorm: [[0, 0], [1, 0], [2, 0], [0, 1]] },
  { naam: 'J-STUK', rc: 60, vorm: [[0, 0], [1, 0], [2, 0], [2, 1]] },
  { naam: 'T-STUK', rc: 56, vorm: [[0, 0], [1, 0], [2, 0], [1, 1]] },
  { naam: 'Z-STUK', rc: 64, vorm: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  { naam: 'S-STUK', rc: 64, vorm: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  { naam: 'P-STUK', rc: 72, vorm: [[0, 0], [1, 0], [0, 1], [1, 1], [2, 0]] },
  { naam: 'PLAAT 2x3', rc: 66, vorm: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]] },
  { naam: 'LANGE L', rc: 80, vorm: [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1]] },
  { naam: 'U-STUK', rc: 78, vorm: [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1]] },
];

function rng(seed: number): () => number {
  let s = seed || 1;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

const [rowsArg, sparesArg, pogingenArg, seedArg] = process.argv.slice(2);
const rows = rowsArg!.split('/');
const W = rows[0]!.length;
const H = rows.length;
const next = rng(Number(seedArg ?? 1));

/** A random exact tiling, biggest shapes tried first so the stack stays short. */
function tegel(): number[] | null {
  const vol = rows.flatMap((r) => [...r].map((c) => c !== '#'));
  const gekozen: number[] = [];
  for (;;) {
    const cel = vol.indexOf(false);
    if (cel < 0) return gekozen;
    const opties: { b: number; cellen: number[] }[] = [];
    BOEK.forEach((b, bi) => {
      for (let k = 0; k < periode(b.vorm); k++) {
        const vorm = draaiVorm(b.vorm, k);
        for (const [ax, ay] of vorm) {
          const x0 = (cel % W) - ax;
          const y0 = Math.floor(cel / W) - ay;
          const cellen = vorm.map(([dx, dy]) => [x0 + dx, y0 + dy] as const);
          if (cellen.every(([x, y]) => x >= 0 && y >= 0 && x < W && y < H && !vol[y * W + x])) {
            opties.push({ b: bi, cellen: cellen.map(([x, y]) => y * W + x) });
          }
        }
      }
    });
    if (opties.length === 0) return null;
    // Weighted towards the bigger batts.
    const gewicht = opties.map((o) => BOEK[o.b]!.vorm.length ** 3);
    let r = next() * gewicht.reduce((a, b) => a + b, 0);
    let keuze = opties[0]!;
    for (let i = 0; i < opties.length; i++) { r -= gewicht[i]!; if (r <= 0) { keuze = opties[i]!; break; } }
    for (const c of keuze.cellen) vol[c] = true;
    gekozen.push(keuze.b);
  }
}

/** How many distinct fills reach the target. Identical batts count once. */
function tel(muur: Muur, max: number): number {
  const size = W * H;
  const soort = muur.dekens.map((d) => `${d.rc}:${draaiVorm(d.vorm, 0).join(';')}`);
  const bedekt = new Uint8Array(size);
  const gebruikt = new Uint8Array(muur.dekens.length);
  let n = 0;
  let nodes = 0;
  const zoek = (rc: number): void => {
    if (n >= max || ++nodes > 3_000_000) { n = max; return; }
    let cel = -1;
    for (let i = 0; i < size; i++) if (muur.doel[i] && !bedekt[i]) { cel = i; break; }
    if (cel < 0) { if (rc >= muur.doelRc) n++; return; }
    const gehad = new Set<string>();
    muur.dekens.forEach((d, di) => {
      if (gebruikt[di] || gehad.has(soort[di]!)) return;
      gehad.add(soort[di]!);
      for (let k = 0; k < periode(d.vorm); k++) {
        const vorm = draaiVorm(d.vorm, k);
        const [ax, ay] = vorm[0]!;          // sorted: first cell is the top-left one
        const x0 = (cel % W) - ax;
        const y0 = Math.floor(cel / W) - ay;
        const cellen: number[] = [];
        let past = true;
        for (const [dx, dy] of vorm) {
          const x = x0 + dx;
          const y = y0 + dy;
          if (x < 0 || y < 0 || x >= W || y >= H || !muur.doel[y * W + x] || bedekt[y * W + x]) { past = false; break; }
          cellen.push(y * W + x);
        }
        if (!past) continue;
        for (const c of cellen) bedekt[c] = 1;
        gebruikt[di] = 1;
        zoek(rc + d.rc);
        gebruikt[di] = 0;
        for (const c of cellen) bedekt[c] = 0;
      }
    });
  };
  zoek(0);
  return n;
}

let beste: { dekens: Deken[]; par: number; doel: number; manieren: number } | null = null;
for (let t = 0; t < Number(pogingenArg); t++) {
  const basis = tegel();
  if (!basis || basis.length + Number(sparesArg) > 12 || basis.length < 5) continue;
  const spares = Array.from({ length: Number(sparesArg) }, () => 1 + Math.floor(next() * (BOEK.length - 1)));
  const lijst = [...basis.map((b, i) => ({ b, id: `D${i}` })), ...spares.map((b, i) => ({ b, id: `X${i}` }))];
  // Shuffled, so the stack does not give away which ones were the answer.
  for (let i = lijst.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [lijst[i], lijst[j]] = [lijst[j]!, lijst[i]!]; }
  const dekens: Deken[] = lijst.map(({ b }, i) => ({ id: `D${i}`, naam: BOEK[b]!.naam, rc: BOEK[b]!.rc, vorm: BOEK[b]!.vorm }));
  let par: number;
  try { par = solve(parseMuur(rows, dekens, 0)).par; } catch { continue; }
  const doel = par - 4;
  const manieren = tel(parseMuur(rows, dekens, doel), 40);
  if (manieren >= 40) continue;
  const soorten = new Set(dekens.map((d) => d.naam)).size;
  if (soorten < 5) continue;
  if (!beste || manieren < beste.manieren) beste = { dekens, par, doel, manieren };
  if (beste.manieren <= 2) break;
}
if (!beste) console.log('niets');
else {
  console.log(`par ${beste.par}  doel ${beste.doel}  ${beste.manieren} manieren  ${beste.dekens.length} dekens`);
  for (const d of beste.dekens) console.log(`        deken('${d.id}', '${d.naam}', ${d.rc}, ${JSON.stringify(d.vorm)}),`);
}
