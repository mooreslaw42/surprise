import { SURFACES } from '../src/data/house.ts';
import { surfaceToRows, metLeidingen, type Leidingen } from '../src/puzzles/sloop/generate.ts';
import { TOOLS, cloneGrid, parseGrid, steenCount, swing, isLegal } from '../src/puzzles/sloop/model.ts';
import { solve } from '../src/puzzles/sloop/solver.ts';

function greedy(grid: ReturnType<typeof parseGrid>): number {
  const g = cloneGrid(grid);
  let n = 0;
  while (steenCount(g) > 0 && n < 60) {
    let beste = -1;
    let keus: { tool: typeof TOOLS[number]; x: number; y: number } | null = null;
    for (const tool of TOOLS) {
      for (let y = 0; y < g.height; y++) {
        for (let x = 0; x < g.width; x++) {
          if (!isLegal(g, tool, x, y)) continue;
          const probe = cloneGrid(g);
          const voor = steenCount(probe);
          if (!swing(probe, tool, x, y)) continue;
          const won = voor - steenCount(probe);
          if (won > beste) { beste = won; keus = { tool, x, y }; }
        }
      }
    }
    if (!keus || beste <= 0) break;
    swing(g, keus.tool, keus.x, keus.y);
    n++;
  }
  return steenCount(g) === 0 ? n : -1;
}

/** Sweep the services over a wall and report where greedy goes wrong. */
const id = process.argv[2]!;
const surface = SURFACES.find((s) => s.id === id)!;
const basis = surfaceToRows(surface);
const breedte = basis[0]!.length;
const resultaten: { par: number; gr: number; l: Leidingen }[] = [];

for (const gasKolom of [-1, ...Array.from({ length: breedte }, (_, i) => i)]) {
  for (const kabelRij of [-1, 3, 4, 5]) {
    for (const kabelVan of [1, Math.floor(breedte / 3), Math.floor(breedte / 2)]) {
      const l: Leidingen = {
        ...(gasKolom >= 0 ? { gas: { kolom: gasKolom, hoogte: 5 } } : {}),
        ...(kabelRij >= 0 ? { kabel: { rij: kabelRij, van: kabelVan, tot: Math.min(breedte - 2, kabelVan + 7) } } : {}),
      };
      const grid = parseGrid(metLeidingen(basis, l));
      let par = -1;
      try { par = solve(grid).par; } catch { continue; }
      const gr = greedy(grid);
      if (gr > 0) resultaten.push({ par, gr, l });
    }
  }
}

resultaten.sort((a, b) => (b.gr - b.par) - (a.gr - a.par) || b.par - a.par);
for (const r of resultaten.slice(0, 6)) {
  console.log(`par ${String(r.par).padStart(2)} greedy ${String(r.gr).padStart(2)} (+${r.gr - r.par})`, JSON.stringify(r.l));
}
