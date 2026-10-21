/**
 * Ventilatie: plan the ductwork from the WTW unit to every rooster.
 *
 * Seen from above, not from the wall, because this stage is a drawing rather
 * than a job. Ducts share trunks — two rooms down one run and splitting later
 * is the whole craft — so unlike cable, flow *accumulates* on a shared
 * segment. A trunk carrying more than the duct can take is the thing you are
 * planning around.
 *
 * Scored on how much duct it takes, counting a shared segment once. Planning
 * two separate runs where one trunk would do is exactly the mistake.
 *
 * It is never delivered.
 */

export const CEL = {
  VLOER: 0,
  MUUR: 1,
  WTW: 2,
  ROOSTER: 3,
} as const;

export type CelValue = (typeof CEL)[keyof typeof CEL];

export type Point = { readonly x: number; readonly y: number };

export type Rooster = {
  readonly cel: Point;
  /** Airflow this grille has to deliver, in m3/h. */
  readonly debiet: number;
  readonly ruimte: string;
};

export type Plan = {
  readonly width: number;
  readonly height: number;
  readonly cells: CelValue[];
  readonly wtw: Point;
  readonly roosters: readonly Rooster[];
  /** What one duct can carry, in m3/h, before it whistles. */
  readonly capaciteit: number;
  /** How far the fan will push, in cells. */
  readonly maxLengte: number;
};

export type Route = Point[];

export function index(plan: Plan, p: Point): number {
  return p.y * plan.width + p.x;
}

export function inside(plan: Plan, p: Point): boolean {
  return p.x >= 0 && p.y >= 0 && p.x < plan.width && p.y < plan.height;
}

export function celAt(plan: Plan, p: Point): CelValue | undefined {
  return inside(plan, p) ? plan.cells[index(plan, p)] : undefined;
}

export function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

/** Duct may run anywhere but through a wall. */
export function begaanbaar(plan: Plan, p: Point): boolean {
  const cel = celAt(plan, p);
  return cel !== undefined && cel !== CEL.MUUR;
}

export const STEPS: readonly Point[] = [
  { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
];

export type Fault =
  | { kind: 'los'; which: number }
  | { kind: 'onderbroken'; which: number }
  | { kind: 'doormuur'; which: number; at: Point }
  | { kind: 'overbelast'; at: Point; debiet: number }
  | { kind: 'telang'; which: number; lengte: number };

/**
 * Airflow through every cell. A segment carrying two rooms carries both their
 * volumes, which is what makes a trunk a decision rather than a shortcut.
 */
export function debietPerCel(plan: Plan, routes: readonly Route[]): Map<number, number> {
  const flow = new Map<number, number>();
  for (let i = 0; i < routes.length; i++) {
    const debiet = plan.roosters[i]?.debiet ?? 0;
    const seen = new Set<number>();
    for (const p of routes[i] ?? []) {
      if (samePoint(p, plan.wtw)) continue;
      const key = index(plan, p);
      if (seen.has(key)) continue;        // a route doubling back pays once
      seen.add(key);
      flow.set(key, (flow.get(key) ?? 0) + debiet);
    }
  }
  return flow;
}

/** Duct cells used, counting a shared trunk once. */
export function kanaalLengte(plan: Plan, routes: readonly Route[]): number {
  const used = new Set<number>();
  for (const route of routes) {
    for (const p of route) {
      if (samePoint(p, plan.wtw)) continue;
      used.add(index(plan, p));
    }
  }
  return used.size;
}

export function faults(plan: Plan, routes: readonly Route[]): Fault[] {
  const out: Fault[] = [];

  for (let i = 0; i < plan.roosters.length; i++) {
    const route = routes[i];
    const rooster = plan.roosters[i]!;
    if (!route || route.length < 2) {
      out.push({ kind: 'los', which: i });
      continue;
    }
    if (!samePoint(route[0]!, rooster.cel) || !samePoint(route[route.length - 1]!, plan.wtw)) {
      out.push({ kind: 'los', which: i });
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
    const wall = route.find((p) => !begaanbaar(plan, p));
    if (wall) {
      out.push({ kind: 'doormuur', which: i, at: wall });
      continue;
    }
    if (route.length - 1 > plan.maxLengte) {
      out.push({ kind: 'telang', which: i, lengte: route.length - 1 });
    }
  }

  for (const [key, debiet] of debietPerCel(plan, routes)) {
    if (debiet > plan.capaciteit) {
      out.push({
        kind: 'overbelast',
        at: { x: key % plan.width, y: Math.floor(key / plan.width) },
        debiet,
      });
    }
  }

  return out;
}

export function isSolved(plan: Plan, routes: readonly Route[]): boolean {
  return faults(plan, routes).length === 0;
}

export function stars(lengte: number, par: number): number {
  if (lengte <= par) return 3;
  if (lengte <= par + 4) return 2;
  return 1;
}

const CHARS: Record<string, CelValue> = {
  '.': CEL.MUUR,
  '#': CEL.VLOER,
  W: CEL.WTW,
  R: CEL.ROOSTER,
};

/** Plans are authored as ASCII art, like the walls. */
export function parsePlan(
  rows: readonly string[],
  roosters: readonly { x: number; y: number; debiet: number; ruimte: string }[],
  capaciteit: number,
  maxLengte: number,
): Plan {
  const width = rows[0]?.length ?? 0;
  const cells: CelValue[] = [];
  let wtw: Point | null = null;
  rows.forEach((row, y) => {
    if (row.length !== width) throw new Error(`ragged plan row ${y}`);
    [...row].forEach((ch, x) => {
      const cel = CHARS[ch];
      if (cel === undefined) throw new Error(`unknown plan cell "${ch}"`);
      if (cel === CEL.WTW) wtw = { x, y };
      cells.push(cel);
    });
  });
  if (!wtw) throw new Error('plan has no WTW unit');
  return {
    width, height: rows.length, cells, wtw,
    roosters: roosters.map((r) => ({ cel: { x: r.x, y: r.y }, debiet: r.debiet, ruimte: r.ruimte })),
    capaciteit, maxLengte,
  };
}
