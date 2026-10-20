/**
 * Sloop: clear every bit of rubble without a swing ever touching something
 * that has to survive.
 *
 * Formally this is minimum set cover with forbidden cells. The hazards are
 * visible — you can see a beam — so nothing here is guesswork; the puzzle is
 * working out where the big hammer still fits and where you have to chisel.
 */

export const CELL = {
  LEEG: 0,
  PUIN: 1,
  BALK: 2,
  LEIDING: 3,
  KABEL: 4,
} as const;

export type CellValue = (typeof CELL)[keyof typeof CELL];

/** Cells that a swing must never touch. */
export function isProtected(cell: CellValue): boolean {
  return cell === CELL.BALK || cell === CELL.LEIDING || cell === CELL.KABEL;
}

export type Tool = {
  readonly id: string;
  readonly naam: string;
  /** Cells hit, relative to the aimed cell. */
  readonly offsets: readonly (readonly [number, number])[];
};

const square: (readonly [number, number])[] = [];
for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) square.push([dx, dy]);

export const TOOLS: readonly Tool[] = [
  { id: 'beitel', naam: 'BEITEL', offsets: [[0, 0]] },
  { id: 'breekijzer', naam: 'BREEKIJZER', offsets: [[-1, 0], [0, 0], [1, 0]] },
  { id: 'voorhamer', naam: 'VOORHAMER', offsets: square },
];

export function toolById(id: string): Tool {
  const tool = TOOLS.find((t) => t.id === id);
  if (!tool) throw new Error(`unknown tool ${id}`);
  return tool;
}

export type Grid = {
  readonly width: number;
  readonly height: number;
  readonly cells: CellValue[];
};

const CHARS: Record<string, CellValue> = {
  '.': CELL.LEEG,
  '#': CELL.PUIN,
  B: CELL.BALK,
  L: CELL.LEIDING,
  K: CELL.KABEL,
};

/** Levels are authored as ASCII art; '#' is rubble, 'B'/'L'/'K' must survive. */
export function parseGrid(rows: readonly string[]): Grid {
  if (rows.length === 0) throw new Error('empty level');
  const width = rows[0]!.length;
  const cells: CellValue[] = [];
  for (const row of rows) {
    if (row.length !== width) throw new Error(`ragged level: "${row}" is not ${width} wide`);
    for (const ch of row) {
      const cell = CHARS[ch];
      if (cell === undefined) throw new Error(`unknown cell "${ch}"`);
      cells.push(cell);
    }
  }
  return { width, height: rows.length, cells };
}

export function cloneGrid(grid: Grid): Grid {
  return { width: grid.width, height: grid.height, cells: [...grid.cells] };
}

export function at(grid: Grid, x: number, y: number): CellValue | undefined {
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) return undefined;
  return grid.cells[y * grid.width + x];
}

/** Cells a swing would hit, clipped to the wall. */
export function footprint(grid: Grid, tool: Tool, x: number, y: number): number[] {
  const out: number[] = [];
  for (const [dx, dy] of tool.offsets) {
    const px = x + dx;
    const py = y + dy;
    if (px < 0 || py < 0 || px >= grid.width || py >= grid.height) continue;
    out.push(py * grid.width + px);
  }
  return out;
}

/** A swing is legal when its whole footprint avoids everything protected. */
export function isLegal(grid: Grid, tool: Tool, x: number, y: number): boolean {
  if (at(grid, x, y) === undefined) return false;
  return footprint(grid, tool, x, y).every((i) => !isProtected(grid.cells[i]!));
}

/** Returns how much rubble the swing removed, or -1 if it was not legal. */
export function swing(grid: Grid, tool: Tool, x: number, y: number): number {
  if (!isLegal(grid, tool, x, y)) return -1;
  let cleared = 0;
  for (const i of footprint(grid, tool, x, y)) {
    if (grid.cells[i] === CELL.PUIN) {
      grid.cells[i] = CELL.LEEG;
      cleared++;
    }
  }
  return cleared;
}

export function rubbleCount(grid: Grid): number {
  let n = 0;
  for (const cell of grid.cells) if (cell === CELL.PUIN) n++;
  return n;
}

export function isSolved(grid: Grid): boolean {
  return rubbleCount(grid) === 0;
}

/** Three stars at par, two within two swings of it, one for finishing at all. */
export function stars(swings: number, par: number): number {
  if (swings <= par) return 3;
  if (swings <= par + 2) return 2;
  return 1;
}
