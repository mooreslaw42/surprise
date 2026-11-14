/**
 * Ladder spots for a schilderwand: where the roller starts, where it ends,
 * and the fewest numbered spots in between that leave exactly one clean run.
 *
 * A random run over the wall first (a snake, then shuffled with backbite
 * moves until it is nobody's idea of a snake), then spots are added one at a
 * time wherever a second answer still differs from the first, until there
 * is no second answer.
 *
 *   node --experimental-strip-types tools/verf-zoek.ts <surface-id> [seed] [max punten]
 */
import { SURFACES } from '../src/data/house.ts';
import { surfaceToRows } from '../src/puzzles/sloop/generate.ts';
import { buren, parseMuur, type Muur } from '../src/puzzles/schilderen/model.ts';
import { oplossingen } from '../src/puzzles/schilderen/solver.ts';

function rng(seed: number): () => number {
  let s = seed || 1;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

const [id, seedArg, maxArg] = process.argv.slice(2);
const surface = SURFACES.find((s) => s.id === id);
if (!surface) throw new Error(`no surface ${id}`);
const rows = surfaceToRows(surface).map((r) => r.replace(/B/g, '#'));
const eersteVrij = rows[0]!.indexOf('#');
const basis = parseMuur(rows.map((r, y) => (y === 0 ? r.slice(0, eersteVrij) + 'X' + r.slice(eersteVrij + 1) : r)));
const maxPunten = Number(maxArg ?? 12);

function backbite(pad: number[], m: Muur, next: () => number, keer: number): number[] {
  let p = [...pad];
  for (let t = 0; t < keer; t++) {
    const kop = next() < 0.5;
    const eind = kop ? p[0]! : p[p.length - 1]!;
    const naast = kop ? p[1]! : p[p.length - 2]!;
    const kandidaten = buren(m, eind).filter((j) => j !== naast);
    if (kandidaten.length === 0) continue;
    const doel = kandidaten[Math.floor(next() * kandidaten.length)]!;
    const i = p.indexOf(doel);
    p = kop ? [...p.slice(0, i).reverse(), ...p.slice(i)] : [...p.slice(0, i + 1), ...p.slice(i + 1).reverse()];
  }
  return p;
}

/** How bendy a run is: turns per square. A snake scores low. */
function bochten(p: number[], w: number): number {
  let n = 0;
  for (let i = 2; i < p.length; i++) {
    if ((p[i]! - p[i - 1]!) !== (p[i - 1]! - p[i - 2]!)) n++;
  }
  void w;
  return n / p.length;
}

const snake = oplossingen(basis, 1)[0];
if (!snake) throw new Error('no run at all on this wall');

let beste: { punten: number[]; start: number; pad: number[]; bocht: number } | null = null;
for (let poging = 0; poging < 40; poging++) {
  const next = rng(Number(seedArg ?? 1) * 100 + poging);
  const pad = backbite(snake, basis, next, 6000);
  const plek = new Map(pad.map((c, i) => [c, i]));
  const start = pad[0]!;
  let punten = [pad[Math.floor(pad.length / 3)]!, pad[Math.floor((2 * pad.length) / 3)]!, pad[pad.length - 1]!];
  let uniek = false;
  try {
    while (punten.length <= maxPunten) {
      const m: Muur = { ...basis, start, punten };
      const gevonden = oplossingen(m, 2, 3_000_000);
      const ander = gevonden.find((g) => g.some((c, i) => c !== pad[i]));
      if (!ander) { uniek = true; break; }
      // Which stretch between two spots each square falls in, for a run.
      const vak = (run: number[]): Map<number, number> => {
        const uit = new Map<number, number>();
        let k = 0;
        for (const c of run) { if (punten.includes(c)) k++; uit.set(c, k); }
        return uit;
      };
      const echt = vak(pad);
      const vals = vak(ander);
      // Best: one square the other answer passes in a different stretch.
      // Making it a spot rules that answer out on its own.
      const scheef = pad.find((c) => c !== start && !punten.includes(c) && echt.get(c) !== vals.get(c));
      if (scheef !== undefined) {
        punten = [...punten, scheef];
      } else {
        // Same stretches, different order inside one: pin the two squares
        // where the answers first part company, in the order ours takes them.
        const waar = ander.findIndex((c, i) => c !== pad[i]);
        const erbij = [pad[waar]!, ander[waar]!].filter((c) => c !== start && !punten.includes(c));
        if (erbij.length === 0) break;
        punten = [...punten, ...erbij];
      }
      punten.sort((a, b) => plek.get(a)! - plek.get(b)!);
    }
  } catch {
    continue;
  }
  if (!uniek) continue;
  const bocht = bochten(pad, basis.width);
  const score = (b: { punten: number[]; bocht: number }): number => b.bocht * 10 - b.punten.length;
  if (!beste || score({ punten, bocht }) > score(beste)) beste = { punten, start, pad, bocht };
}

if (!beste) {
  console.log('niets');
} else {
  const w = basis.width;
  console.log(`${id}: ${beste.punten.length} punten, ${beste.bocht.toFixed(2)} bochten per vak`);
  console.log(`start: [${beste.start % w}, ${Math.floor(beste.start / w)}],`);
  console.log(`punten: [${beste.punten.map((c) => `[${c % w}, ${Math.floor(c / w)}]`).join(', ')}],`);
  const teken = rows.map((r) => [...r]);
  teken[Math.floor(beste.start / w)]![beste.start % w] = 'S';
  beste.punten.forEach((c, i) => { teken[Math.floor(c / w)]![c % w] = String(i + 1); });
  console.log(teken.map((r) => r.join('')).join('\n'));
}
