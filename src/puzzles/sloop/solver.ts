import { CELL, TOOLS, type Grid, type Tool, isLegal, footprint } from './model.ts';

/**
 * Exact minimum-swing solver, used to compute par and to verify every shipped
 * level. Branch and bound over set cover: always expand the rubble cell with
 * the fewest covering swings, and prune on the obvious bound of how much one
 * swing can clear.
 *
 * A level that ships unsolvable, or with a par nobody can reach, would be a
 * disaster on 5 December, so this runs over the whole manifest in the tests.
 */

export type Swing = { readonly tool: Tool; readonly x: number; readonly y: number };

type Candidate = {
  readonly swing: Swing;
  /** Indices into the rubble list that this swing clears. */
  readonly covers: number[];
};

function candidates(grid: Grid): { rubble: number[]; list: Candidate[] } {
  const rubble: number[] = [];
  const bitOf = new Map<number, number>();
  for (let i = 0; i < grid.cells.length; i++) {
    if (grid.cells[i] === CELL.PUIN) {
      bitOf.set(i, rubble.length);
      rubble.push(i);
    }
  }

  const seen = new Map<string, Candidate>();
  for (const tool of TOOLS) {
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (!isLegal(grid, tool, x, y)) continue;
        const covers: number[] = [];
        for (const i of footprint(grid, tool, x, y)) {
          const bit = bitOf.get(i);
          if (bit !== undefined) covers.push(bit);
        }
        if (covers.length === 0) continue;
        covers.sort((a, b) => a - b);
        const key = covers.join(',');
        // Identical coverage from a different tool or position is the same move.
        if (!seen.has(key)) seen.set(key, { swing: { tool, x, y }, covers });
      }
    }
  }

  // Drop any swing whose coverage is a subset of another's: never worth playing.
  const all = [...seen.values()].sort((a, b) => b.covers.length - a.covers.length);
  const list: Candidate[] = [];
  const sets: Set<number>[] = [];
  for (const c of all) {
    // Sorted by size, so anything dominating c is already in the list.
    if (sets.some((other) => c.covers.every((bit) => other.has(bit)))) continue;
    list.push(c);
    sets.push(new Set(c.covers));
  }
  return { rubble, list };
}

export type SolveResult = { par: number; moves: Swing[] };

/** Minimum number of swings, with one optimal sequence. */
export function solve(grid: Grid, limit = 40): SolveResult {
  const { rubble, list } = candidates(grid);
  const n = rubble.length;
  if (n === 0) return { par: 0, moves: [] };

  const coveredBy: number[][] = Array.from({ length: n }, () => []);
  for (let c = 0; c < list.length; c++) {
    for (const bit of list[c]!.covers) coveredBy[bit]!.push(c);
  }
  // Every rubble cell is reachable with a chisel, so this should never trip.
  for (let bit = 0; bit < n; bit++) {
    if (coveredBy[bit]!.length === 0) throw new Error(`rubble cell ${rubble[bit]} cannot be cleared`);
  }

  const maxCover = Math.max(...list.map((c) => c.covers.length));
  const open = new Uint8Array(n).fill(1);
  let remaining = n;
  const chosen: number[] = [];
  let best: number[] | null = null;

  const search = (depthLimit: number): boolean => {
    if (remaining === 0) {
      best = [...chosen];
      return true;
    }
    if (chosen.length + Math.ceil(remaining / maxCover) > depthLimit) return false;

    // Most constrained rubble cell first: fewest ways to clear it.
    let target = -1;
    let fewest = Infinity;
    for (let bit = 0; bit < n; bit++) {
      if (!open[bit]) continue;
      let ways = 0;
      for (const c of coveredBy[bit]!) {
        if (list[c]!.covers.some((b) => open[b])) ways++;
      }
      if (ways < fewest) {
        fewest = ways;
        target = bit;
        if (ways <= 1) break;
      }
    }
    if (target === -1) return false;

    for (const c of coveredBy[target]!) {
      const flipped: number[] = [];
      for (const bit of list[c]!.covers) {
        if (open[bit]) {
          open[bit] = 0;
          flipped.push(bit);
        }
      }
      if (flipped.length > 0) {
        remaining -= flipped.length;
        chosen.push(c);
        if (search(depthLimit)) return true;
        chosen.pop();
        remaining += flipped.length;
      }
      for (const bit of flipped) open[bit] = 1;
    }
    return false;
  };

  for (let depth = Math.ceil(n / maxCover); depth <= limit; depth++) {
    if (search(depth)) {
      return { par: depth, moves: best!.map((c) => list[c]!.swing) };
    }
  }
  throw new Error(`no solution within ${limit} swings`);
}
