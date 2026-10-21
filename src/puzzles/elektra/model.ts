/**
 * Elektra: wire the wall without any two runs crossing.
 *
 * A stopcontact goes back to a groep in the meterkast. A lamp does not: it
 * goes to a schakelaar, and the schakelaar goes to a groep. So a switched
 * light is two runs in series, and its amps land on whichever groep its
 * switch ended up on.
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
 */

export const TILE = {
  MUUR: 0,
  GESLOTEN: 1,
  METERKAST: 2,
  STOPCONTACT: 3,
  LAMP: 4,
  SCHAKELAAR: 5,
} as const;

export type TileValue = (typeof TILE)[keyof typeof TILE];

export type Point = { readonly x: number; readonly y: number };

export type DeviceKind = 'stopcontact' | 'lamp' | 'schakelaar';

export type Device = {
  readonly kind: DeviceKind;
  readonly cel: Point;
  /** Amps drawn. A schakelaar draws nothing itself. */
  readonly amp: number;
};

/**
 * What a breaker is for. Lighting and wall sockets go on separate groups,
 * which is how it is actually done: a blown socket should not take the lights
 * out with it.
 */
export type GroepSoort = 'licht' | 'wcd';

/** One breaker in the meterkast. Everything on it shares its 16A. */
export type Groep = {
  readonly cel: Point;
  readonly naam: string;
  readonly soort: GroepSoort;
  readonly maxAmp: number;
};

/** Which kind of breaker a device belongs on. */
export function soortVoor(kind: DeviceKind): GroepSoort {
  return kind === 'stopcontact' ? 'wcd' : 'licht';
}

export type Board = {
  readonly width: number;
  readonly height: number;
  readonly tiles: TileValue[];
  readonly groepen: readonly Groep[];
  readonly devices: readonly Device[];
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

export function routable(board: Board, p: Point): boolean {
  const tile = tileAt(board, p);
  return tile !== undefined && tile !== TILE.GESLOTEN;
}

export function isTerminal(board: Board, p: Point): boolean {
  return board.groepen.some((g) => samePoint(g.cel, p));
}

/**
 * Where device i may legally end: a schakelaar if it is a lamp, otherwise a
 * breaker of the right kind.
 */
export function targetsFor(board: Board, i: number): Point[] {
  const device = board.devices[i];
  if (!device) return [];
  if (device.kind === 'lamp') {
    return board.devices.filter((d) => d.kind === 'schakelaar').map((d) => d.cel);
  }
  const soort = soortVoor(device.kind);
  return board.groepen.filter((g) => g.soort === soort).map((g) => g.cel);
}

/**
 * Where a run may be attached while playing. Wider than targetsFor on
 * purpose: a cable dragged to the wrong breaker should land and be marked
 * wrong, rather than silently refusing to connect.
 */
export function endpointsFor(board: Board, i: number): Point[] {
  const device = board.devices[i];
  if (!device) return [];
  if (device.kind === 'lamp') {
    return board.devices.filter((d) => d.kind === 'schakelaar').map((d) => d.cel);
  }
  return board.groepen.map((g) => g.cel);
}

export const STEPS: readonly Point[] = [
  { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
];

/** A route as drawn: the device first, its target last. */
export type Route = Point[];

export type Fault =
  | { kind: 'los'; which: number }
  | { kind: 'kruising'; at: Point }
  | { kind: 'onderbroken'; which: number }
  | { kind: 'verboden'; which: number; at: Point }
  | { kind: 'overbelast'; groep: number; amps: number }
  | { kind: 'verkeerdegroep'; which: number; groep: number };

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

/** Which device a route ends on, or -1. */
export function deviceAtEnd(board: Board, route: Route): number {
  const end = route[route.length - 1];
  if (!end) return -1;
  return board.devices.findIndex((d) => samePoint(d.cel, end));
}

/** Which groep a route ends on, or -1. */
export function groupOf(board: Board, route: Route): number {
  const end = route[route.length - 1];
  if (!end) return -1;
  return board.groepen.findIndex((g) => samePoint(g.cel, end));
}

/**
 * The groep a device finally hangs on, following a lamp through its
 * schakelaar. -1 when the chain is not finished.
 */
export function groepVoor(board: Board, routes: readonly Route[], i: number): number {
  const route = routes[i];
  if (!route || route.length < 2) return -1;
  const direct = groupOf(board, route);
  if (direct >= 0) return direct;
  const via = deviceAtEnd(board, route);
  if (via < 0 || board.devices[via]!.kind !== 'schakelaar') return -1;
  return groepVoor(board, routes, via);
}

/** Amps on each breaker, with lamps counted through their switch. */
export function groupLoads(board: Board, routes: readonly Route[]): number[] {
  const loads = board.groepen.map(() => 0);
  for (let i = 0; i < board.devices.length; i++) {
    const groep = groepVoor(board, routes, i);
    if (groep >= 0) loads[groep] = loads[groep]! + board.devices[i]!.amp;
  }
  return loads;
}

/** Every way a set of routes can be wrong. */
export function faults(board: Board, routes: readonly Route[]): Fault[] {
  const out: Fault[] = [];

  for (let i = 0; i < board.devices.length; i++) {
    const route = routes[i];
    const device = board.devices[i]!;
    if (!route || route.length < 2) {
      out.push({ kind: 'los', which: i });
      continue;
    }
    const end = route[route.length - 1]!;
    const attached = endpointsFor(board, i).some((t) => samePoint(t, end));
    if (!samePoint(route[0]!, device.cel) || !attached) {
      out.push({ kind: 'los', which: i });
      continue;
    }
    // Attached, but to a breaker meant for the other kind of circuit.
    if (!targetsFor(board, i).some((t) => samePoint(t, end))) {
      out.push({ kind: 'verkeerdegroep', which: i, groep: groupOf(board, route) });
      continue;
    }
    let broken = false;
    for (let s = 1; s < route.length; s++) {
      const a = route[s - 1]!;
      const b = route[s]!;
      if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) !== 1) {
        out.push({ kind: 'onderbroken', which: i });
        broken = true;
        break;
      }
    }
    if (broken) continue;
    for (const p of route) {
      if (!routable(board, p)) {
        out.push({ kind: 'verboden', which: i, at: p });
        break;
      }
      // A run may touch its own device and the one it ends on, nothing else:
      // cable does not pass straight through someone else's socket.
      const other = board.devices.findIndex((d) => samePoint(d.cel, p));
      if (other >= 0 && other !== i && !samePoint(p, end)) {
        out.push({ kind: 'verboden', which: i, at: p });
        break;
      }
    }
  }

  // Runs may share a chase but never cross. A groep terminal is where
  // everything arrives, and a device is a junction — a lamp's run ending
  // inside a schakelaar that another run leaves is the point, not a crossing.
  const junction = (p: Point): boolean =>
    isTerminal(board, p) || board.devices.some((d) => samePoint(d.cel, p));

  const seen = new Map<number, { route: number; axis: Axis }>();
  for (let i = 0; i < routes.length; i++) {
    const route = routes[i] ?? [];
    for (let s = 0; s < route.length; s++) {
      const p = route[s]!;
      if (junction(p)) continue;
      const axis = axisAt(route, s);
      const key = index(board, p);
      const held = seen.get(key);
      if (!held) {
        seen.set(key, { route: i, axis });
      } else if (held.route !== i && !axesCompatible(held.axis, axis)) {
        out.push({ kind: 'kruising', at: p });
      } else if (held.route === i) {
        out.push({ kind: 'kruising', at: p });   // doubling back on itself
      }
    }
  }

  const loads = groupLoads(board, routes);
  for (let g = 0; g < board.groepen.length; g++) {
    if (loads[g]! > board.groepen[g]!.maxAmp) {
      out.push({ kind: 'overbelast', groep: g, amps: loads[g]! });
    }
  }

  return out;
}

export function isSolved(board: Board, routes: readonly Route[]): boolean {
  return faults(board, routes).length === 0;
}

/** Cable used, in cells. */
export function cableLength(routes: readonly Route[]): number {
  return routes.reduce((n, route) => n + Math.max(0, route.length - 1), 0);
}

export function stars(length: number, par: number): number {
  if (length <= par) return 3;
  if (length <= par + 3) return 2;
  return 1;
}
