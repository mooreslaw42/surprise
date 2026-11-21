/**
 * The first Sloop wall has no gas in it, only a cable drop, so the sweep in
 * sloop-kies.ts does not cover it. This one tries every drop and every short
 * cable on one wall and prints the ones where greed loses.
 *
 *   node --experimental-strip-types tools/sloop-val.ts <surface id>
 */
import { SURFACES } from '../src/data/house.ts';
import { surfaceToRows, metLeidingen, type Leidingen } from '../src/puzzles/sloop/generate.ts';
import { TOOLS, cloneGrid, parseGrid, steenCount, swing, isLegal } from '../src/puzzles/sloop/model.ts';
import { solve } from '../src/puzzles/sloop/solver.ts';

type Grid = ReturnType<typeof parseGrid>;

function gulzig(grid: Grid): number {
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
          if (voor - steenCount(probe) > beste) { beste = voor - steenCount(probe); keus = { tool, x, y }; }
        }
      }
    }
    if (!keus || beste <= 0) break;
    swing(g, keus.tool, keus.x, keus.y);
    n++;
  }
  return steenCount(g) === 0 ? n : 99;
}

const surface = SURFACES.find((s) => s.id === process.argv[2])!;
const basis = surfaceToRows(surface);
const breedte = basis[0]!.length;
for (let kolom = 0; kolom < breedte; kolom++) {
  for (let tot = 1; tot <= 5; tot++) {
    for (const kabel of [null, 3, 4, 5]) {
      for (const van of [0, 1, 2, 5, 6]) {
        if (kabel === null && van > 0) continue;
        const l: Leidingen = {
          val: { kolom, tot },
          ...(kabel !== null ? { kabel: { rij: kabel, van, tot: van + 2 } } : {}),
        };
        const grid = parseGrid(metLeidingen(basis, l));
        let par: number;
        try { par = solve(grid).par; } catch { continue; }
        const g = gulzig(grid);
        const stenen = steenCount(grid);
        if (g === 99 || g <= par || stenen / par < 4) continue;
        console.log(`par ${par} gulzig ${g} stenen/klap ${(stenen / par).toFixed(1)} ${JSON.stringify(l)}`);
      }
    }
  }
}
