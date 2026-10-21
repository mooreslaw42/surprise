import type { RoomId, Surface } from '../../data/house.ts';
import { openingCells, gridSize, CELL_M } from '../sloop/generate.ts';
import {
  type Ding, type DingSoort, type Wand,
  buren8, index, xy,
} from './model.ts';
import { solve, eenduidig } from './solver.ts';

/**
 * Walls are generated and then thrown away until one survives the solver.
 *
 * Drawing these by hand does not work: a wall you invent either has several
 * answers or needs a guess somewhere in the middle, and you only find that
 * out after someone has sat staring at it. So: scatter klossen, hang
 * something off each one, work out what the detector would say, and keep the
 * wall only if the rules alone get all the way to the end.
 */

/** A small deterministic generator, so a seed always gives the same wall. */
function rng(seed: number): () => number {
  let s = (seed | 0) || 1;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function shuffle<T>(xs: T[], next: () => number): T[] {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [xs[i], xs[j]] = [xs[j]!, xs[i]!];
  }
  return xs;
}

/** Which cells have no board at all: the openings, straight off the scan. */
export function blokVan(surface: Surface, cell = CELL_M): boolean[] {
  const { cols, rows } = gridSize(surface, cell);
  const blok = new Array(cols * rows).fill(false);
  for (const opening of surface.openings) {
    const extent = openingCells(surface, opening, cell);
    if (!extent) continue;
    for (let r = extent.r0; r <= extent.r1; r++) {
      for (let c = extent.c0; c <= extent.c1; c++) blok[r * cols + c] = true;
    }
  }
  return blok;
}

export type WandSpec = {
  readonly width: number;
  readonly height: number;
  readonly blok: readonly boolean[];
  readonly dingen: readonly Ding[];
  readonly klossen: readonly number[];
};

/** The clues are a consequence of the answer, never written by hand. */
export function maakWand(spec: WandSpec): Wand {
  const kolomTel = new Array(spec.width).fill(0);
  const rijTel = new Array(spec.height).fill(0);
  for (const klos of spec.klossen) {
    const { x, y } = xy(spec, klos);
    kolomTel[x]++;
    rijTel[y]++;
  }
  return { ...spec, kolomTel, rijTel };
}

/** What hangs where. High up is a cupboard, low down is a radiator. */
const HOOG: Record<RoomId, DingSoort> = {
  keuken: 'kastje',
  woonkamer: 'kastje',
  tvkamer: 'tvbeugel',
};

const MIDDEN: Record<RoomId, readonly DingSoort[]> = {
  keuken: ['plank', 'wandlamp', 'kastje'],
  woonkamer: ['plank', 'wandlamp', 'kapstok'],
  tvkamer: ['plank', 'wandlamp', 'kapstok'],
};

function soorten(ruimte: RoomId, height: number, plekken: readonly number[], width: number): Ding[] {
  const midden = MIDDEN[ruimte];
  const op = [...plekken].sort((a, b) => a - b);
  // One radiator to a wall, and it is the lowest thing on it.
  const laagste = op[op.length - 1] ?? -1;
  let n = 0;
  return op.map((at) => {
    const y = Math.floor(at / width);
    if (at === laagste && y >= height - 2) return { at, soort: 'radiator' as DingSoort };
    if (y <= 1) return { at, soort: HOOG[ruimte] };
    return { at, soort: midden[n++ % midden.length]! };
  });
}

export type GenOpts = {
  readonly surface: Surface;
  readonly aantal: number;
  readonly seed: number;
  readonly cell?: number;
};

/** One attempt. Null when the scatter failed or the wall needs a guess. */
export function genereer(opts: GenOpts): Wand | null {
  const cell = opts.cell ?? CELL_M;
  const { cols, rows } = gridSize(opts.surface, cell);
  const blok = blokVan(opts.surface, cell);
  const next = rng(opts.seed);

  const ruw: Wand = {
    width: cols, height: rows, blok, dingen: [], kolomTel: [], rijTel: [], klossen: [],
  };

  const klossen: number[] = [];
  for (const i of shuffle(blok.map((_, n) => n).filter((n) => !blok[n]), next)) {
    if (klossen.length === opts.aantal) break;
    if (buren8(ruw, i).some((j) => klossen.includes(j))) continue;
    if (!buren4plek(ruw, i, blok, klossen)) continue;
    klossen.push(i);
  }
  if (klossen.length < opts.aantal) return null;

  // Hand each klos something to hold up, tightest first so nothing is stranded.
  const dingCellen = new Map<number, number>();
  const orde = [...klossen].sort((a, b) =>
    plekken(ruw, a, blok, klossen).length - plekken(ruw, b, blok, klossen).length);
  for (const klos of orde) {
    const vrij = shuffle(
      plekken(ruw, klos, blok, klossen).filter((p) => ![...dingCellen.values()].includes(p)),
      next);
    if (vrij.length === 0) return null;
    dingCellen.set(klos, vrij[0]!);
  }

  const wand = maakWand({
    width: cols,
    height: rows,
    blok,
    dingen: soorten(opts.surface.ruimte, rows, [...dingCellen.values()], cols),
    klossen,
  });

  // Nothing ships that cannot be reasoned out, or that has a second answer.
  if (!solve(wand).klaar) return null;
  if (!eenduidig(wand)) return null;
  return wand;
}

function plekken(w: Wand, klos: number, blok: readonly boolean[], klossen: readonly number[]): number[] {
  const { x, y } = xy(w, klos);
  const out: number[] = [];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= w.width || ny >= w.height) continue;
    const j = index(w, nx, ny);
    if (blok[j] || klossen.includes(j)) continue;
    out.push(j);
  }
  return out;
}

function buren4plek(w: Wand, i: number, blok: readonly boolean[], klossen: readonly number[]): boolean {
  return plekken(w, i, blok, klossen).length > 0;
}

export type Zoek = {
  readonly surface: Surface;
  readonly aantal: number;
  readonly vanaf?: number;
  readonly pogingen?: number;
  /** Refuse walls the easy rules alone already finish. */
  readonly moeilijk?: boolean;
};

/** Walk seeds until a wall survives everything. */
export function zoekWand(z: Zoek): { wand: Wand; seed: number } | null {
  const vanaf = z.vanaf ?? 1;
  const pogingen = z.pogingen ?? 4000;
  for (let seed = vanaf; seed < vanaf + pogingen; seed++) {
    const wand = genereer({ surface: z.surface, aantal: z.aantal, seed });
    if (!wand) continue;
    if (z.moeilijk) {
      const simpel = solve(wand, {
        raak: true, tellen: true, enige: true, knel: false, nutteloos: false,
      });
      if (simpel.klaar) continue;
    }
    return { wand, seed };
  }
  return null;
}
