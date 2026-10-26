/**
 * The footprint, coarsened to a grid.
 *
 * Taken from the lidar scan by tools/footprint.py, which rasterises the
 * points just above floor level — the slab, rather than the furniture
 * standing on it. The house is an L: a long block with a wing, and a corner
 * that is not part of it.
 *
 * PROVISIONAL, like the wall data: the shape is measured, the room names are
 * still a guess.
 */

export const PLATTEGROND = {
  width: 10,
  height: 6,
  /** '#' inside the house, '.' outside it. */
  rows: [
    '##########',
    '##########',
    '##########',
    '##########',
    '.....#####',
    '.....#####',
  ],
  ruimtes: [
    { naam: 'WOONKAMER', x: 0, y: 0, w: 5, h: 4 },
    { naam: 'KEUKEN', x: 5, y: 0, w: 5, h: 3 },
    { naam: 'TV-KAMER', x: 5, y: 3, w: 5, h: 3 },
  ],
} as const;

export type Ruimte = (typeof PLATTEGROND.ruimtes)[number];

export function binnenshuis(x: number, y: number): boolean {
  return PLATTEGROND.rows[y]?.[x] === '#';
}

export function ruimteOp(x: number, y: number): Ruimte | undefined {
  return PLATTEGROND.ruimtes.find(
    (r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h,
  );
}
