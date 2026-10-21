import {
  type Board, type Point, type Route,
  STEPS, index, routable, samePoint,
} from './model.ts';

/**
 * Minimum total cable, with no two runs crossing and no breaker overloaded.
 *
 * Two decisions interlock: which group each socket hangs on, and how the
 * cable gets there. Groups are few, so the assignment is enumerated outright,
 * skipping any that would trip a breaker; each surviving assignment is then
 * routed by iterative deepening, and the cheapest wins.
 *
 * Within a routing, cells are counted per axis so runs may lie side by side
 * in one chase but a straight horizontal never meets a straight vertical.
 * See model.ts for why that is the whole of the no-crossing rule.
 */

const NODE_BUDGET = 3_000_000;
const EXTRA_BOUND = 24;

export type SolveResult = { par: number; routes: Route[] };

/** BFS outward from one group terminal. */
function distances(board: Board, from: Point, blocked: Uint8Array): Int32Array {
  const dist = new Int32Array(board.width * board.height).fill(-1);
  dist[index(board, from)] = 0;
  const queue: Point[] = [from];
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

/** Every way of hanging the sockets on groups without tripping a breaker. */
function assignments(board: Board): number[][] {
  const k = board.stopcontacten.length;
  const groups = board.groepen.length;
  const out: number[][] = [];
  const current: number[] = [];
  const loads = board.groepen.map(() => 0);

  const place = (i: number): void => {
    if (i === k) {
      out.push([...current]);
      return;
    }
    const amps = board.belasting[i] ?? 0;
    for (let g = 0; g < groups; g++) {
      if (loads[g]! + amps > board.groepen[g]!.maxAmp) continue;
      loads[g] = loads[g]! + amps;
      current.push(g);
      place(i + 1);
      current.pop();
      loads[g] = loads[g]! - amps;
    }
  };
  place(0);
  return out;
}

function routeFor(board: Board, assignment: number[], best: number): SolveResult | null {
  const size = board.width * board.height;
  const sockets = board.stopcontacten;
  const k = sockets.length;

  const socketBlock = new Uint8Array(size);
  for (const s of sockets) socketBlock[index(board, s)] = 1;

  // One distance field per group, so each socket is pruned against its own target.
  const fields = board.groepen.map((g) => distances(board, g.cel, socketBlock));
  const startDist = sockets.map((s, i) => {
    let bestStart = -1;
    for (const step of STEPS) {
      const q = { x: s.x + step.x, y: s.y + step.y };
      if (!routable(board, q)) continue;
      const d = fields[assignment[i]!]![index(board, q)] ?? -1;
      if (d >= 0 && (bestStart < 0 || d + 1 < bestStart)) bestStart = d + 1;
    }
    return bestStart;
  });
  if (startDist.some((d) => d < 0)) return null;

  const order = [...sockets.keys()].sort((a, b) => startDist[b]! - startDist[a]!);
  const lower = order.map((i) => startDist[i]!);
  const suffix: number[] = new Array<number>(k + 1).fill(0);
  for (let i = k - 1; i >= 0; i--) suffix[i] = suffix[i + 1]! + lower[i]!;

  const horiz = new Uint8Array(size);
  const vert = new Uint8Array(size);
  const chosen: Route[] = new Array(k);
  let nodes = 0;

  const canTake = (i: number, axis: 0 | 1 | 2): boolean =>
    axis === 0 ? vert[i] === 0 : axis === 1 ? horiz[i] === 0 : true;
  const take = (i: number, axis: 0 | 1 | 2, by: number): void => {
    if (axis === 0) horiz[i] = (horiz[i] ?? 0) + by;
    else if (axis === 1) vert[i] = (vert[i] ?? 0) + by;
  };
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
    const target = board.groepen[assignment[which]!]!.cel;
    const dist = fields[assignment[which]!]!;
    const budget = bound - soFar - suffix[step + 1]!;
    const path: Point[] = [socket];
    const onPath = new Uint8Array(size);
    onPath[index(board, socket)] = 1;

    const walk = (p: Point, din: Point | null, length: number): boolean => {
      if (++nodes > NODE_BUDGET) throw new Error('elektra solver gave up');
      if (samePoint(p, target)) {
        chosen[which] = [...path];
        return layRest(step + 1, soFar + length, bound);
      }
      const pi = index(board, p);
      for (const dout of STEPS) {
        const q = { x: p.x + dout.x, y: p.y + dout.y };
        if (!routable(board, q)) continue;
        const qi = index(board, q);
        if (onPath[qi]) continue;
        if (socketBlock[qi]) continue;
        const remaining = samePoint(q, target) ? 0 : (dist[qi] ?? -1);
        if (remaining < 0 || length + 1 + remaining > budget) continue;

        const axis = axisOf(din, dout);
        if (!canTake(pi, axis)) continue;
        take(pi, axis, 1);
        onPath[qi] = 1;
        path.push(q);

        if (walk(q, dout, length + 1)) return true;

        path.pop();
        onPath[qi] = 0;
        take(pi, axis, -1);
      }
      return false;
    };

    return walk(socket, null, 0);
  };

  const ceiling = Math.min(best - 1, suffix[0]! + EXTRA_BOUND);
  for (let bound = suffix[0]!; bound <= ceiling; bound++) {
    horiz.fill(0); vert.fill(0);
    nodes = 0;
    if (layRest(0, 0, bound)) {
      const routes = chosen.map((r) => r ?? []);
      return { par: routes.reduce((n, r) => n + Math.max(0, r.length - 1), 0), routes };
    }
  }
  return null;
}

export function solve(board: Board): SolveResult {
  if (board.stopcontacten.length === 0) return { par: 0, routes: [] };

  const options = assignments(board);
  if (options.length === 0) {
    throw new Error('no way to split these sockets across the groups without tripping a breaker');
  }

  let best: SolveResult | null = null;
  for (const assignment of options) {
    const result = routeFor(board, assignment, best?.par ?? Infinity);
    if (result && (!best || result.par < best.par)) best = result;
  }
  if (!best) throw new Error('no wiring found');
  return best;
}
