import {
  CELL, TOOLS, type Grid, type Tool,
  cloneGrid, footprint, instorten, isLegal, onwrikbaar, steenCount,
} from './model.ts';

/**
 * Exact minimum-swing solver, used to set par and to prove every shipped
 * wall can be brought down at all.
 *
 * The thing that makes this tractable is that order does not matter. A swing
 * only ever takes cells away, and collapse only ever takes cells away, so
 * playing a set of swings in any order leaves the same wall standing. What
 * is being searched is therefore a set, not a sequence.
 *
 * And the set has a handle on it: at any moment some bricks are sitting on
 * the ground or on something protected, and those can never fall by
 * themselves. Every one of them has to be hit. Branching on the most awkward
 * of those — the one with the fewest swings that reach it — is both complete
 * and tight, because any solution must contain one of them.
 */

export type Swing = { readonly tool: Tool; readonly x: number; readonly y: number };
export type SolveResult = { par: number; moves: Swing[] };

const NODE_BUDGET = 400_000;

/** Every legal swing, with the bricks it takes out itself. */
function alleKlappen(grid: Grid): { swing: Swing; raakt: number[] }[] {
  const out: { swing: Swing; raakt: number[] }[] = [];
  for (const tool of TOOLS) {
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (!isLegal(grid, tool, x, y)) continue;
        out.push({ swing: { tool, x, y }, raakt: footprint(grid, tool, x, y) });
      }
    }
  }
  return out;
}

/**
 * How many swings this wall needs at the very least: every brick that cannot
 * fall on its own has to be hit, and one swing covers at most three columns
 * and three rows, so bricks further apart than that need separate swings.
 */
function ondergrens(grid: Grid): number {
  const vast = onwrikbaar(grid);
  if (vast.length === 0) return steenCount(grid) > 0 ? 1 : 0;
  const punten = vast.map((i) => ({ x: i % grid.width, y: Math.floor(i / grid.width) }))
    .sort((a, b) => a.x - b.x || a.y - b.y);
  const gekozen: { x: number; y: number }[] = [];
  for (const p of punten) {
    if (gekozen.some((q) => Math.abs(q.x - p.x) <= 2 && Math.abs(q.y - p.y) <= 2)) continue;
    gekozen.push(p);
  }
  return gekozen.length;
}

export function solve(grid: Grid, limit = 30): SolveResult {
  const start = cloneGrid(grid);
  // A wall that was authored unstable would make par meaningless.
  instorten(start);
  if (steenCount(start) === 0) return { par: 0, moves: [] };

  const klappen = alleKlappen(start);
  let nodes = 0;
  let best: Swing[] | null = null;

  const zoek = (staat: Grid, gedaan: Swing[], diepte: number): boolean => {
    if (steenCount(staat) === 0) {
      best = [...gedaan];
      return true;
    }
    if (++nodes > NODE_BUDGET) return false;
    if (gedaan.length + ondergrens(staat) > diepte) return false;

    // The brick that has to be hit and is hardest to reach: fewest swings
    // land on it, so it splits the search into the fewest branches.
    let doel = -1;
    let keuzes: typeof klappen = [];
    for (const i of onwrikbaar(staat)) {
      const raken = klappen.filter((k) => k.raakt.includes(i));
      if (doel < 0 || raken.length < keuzes.length) {
        doel = i;
        keuzes = raken;
        if (raken.length <= 1) break;
      }
    }
    if (doel < 0 || keuzes.length === 0) return false;

    // Two swings that take out the same bricks are the same move.
    const gezien = new Set<string>();
    const beurten = keuzes.map((k) => {
      const na = cloneGrid(staat);
      const weg: number[] = [];
      for (const i of k.raakt) {
        if (na.cells[i] === CELL.STEEN) { na.cells[i] = CELL.LEEG; weg.push(i); }
      }
      instorten(na);
      return { k, na, over: steenCount(na), sleutel: weg.join(',') };
    }).filter((b) => {
      if (gezien.has(b.sleutel)) return false;
      gezien.add(b.sleutel);
      return true;
    // Most wall brought down first: the answer is usually near the front.
    }).sort((a, b) => a.over - b.over);

    for (const beurt of beurten) {
      gedaan.push(beurt.k.swing);
      if (zoek(beurt.na, gedaan, diepte)) return true;
      gedaan.pop();
      if (nodes > NODE_BUDGET) return false;
    }
    return false;
  };

  for (let diepte = ondergrens(start); diepte <= limit; diepte++) {
    nodes = 0;
    if (zoek(start, [], diepte)) return { par: diepte, moves: best! };
    if (nodes > NODE_BUDGET) throw new Error(`sloop solver gave up at depth ${diepte}`);
  }
  throw new Error(`no way to bring this wall down within ${limit} swings`);
}

/**
 * The next swing of an optimal line from where the player is now. Recomputed
 * rather than replayed, so a hint stays optimal after the player has gone
 * off down their own path.
 */
export function volgende(grid: Grid): Swing | null {
  return solve(grid).moves[0] ?? null;
}
