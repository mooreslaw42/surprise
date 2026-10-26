/**
 * Sloop: bring the wall down without a swing ever touching something that
 * has to survive.
 *
 * The wall is masonry and masonry falls over. A brick stands as long as
 * there is something solid under it or under one of its shoulders — that is
 * half-bond, and it is why a hole in a wall closes up into a triangle as it
 * rises instead of running to the ceiling. Take out three and one brick
 * follows; take out the whole course and the wall has nothing left to stand
 * on and comes down in one go.
 *
 * So the swing count is not the number of bricks over the size of the
 * hammer. It is the number of places you have to hit before the wall does
 * the rest of the work, and those places are not where you would guess: a
 * wide bite low down is worth far more than a deep one, two swings side by
 * side far more than two swings apart, and a gasleiding is an umbrella with
 * a column of wall standing dry underneath it.
 */

export const CELL = {
  LEEG: 0,
  STEEN: 1,
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
  '#': CELL.STEEN,
  B: CELL.BALK,
  L: CELL.LEIDING,
  K: CELL.KABEL,
};

/** Levels are authored as ASCII art; '#' is brick, 'B'/'L'/'K' must survive. */
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

/**
 * Something a brick can rest on. The ground under the wall counts; the air
 * past either end does not, so a wall is not held up by its neighbours.
 */
export function vast(grid: Grid, x: number, y: number): boolean {
  if (y >= grid.height) return true;
  if (x < 0 || x >= grid.width || y < 0) return false;
  return grid.cells[y * grid.width + x] !== CELL.LEEG;
}

/** Half-bond: a brick sits on two, so either shoulder will hold it. */
export function stabiel(grid: Grid, x: number, y: number): boolean {
  return vast(grid, x - 1, y + 1) || vast(grid, x, y + 1) || vast(grid, x + 1, y + 1);
}

/**
 * Let go of everything that is no longer holding on, over and over until the
 * wall stops moving. Returns what came down, newest course last, so the
 * scene can drop it in waves rather than all at once.
 */
export function instorten(grid: Grid): number[][] {
  const golven: number[][] = [];
  for (;;) {
    const los: number[] = [];
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const i = y * grid.width + x;
        if (grid.cells[i] !== CELL.STEEN) continue;
        if (!stabiel(grid, x, y)) los.push(i);
      }
    }
    if (los.length === 0) return golven;
    for (const i of los) grid.cells[i] = CELL.LEEG;
    golven.push(los);
  }
}

export type Klap = {
  /** Bricks the hammer itself took out. */
  readonly geraakt: number[];
  /** What then came down by itself, in waves. */
  readonly gevallen: number[][];
};

/** Swing, then stand back. Null when the swing was not allowed. */
export function swing(grid: Grid, tool: Tool, x: number, y: number): Klap | null {
  if (!isLegal(grid, tool, x, y)) return null;
  const geraakt: number[] = [];
  for (const i of footprint(grid, tool, x, y)) {
    if (grid.cells[i] === CELL.STEEN) {
      grid.cells[i] = CELL.LEEG;
      geraakt.push(i);
    }
  }
  if (geraakt.length === 0) return null;
  return { geraakt, gevallen: instorten(grid) };
}

export function steenCount(grid: Grid): number {
  let n = 0;
  for (const cell of grid.cells) if (cell === CELL.STEEN) n++;
  return n;
}

/**
 * Bricks that can never come down on their own, because what is under them
 * is the ground or something that is staying. Every one of these has to be
 * hit, which is what the solver counts from and what the hint points at.
 */
export function onwrikbaar(grid: Grid): number[] {
  const out: number[] = [];
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const i = y * grid.width + x;
      if (grid.cells[i] !== CELL.STEEN) continue;
      for (const dx of [-1, 0, 1]) {
        if (blijvend(grid, x + dx, y + 1)) { out.push(i); break; }
      }
    }
  }
  return out;
}

/** Ground, or something protected: support that no swing can ever take away. */
function blijvend(grid: Grid, x: number, y: number): boolean {
  if (y >= grid.height) return true;
  if (x < 0 || x >= grid.width || y < 0) return false;
  return isProtected(grid.cells[y * grid.width + x]!);
}

export function isSolved(grid: Grid): boolean {
  return steenCount(grid) === 0;
}

/** Three stars at par, two within two swings of it, one for finishing at all. */
export function stars(swings: number, par: number): number {
  if (swings <= par) return 3;
  if (swings <= par + 2) return 2;
  return 1;
}
