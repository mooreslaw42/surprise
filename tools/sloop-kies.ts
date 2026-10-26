import { SURFACES } from '../src/data/house.ts';
import { surfaceToRows, metLeidingen, type Leidingen } from '../src/puzzles/sloop/generate.ts';
import {
  CELL, TOOLS, cloneGrid, parseGrid, steenCount, swing, isLegal,
} from '../src/puzzles/sloop/model.ts';
import { solve } from '../src/puzzles/sloop/solver.ts';

type Grid = ReturnType<typeof parseGrid>;

/** Always take the biggest bite available. */
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
          const won = voor - steenCount(probe);
          if (won > beste) { beste = won; keus = { tool, x, y }; }
        }
      }
    }
    if (!keus || beste <= 0) break;
    swing(g, keus.tool, keus.x, keus.y);
    n++;
  }
  return steenCount(g) === 0 ? n : 99;
}

/** Work along the bottom with the big hammer, which is what a person does. */
function vanOnderaf(grid: Grid): number {
  const g = cloneGrid(grid);
  let n = 0;
  while (steenCount(g) > 0 && n < 60) {
    let doel = -1;
    for (let y = g.height - 1; y >= 0 && doel < 0; y--) {
      for (let x = 0; x < g.width; x++) {
        if (g.cells[y * g.width + x] === CELL.STEEN) { doel = y * g.width + x; break; }
      }
    }
    if (doel < 0) break;
    const dx = doel % g.width;
    const dy = Math.floor(doel / g.width);
    let gedaan = false;
    for (const tool of [TOOLS[2]!, TOOLS[1]!, TOOLS[0]!]) {
      for (const ox of [0, 1, -1]) {
        for (const oy of [0, -1]) {
          if (gedaan) continue;
          if (!isLegal(g, tool, dx + ox, dy + oy)) continue;
          if (swing(g, tool, dx + ox, dy + oy)) { gedaan = true; n++; }
        }
      }
    }
    if (!gedaan) break;
  }
  return steenCount(g) === 0 ? n : 99;
}

const DOELWANDEN = process.argv.slice(2);
for (const id of DOELWANDEN) {
  const surface = SURFACES.find((s) => s.id === id)!;
  const basis = surfaceToRows(surface);
  const breedte = basis[0]!.length;
  let beste: { score: number; par: number; g: number; o: number; l: Leidingen } | null = null;

  for (const gasKolom of [-1, ...Array.from({ length: breedte }, (_, i) => i)]) {
    for (const gasH of [4, 5, 6]) {
      for (const kabelRij of [-1, 3, 4, 5]) {
        for (const kabelVan of [1, 3, Math.floor(breedte / 2), breedte - 9]) {
          if (kabelVan < 0) continue;
          const l: Leidingen = {
            ...(gasKolom >= 0 ? { gas: { kolom: gasKolom, hoogte: gasH } } : {}),
            ...(kabelRij >= 0
              ? { kabel: { rij: kabelRij, van: kabelVan, tot: Math.min(breedte - 2, kabelVan + 7) } }
              : {}),
          };
          const grid = parseGrid(metLeidingen(basis, l));
          let par = -1;
          try { par = solve(grid).par; } catch { continue; }
          if (par < 6 || par > 13) continue;
          const g = gulzig(grid);
          const o = vanOnderaf(grid);
          if (g === 99 || o === 99) continue;
          const score = (g - par) + (o - par);
          if (!beste || score > beste.score || (score === beste.score && par > beste.par)) {
            beste = { score, par, g, o, l };
          }
        }
      }
    }
  }
  console.log(id.padEnd(24), beste
    ? `par ${String(beste.par).padStart(2)}  gulzig ${beste.g}  vanonderaf ${beste.o}   ${JSON.stringify(beste.l)}`
    : 'niets gevonden');
}
