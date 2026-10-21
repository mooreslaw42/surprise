import {
  type Plan, type Point, type Route,
  STEPS, begaanbaar, index, samePoint,
} from './model.ts';

/**
 * Plans the ductwork, and sets par.
 *
 * Shared trunks mean the answer is a tree rooted at the WTW, not a set of
 * independent paths, so it is built like one: take the roosters in some
 * order and connect each to what already exists, where running along duct
 * that is already there is free and fresh duct costs one. Every order is
 * tried and the best tree kept.
 *
 * An earlier version enumerated paths depth-first the way the Elektra solver
 * does. That is the wrong shape for this problem and fell over at five
 * roosters; a tree is built once per ordering instead, which is linear.
 *
 * Par is therefore the best tree over all orderings rather than a proven
 * optimum. What matters for scoring is that it is always *achievable* — the
 * routes that produced it are returned and the tests replay them — and tight
 * enough that beating it is not routine.
 */

const COST_WEIGHT = 1000;

export type SolveResult = { par: number; routes: Route[] };

type Connection = { path: Point[]; nieuw: number };

/**
 * Cheapest way for one rooster to reach the unit: minimise fresh duct first,
 * then length, never exceeding what a duct can carry once this grille's air
 * is added.
 */
function verbind(plan: Plan, tree: Uint8Array, flow: Int32Array, rooster: Point, debiet: number): Connection | null {
  const size = plan.width * plan.height;
  const best = new Int32Array(size).fill(0x7fffffff);
  const from = new Int32Array(size).fill(-1);
  const start = index(plan, plan.wtw);
  best[start] = 0;

  // Small grids, so a plain scan beats maintaining a heap.
  const done = new Uint8Array(size);
  for (;;) {
    let at = -1;
    let key = 0x7fffffff;
    for (let i = 0; i < size; i++) {
      if (!done[i] && best[i]! < key) { key = best[i]!; at = i; }
    }
    if (at < 0) break;
    done[at] = 1;

    const p = { x: at % plan.width, y: Math.floor(at / plan.width) };
    for (const step of STEPS) {
      const q = { x: p.x + step.x, y: p.y + step.y };
      if (!begaanbaar(plan, q)) continue;
      const qi = index(plan, q);
      if (done[qi]) continue;
      // The unit itself is the fan, not duct, so it carries nothing.
      if (qi !== start && flow[qi]! + debiet > plan.capaciteit) continue;

      const fresh = qi === start || tree[qi] ? 0 : 1;
      const candidate = best[at]! + fresh * COST_WEIGHT + 1;
      if (candidate < best[qi]!) {
        best[qi] = candidate;
        from[qi] = at;
      }
    }
  }

  const target = index(plan, rooster);
  if (best[target]! >= 0x7fffffff) return null;
  const lengte = best[target]! % COST_WEIGHT;
  if (lengte > plan.maxLengte) return null;

  const path: Point[] = [];
  for (let at = target; at !== -1; at = from[at]!) {
    path.push({ x: at % plan.width, y: Math.floor(at / plan.width) });
    if (at === start) break;
  }
  if (path.length === 0 || !samePoint(path[path.length - 1]!, plan.wtw)) return null;
  return { path, nieuw: Math.floor(best[target]! / COST_WEIGHT) };
}

function permutations(n: number): number[][] {
  const out: number[][] = [];
  const current: number[] = [];
  const used = new Array<boolean>(n).fill(false);
  const walk = (): void => {
    if (current.length === n) { out.push([...current]); return; }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      used[i] = true;
      current.push(i);
      walk();
      current.pop();
      used[i] = false;
    }
  };
  walk();
  return out;
}

export function solve(plan: Plan): SolveResult {
  const n = plan.roosters.length;
  if (n === 0) return { par: 0, routes: [] };
  if (n > 7) throw new Error('too many roosters to try every order');

  const size = plan.width * plan.height;
  let best: SolveResult | null = null;

  for (const order of permutations(n)) {
    const tree = new Uint8Array(size);
    const flow = new Int32Array(size);
    const routes: Route[] = new Array(n);
    let ok = true;

    for (const i of order) {
      const rooster = plan.roosters[i]!;
      const found = verbind(plan, tree, flow, rooster.cel, rooster.debiet);
      if (!found) { ok = false; break; }
      routes[i] = found.path;
      for (const p of found.path) {
        if (samePoint(p, plan.wtw)) continue;
        const pi = index(plan, p);
        tree[pi] = 1;
        flow[pi] = flow[pi]! + rooster.debiet;
      }
    }
    if (!ok) continue;

    const cells = new Set<number>();
    for (const route of routes) {
      for (const p of route) {
        if (!samePoint(p, plan.wtw)) cells.add(index(plan, p));
      }
    }
    if (!best || cells.size < best.par) best = { par: cells.size, routes };
  }

  if (!best) throw new Error('no ductwork found');
  return best;
}
