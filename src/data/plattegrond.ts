/**
 * The footprint, coarsened to a grid of roughly a metre.
 *
 * Pim's floor plan, laid on its side so it fits a wide screen: north is to
 * the left and the garden side is along the top. Three rooms in a row. The
 * woonkamer is 4,5 by 5 m, the keuken 3 by 5,5 m and flush with the
 * woonkamer on the garden side, the tv-kamer 4,5 by 3 m. The gap under the
 * keuken is the hall, which is not part of the job.
 */

export const PLATTEGROND = {
  width: 14,
  height: 5,
  /** '#' inside the house, '.' outside it. */
  rows: [
    '##############',
    '##############',
    '##############',
    '#####......###',
    '#####......###',
  ],
  ruimtes: [
    { naam: 'WOONKAMER', x: 0, y: 0, w: 5, h: 5 },
    { naam: 'KEUKEN', x: 5, y: 0, w: 6, h: 3 },
    { naam: 'TV-KAMER', x: 11, y: 0, w: 3, h: 5 },
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
