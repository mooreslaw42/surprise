import { SURFACES } from '../src/data/house.ts';
import { surfaceToRows, metLeidingen, type Leidingen } from '../src/puzzles/sloop/generate.ts';
import { CELL, TOOLS, cloneGrid, instorten, parseGrid, steenCount, swing, isLegal, footprint } from '../src/puzzles/sloop/model.ts';
import { solve } from '../src/puzzles/sloop/solver.ts';

/** Whack the best-looking swing every time. If this equals par, it is not a puzzle. */
function greedy(grid: ReturnType<typeof parseGrid>): number {
  const g = cloneGrid(grid);
  let n = 0;
  while (steenCount(g) > 0 && n < 60) {
    let beste = -1;
    let bestSwing: { tool: typeof TOOLS[number]; x: number; y: number } | null = null;
    for (const tool of TOOLS) {
      for (let y = 0; y < g.height; y++) {
        for (let x = 0; x < g.width; x++) {
          if (!isLegal(g, tool, x, y)) continue;
          const probe = cloneGrid(g);
          const voor = steenCount(probe);
          if (!swing(probe, tool, x, y)) continue;
          const won = voor - steenCount(probe);
          if (won > beste) { beste = won; bestSwing = { tool, x, y }; }
        }
      }
    }
    if (!bestSwing || beste <= 0) break;
    swing(g, bestSwing.tool, bestSwing.x, bestSwing.y);
    n++;
  }
  return steenCount(g) === 0 ? n : -1;
}

const LEIDINGEN: Record<string, Leidingen> = {
  'woonkamer-tuinwand': { kabel: { rij: 5, van: 2, tot: 11 } },
  'keuken-achterwand': { gas: { kolom: 9, hoogte: 5 }, kabel: { rij: 5, van: 11, tot: 16 } },
  'woonkamer-binnenmuur': { val: { kolom: 8, tot: 4 }, kabel: { rij: 5, van: 1, tot: 7 } },
  'keuken-zijwand': { gas: { kolom: 3, hoogte: 6 } },
  'tvkamer-tuinwand': { kabel: { rij: 5, van: 1, tot: 8 } },
  'woonkamer-haardwand': { gas: { kolom: 4, hoogte: 5 }, kabel: { rij: 5, van: 6, tot: 11 } },
  'keuken-raamwand': { gas: { kolom: 11, hoogte: 6 } },
  'tvkamer-zijwand': { val: { kolom: 3, tot: 4 }, kabel: { rij: 5, van: 5, tot: 9 } },
  'tvkamer-kopgevel': { val: { kolom: 6, tot: 5 } },
};

for (const surface of SURFACES) {
  const grid = parseGrid(metLeidingen(surfaceToRows(surface), LEIDINGEN[surface.id] ?? {}));
  const stenen = steenCount(grid);
  const stabiel = cloneGrid(grid);
  const golven = instorten(stabiel);
  const t0 = Date.now();
  let par = -1;
  let fout = '';
  try { par = solve(grid).par; } catch (e) { fout = String((e as Error).message); }
  const ms = Date.now() - t0;
  const gr = greedy(grid);
  console.log(
    `${surface.id.padEnd(24)} ${grid.width}x${grid.height}`.padEnd(36),
    `stenen ${String(stenen).padStart(3)}`,
    `los-bij-start ${golven.flat().length}`.padEnd(18),
    `par ${String(par).padStart(3)}`,
    `greedy ${String(gr).padStart(3)}`,
    `${ms}ms`, fout);
}
