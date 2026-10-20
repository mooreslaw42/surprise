import {
  type Board, type Point, type Route,
  STEPS, index, routable, samePoint,
} from './model.ts';

/**
 * Minimum total cable, with no two runs ever crossing.
 *
 * Iterative deepening on total length. Routes are laid hardest-first; within a
 * route the search is pruned by the straight-line-ignoring-everything BFS
 * distance to the meterkast, which is admissible because the crossing rule can
 * only ever lengthen a route, never shorten it.
 *
 * Occupancy is counted per axis: a cell may hold any number of straight
 * horizontals or any number of straight verticals, and any number of corners,
 * but never a horizontal and a vertical at once. See model.ts for why that is
 * the whole of the no-crossing rule.
 *
 * Used both to set par and to prove in the tests that every shipped level can
 * actually be wired.
 */

const NODE_BUDGET = 3_000_000;
const EXTRA_BOUND = 30;

export type SolveResult = { par: number; routes: Route[] };

function distances(board: Board, blocked: Uint8Array): Int32Array {
  const dist = new Int32Array(board.width * board.height).fill(-1);
  dist[index(board, board.meterkast)] = 0;
  const queue: Point[] = [board.meterkast];
  for (let head = 0; head < queue.length; head++) {
    const p = queue[head]!;
    const base = dist[index(board, p)]!;
    for (const step of STEPS) {
      const q = { x: p.x + step.x, y: p.y + step.y };
      if (!routable(board, q)) continue;
      const qi = index(board, q);
      if (blocked[qi] || dist[qi] !== -1) continue;
      dist[qi] = base + 1;
      queue.push(q);
    }
  }
  return dist;
}

export function solve(board: Board): SolveResult {
  const size = board.width * board.height;
  const sockets = board.stopcontacten;
  const k = sockets.length;
  if (k === 0) return { par: 0, routes: [] };

  // A cable never runs through a socket it does not belong to.
  const socketBlock = new Uint8Array(size);
  for (const s of sockets) socketBlock[index(board, s)] = 1;

  const reach = distances(board, socketBlock);
  const startDist = sockets.map((s) => {
    // The socket's own cell is blocked in `reach`, so measure from its exits.
    let best = -1;
    for (const step of STEPS) {
      const q = { x: s.x + step.x, y: s.y + step.y };
      if (!routable(board, q)) continue;
      const d = reach[index(board, q)] ?? -1;
      if (d >= 0 && (best < 0 || d + 1 < best)) best = d + 1;
    }
    if (samePoint(s, board.meterkast)) best = 0;
    return best;
  });
  startDist.forEach((d, i) => {
    if (d < 0) throw new Error(`stopcontact ${i} cannot reach the meterkast at all`);
  });

  const order = [...sockets.keys()].sort((a, b) => startDist[b]! - startDist[a]!);
  const lower = order.map((i) => startDist[i]!);
  const suffix: number[] = new Array<number>(k + 1).fill(0);
  for (let i = k - 1; i >= 0; i--) suffix[i] = suffix[i + 1]! + lower[i]!;

  // Per-axis occupancy counts, so parallel runs are allowed and crossings are not.
  const horiz = new Uint8Array(size);
  const vert = new Uint8Array(size);
  const chosen: Route[] = new Array(k);
  let nodes = 0;

  const canTake = (i: number, axis: 0 | 1 | 2): boolean => {
    if (axis === 0) return vert[i] === 0;
    if (axis === 1) return horiz[i] === 0;
    return true;                                  // a corner crosses nothing
  };
  const take = (i: number, axis: 0 | 1 | 2, by: number): void => {
    if (axis === 0) horiz[i] = (horiz[i] ?? 0) + by;
    else if (axis === 1) vert[i] = (vert[i] ?? 0) + by;
  };
  /** 0 = horizontal, 1 = vertical, 2 = corner. */
  const axisOf = (din: Point | null, dout: Point): 0 | 1 | 2 => {
    if (!din) return dout.y === 0 ? 0 : 1;
    if (din.x === dout.x && din.y === dout.y) return dout.y === 0 ? 0 : 1;
    return 2;
  };

  const layRest = (step: number, soFar: number, bound: number): boolean => {
    if (step === k) return true;
    if (soFar + suffix[step]! > bound) return false;

    const which = order[step]!;
    const socket = sockets[which]!;
    const budget = bound - soFar - suffix[step + 1]!;
    const path: Point[] = [socket];
    const onPath = new Uint8Array(size);
    onPath[index(board, socket)] = 1;
    // Cells this route committed, so they can be released on backtrack.
    const committed: { cell: number; axis: 0 | 1 | 2 }[] = [];

    const walk = (p: Point, din: Point | null, length: number): boolean => {
      if (++nodes > NODE_BUDGET) throw new Error('elektra solver gave up');
      if (samePoint(p, board.meterkast)) {
        chosen[which] = [...path];
        return layRest(step + 1, soFar + length, bound);
      }
      const pi = index(board, p);
      for (const dout of STEPS) {
        const q = { x: p.x + dout.x, y: p.y + dout.y };
        if (!routable(board, q)) continue;
        const qi = index(board, q);
        if (onPath[qi]) continue;
        if (socketBlock[qi] && !samePoint(q, board.meterkast)) continue;
        const remaining = samePoint(q, board.meterkast) ? 0 : (reach[qi] ?? -1);
        if (remaining < 0 || length + 1 + remaining > budget) continue;

        const axis = axisOf(din, dout);
        if (!canTake(pi, axis)) continue;
        take(pi, axis, 1);
        committed.push({ cell: pi, axis });
        onPath[qi] = 1;
        path.push(q);

        if (walk(q, dout, length + 1)) return true;

        path.pop();
        onPath[qi] = 0;
        committed.pop();
        take(pi, axis, -1);
      }
      return false;
    };

    return walk(socket, null, 0);
  };

  for (let bound = suffix[0]!; bound <= suffix[0]! + EXTRA_BOUND; bound++) {
    horiz.fill(0); vert.fill(0);
    nodes = 0;
    try {
      if (layRest(0, 0, bound)) {
        const routes = chosen.map((r) => r ?? []);
        const par = routes.reduce((n, r) => n + Math.max(0, r.length - 1), 0);
        return { par, routes };
      }
    } catch (error) {
      throw new Error(`${(error as Error).message} at bound ${bound}`);
    }
  }
  throw new Error('no wiring found');
}
