/**
 * Elektra: run a cable from every stopcontact back to the meterkast without
 * any two cables crossing.
 *
 * Cables may share a chase: two runs lying side by side, or turning the same
 * corner, are normal work. What they may not do is cross.
 *
 * Treat a cell as four ports. A route through it uses two, as a chord. Two
 * chords cross only when they interleave around the cell, and among
 * orthogonal runs that happens in exactly one case: a straight horizontal
 * meeting a straight vertical. Every other pair — two parallels, two corners,
 * a corner and a straight — shares a port or sits in one quadrant, and does
 * not cross.
 *
 * So the whole rule is: never a straight horizontal and a straight vertical in
 * the same cell.
 *
 * (Two earlier attempts were stricter and made every level impossible: first
 * requiring routes to be vertex-disjoint, which stops three sockets ever
 * reaching one meterkast down a shared corridor, then forbidding shared
 * corners, which stops them ever turning into it.)
 *
 * The wall's real windows and lintels are the obstacles — you cannot chase a
 * cable through a window, and you do not drill the latei.
 */

export const TILE = {
  MUUR: 0,       // free wall, cable may run here
  GESLOTEN: 1,   // window, door, lintel: no cable
  METERKAST: 2,
  STOPCONTACT: 3,
} as const;

export type TileValue = (typeof TILE)[keyof typeof TILE];

export type Point = { readonly x: number; readonly y: number };

export type Board = {
  readonly width: number;
  readonly height: number;
  readonly tiles: TileValue[];
  readonly meterkast: Point;
  readonly stopcontacten: readonly Point[];
  /** Amps drawn by each stopcontact, in the same order. */
  readonly belasting: readonly number[];
  /** Maximum amps on one group before the breaker goes. */
  readonly maxAmp: number;
};

export function index(board: Board, p: Point): number {
  return p.y * board.width + p.x;
}

export function inside(board: Board, p: Point): boolean {
  return p.x >= 0 && p.y >= 0 && p.x < board.width && p.y < board.height;
}

export function tileAt(board: Board, p: Point): TileValue | undefined {
  return inside(board, p) ? board.tiles[index(board, p)] : undefined;
}

export function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

/** Cable may occupy wall, a stopcontact, or the meterkast itself. */
export function routable(board: Board, p: Point): boolean {
  const tile = tileAt(board, p);
  return tile !== undefined && tile !== TILE.GESLOTEN;
}

export const STEPS: readonly Point[] = [
  { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
];

export function neighbours(board: Board, p: Point): Point[] {
  const out: Point[] = [];
  for (const step of STEPS) {
    const q = { x: p.x + step.x, y: p.y + step.y };
    if (routable(board, q)) out.push(q);
  }
  return out;
}

/** A route as drawn by the player: stopcontact first, meterkast last. */
export type Route = Point[];

export type Fault =
  | { kind: 'los'; which: number }
  | { kind: 'kruising'; at: Point }
  | { kind: 'onderbroken'; which: number }
  | { kind: 'verboden'; which: number; at: Point }
  | { kind: 'overbelast'; amps: number };

/** How a route passes through one of its cells. */
export type Axis = 'h' | 'v' | 'hoek';

export function axisAt(route: Route, i: number): Axis {
  const prev = route[i - 1];
  const next = route[i + 1];
  if (!prev && !next) return 'hoek';
  const a = prev ?? route[i]!;
  const b = next ?? route[i]!;
  if (!prev) return b.y === route[i]!.y ? 'h' : 'v';
  if (!next) return a.y === route[i]!.y ? 'h' : 'v';
  if (a.y === b.y) return 'h';
  if (a.x === b.x) return 'v';
  return 'hoek';
}

/** Whether two routes may both pass through one cell without crossing. */
export function axesCompatible(a: Axis, b: Axis): boolean {
  return !((a === 'h' && b === 'v') || (a === 'v' && b === 'h'));
}

/** Every way a set of routes can be wrong, in the order worth reporting. */
export function faults(board: Board, routes: readonly Route[]): Fault[] {
  const out: Fault[] = [];

  for (let i = 0; i < board.stopcontacten.length; i++) {
    const route = routes[i];
    if (!route || route.length === 0) {
      out.push({ kind: 'los', which: i });
      continue;
    }
    if (!samePoint(route[0]!, board.stopcontacten[i]!) ||
        !samePoint(route[route.length - 1]!, board.meterkast)) {
      out.push({ kind: 'los', which: i });
      continue;
    }
    for (let s = 1; s < route.length; s++) {
      const a = route[s - 1]!;
      const b = route[s]!;
      if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) !== 1) {
        out.push({ kind: 'onderbroken', which: i });
        break;
      }
    }
    for (const p of route) {
      if (!routable(board, p)) {
        out.push({ kind: 'verboden', which: i, at: p });
        break;
      }
    }
  }

  // Cables may run together along the same axis, but never cross and never
  // share a corner. The meterkast is where they all arrive, so it is exempt.
  const seen = new Map<number, { route: number; axis: Axis }>();
  for (let i = 0; i < routes.length; i++) {
    const route = routes[i] ?? [];
    for (let s = 0; s < route.length; s++) {
      const p = route[s]!;
      if (samePoint(p, board.meterkast)) continue;
      const axis = axisAt(route, s);
      const key = index(board, p);
      const held = seen.get(key);
      if (!held) {
        seen.set(key, { route: i, axis });
      } else if (held.route !== i && !axesCompatible(held.axis, axis)) {
        out.push({ kind: 'kruising', at: p });
      } else if (held.route === i) {
        out.push({ kind: 'kruising', at: p });   // a route doubling back on itself
      }
    }
  }

  const amps = board.belasting.reduce((n, a) => n + a, 0);
  if (amps > board.maxAmp) out.push({ kind: 'overbelast', amps });

  return out;
}

export function isSolved(board: Board, routes: readonly Route[]): boolean {
  return faults(board, routes).length === 0;
}

/** Cable used, in cells. The meterkast cell is shared, so it is not counted. */
export function cableLength(routes: readonly Route[]): number {
  return routes.reduce((n, route) => n + Math.max(0, route.length - 1), 0);
}

export function stars(length: number, par: number): number {
  if (length <= par) return 3;
  if (length <= par + 3) return 2;
  return 1;
}
