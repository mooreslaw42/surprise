import type { Opening, Surface } from '../../data/house.ts';

/**
 * Turn a measured surface into a Sloop level.
 *
 * The wall is rubble, the window and door openings are already open, and each
 * opening carries a lintel across its head — which is exactly the thing you
 * must not hit, and exactly where a real one sits.
 */
export const CELL_M = 0.35;

export type Extent = { c0: number; c1: number; r0: number; r1: number };

export function gridSize(surface: Surface, cell = CELL_M): { cols: number; rows: number } {
  return {
    cols: Math.max(4, Math.round(surface.width / cell)),
    rows: Math.max(4, Math.round(surface.height / cell)),
  };
}

/**
 * Which cells an opening occupies. Shared with the tests so that there is one
 * definition of where a window is, rather than two that can disagree — the
 * first version of this had the generator and its test rounding differently
 * for any opening narrower than a cell.
 */
export function openingCells(surface: Surface, opening: Opening, cell = CELL_M): Extent | null {
  const { cols, rows } = gridSize(surface, cell);
  const c0 = Math.max(0, Math.round(opening.x / cell));
  const c1 = Math.min(cols - 1, Math.max(c0, Math.round((opening.x + opening.w) / cell) - 1));
  // Row 0 is the top of the wall, so height counts the other way.
  const r1 = Math.min(rows - 1, rows - Math.round(opening.y / cell) - 1);
  const r0 = Math.max(0, Math.min(r1, rows - Math.round((opening.y + opening.h) / cell)));
  if (c1 < c0 || r1 < r0) return null;
  return { c0, c1, r0, r1 };
}

export function surfaceToRows(surface: Surface, cell = CELL_M): string[] {
  const { cols, rows } = gridSize(surface, cell);
  const grid: string[][] = Array.from({ length: rows }, () => Array(cols).fill('#'));

  for (const opening of surface.openings) {
    const extent = openingCells(surface, opening, cell);
    if (!extent) continue;
    for (let r = extent.r0; r <= extent.r1; r++) {
      for (let c = extent.c0; c <= extent.c1; c++) grid[r]![c] = '.';
    }
    // Latei: one course of timber across the head, overhanging each side.
    const lintel = extent.r0 - 1;
    if (lintel >= 0) {
      for (let c = Math.max(0, extent.c0 - 1); c <= Math.min(cols - 1, extent.c1 + 1); c++) {
        grid[lintel]![c] = 'B';
      }
    }
  }
  return grid.map((row) => row.join(''));
}

/**
 * What runs through the wall and is not coming out with it.
 *
 * These are the reason the stage is not just "hit the bottom and stand
 * back": anything protected holds up the brick above it for good, so a
 * gasleiding is an umbrella with a column of wall standing dry underneath
 * it, and that column has to be taken down a bit at a time, by hand, with
 * the hammer you cannot swing near a gasleiding.
 */
export type Leidingen = {
  /** Gas, rising out of the floor: column, and how many courses up. */
  readonly gas?: { readonly kolom: number; readonly hoogte: number };
  /** The one cable, run horizontally at socket height. */
  readonly kabel?: { readonly rij: number; readonly van: number; readonly tot: number };
  /** A drop from the ceiling down to a switch. */
  readonly val?: { readonly kolom: number; readonly tot: number };
};

/** Lay the services into a wall. They only ever go into brick, never a hole. */
export function metLeidingen(rows: readonly string[], leidingen: Leidingen): string[] {
  const grid = rows.map((r) => [...r]);
  const hoogte = grid.length;
  const breedte = grid[0]?.length ?? 0;
  const zet = (x: number, y: number, ch: string) => {
    if (x < 0 || y < 0 || x >= breedte || y >= hoogte) return;
    if (grid[y]![x] !== '#') return;
    grid[y]![x] = ch;
  };

  if (leidingen.gas) {
    const { kolom, hoogte: h } = leidingen.gas;
    for (let y = hoogte - 1; y >= hoogte - h; y--) zet(kolom, y, 'L');
  }
  if (leidingen.kabel) {
    const { rij, van, tot } = leidingen.kabel;
    for (let x = van; x <= tot; x++) zet(x, rij, 'K');
  }
  if (leidingen.val) {
    const { kolom, tot } = leidingen.val;
    for (let y = 0; y <= tot; y++) zet(kolom, y, 'K');
  }
  return grid.map((r) => r.join(''));
}
