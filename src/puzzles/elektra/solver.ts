import {
  type Board, type Point, type Route,
  STEPS, groupLoads, index, routable, samePoint, targetsFor,
} from './model.ts';

/**
 * Minimum total cable, with nothing crossing and no breaker overloaded.
 *
 * Two decisions interlock: where each run ends — which groep, or for a lamp
 * which schakelaar — and how the cable gets there. The endpoints are few, so
 * the choice is enumerated outright and anything that would trip a breaker is
 * dropped before routing; each survivor is then routed by iterative
 * deepening, and the cheapest wins.
 *
 * Cells are counted per axis, so runs may lie side by side in one chase but a
 * straight horizontal never meets a straight vertical. See model.ts for why
 * that is the whole of the no-crossing rule.
 *
 * Used both to set par and to prove in the tests that every level can be
 * wired at all.
 */

const NODE_BUDGET = 2_000_000;
const EXTRA_BOUND = 22;
const MAX_CHOICES = 4096;

export type SolveResult = { par: number; routes: Route[] };

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

/** Every legal choice of endpoint for every device, breakers permitting. */
function choices(board: Board): number[][] {
  const n = board.devices.length;
  const options = board.devices.map((_, i) => targetsFor(board, i));
  const out: number[][] = [];
  const current: number[] = [];

  const walk = (i: number): void => {
    if (out.length >= MAX_CHOICES) return;
    if (i === n) {
      // Build the routes a choice implies, just far enough to total the loads.
      const stub: Route[] = current.map((t, d) => [board.devices[d]!.cel, options[d]![t]!]);
      const loads = groupLoads(board, stub);
      if (loads.every((amps, g) => amps <= board.groepen[g]!.maxAmp)) out.push([...current]);
      return;
    }
    for (let t = 0; t < options[i]!.length; t++) {
      current.push(t);
      walk(i + 1);
      current.pop();
    }
  };
  walk(0);
  return out;
}

function routeFor(board: Board, choice: number[], best: number): SolveResult | null {
  const size = board.width * board.height;
  const n = board.devices.length;
  const targets = board.devices.map((_, i) => targetsFor(board, i)[choice[i]!]!);

  // A run never passes through a device that is not its own end.
  const deviceCells = new Uint8Array(size);
  for (const d of board.devices) deviceCells[index(board, d.cel)] = 1;

  const fields: Int32Array[] = [];
  const startDist: number[] = [];
  for (let i = 0; i < n; i++) {
    const blocked = new Uint8Array(deviceCells);
    blocked[index(board, targets[i]!)] = 0;
    const field = distances(board, targets[i]!, blocked);
    fields.push(field);
    let bestStart = -1;
    for (const step of STEPS) {
      const q = { x: board.devices[i]!.cel.x + step.x, y: board.devices[i]!.cel.y + step.y };
      if (!routable(board, q)) continue;
      const d = field[index(board, q)] ?? -1;
      if (d >= 0 && (bestStart < 0 || d + 1 < bestStart)) bestStart = d + 1;
    }
    startDist.push(bestStart);
  }
  if (startDist.some((d) => d < 0)) return null;

  const order = [...Array(n).keys()].sort((a, b) => startDist[b]! - startDist[a]!);
  const lower = order.map((i) => startDist[i]!);
  const suffix: number[] = new Array<number>(n + 1).fill(0);
  for (let i = n - 1; i >= 0; i--) suffix[i] = suffix[i + 1]! + lower[i]!;

  const horiz = new Uint8Array(size);
  const vert = new Uint8Array(size);
  const chosen: Route[] = new Array(n);
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
    if (step === n) return true;
    if (soFar + suffix[step]! > bound) return false;

    const which = order[step]!;
    const from = board.devices[which]!.cel;
    const target = targets[which]!;
    const field = fields[which]!;
    const budget = bound - soFar - suffix[step + 1]!;
    const path: Point[] = [from];
    const onPath = new Uint8Array(size);
    onPath[index(board, from)] = 1;

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
        if (deviceCells[qi] && !samePoint(q, target)) continue;
        const remaining = samePoint(q, target) ? 0 : (field[qi] ?? -1);
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

    return walk(from, null, 0);
  };

  const ceiling = Math.min(best - 1, suffix[0]! + EXTRA_BOUND);
  for (let bound = suffix[0]!; bound <= ceiling; bound++) {
    horiz.fill(0); vert.fill(0);
    nodes = 0;
    if (layRest(0, 0, bound)) {
      const routes = chosen.map((r) => r ?? []);
      return { par: routes.reduce((n2, r) => n2 + Math.max(0, r.length - 1), 0), routes };
    }
  }
  return null;
}

export function solve(board: Board): SolveResult {
  if (board.devices.length === 0) return { par: 0, routes: [] };

  const options = choices(board);
  if (options.length === 0) {
    throw new Error('no way to split these devices across the groepen without tripping a breaker');
  }

  let best: SolveResult | null = null;
  for (const choice of options) {
    const result = routeFor(board, choice, best?.par ?? Infinity);
    if (result && (!best || result.par < best.par)) best = result;
  }
  if (!best) throw new Error('no wiring found');
  return best;
}
