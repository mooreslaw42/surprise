import { PLATTEGROND, binnenshuis } from '../../data/plattegrond.ts';
import { type Bord, LEEG, RICHTINGEN, draai, openingen, periode } from './model.ts';
import { solve } from './solver.ts';

/**
 * Kanaalplannen are generated and then thrown away until one lands where it
 * should.
 *
 * Drawing one by hand is a bad bargain: you hold a tree of duct in your head,
 * check that nothing vents into a wall, and only then find out the thing comes
 * right in four turns. So instead: grow duct over the rooms as a spanning tree
 * — connected by construction, no loops, every dead end a rooster — then turn
 * a set number of pieces off true and let the solver say what par became.
 *
 * The boards this prints are baked into levels.ts. This file is how they were
 * made; the game never runs it.
 */

/** A small deterministic generator, so a seed always gives the same plan. */
function rng(seed: number): () => number {
  let s = (seed | 0) || 1;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const { width, height } = PLATTEGROND;

/** Every cell of the named rooms, as indices on the footprint. */
export function gebiedVan(namen: readonly string[]): number[] {
  const out = new Set<number>();
  for (const naam of namen) {
    const ruimte = PLATTEGROND.ruimtes.find((r) => r.naam === naam);
    if (!ruimte) throw new Error(`geen ruimte met de naam ${naam}`);
    for (let y = ruimte.y; y < ruimte.y + ruimte.h; y++) {
      for (let x = ruimte.x; x < ruimte.x + ruimte.w; x++) {
        if (binnenshuis(x, y)) out.add(y * width + x);
      }
    }
  }
  return [...out].sort((a, b) => a - b);
}

type Kant = { readonly van: number; readonly naar: number; readonly bit: number; readonly terug: number };

/**
 * A spanning tree of duct over the region, as opening masks per cell. Grown
 * outward from the unit one cell at a time, which is also the order the air
 * will travel.
 */
function boomVan(gebied: readonly number[], wtw: number, next: () => number): number[] {
  const inGebied = new Set(gebied);
  if (!inGebied.has(wtw)) throw new Error('de wtw hangt buiten het gebied');

  const masks = new Array<number>(width * height).fill(LEEG);
  const bereikt = new Set<number>([wtw]);
  let rand: Kant[] = [];

  const open = (i: number): void => {
    const x = i % width;
    const y = Math.floor(i / width);
    for (const r of RICHTINGEN) {
      const nx = x + r.dx;
      const ny = y + r.dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const j = ny * width + nx;
      if (!inGebied.has(j) || bereikt.has(j)) continue;
      rand.push({ van: i, naar: j, bit: r.bit, terug: r.terug });
    }
  };

  open(wtw);
  while (rand.length > 0) {
    const k = Math.floor(next() * rand.length);
    const kant = rand[k]!;
    rand.splice(k, 1);
    if (bereikt.has(kant.naar)) continue;
    bereikt.add(kant.naar);
    masks[kant.van] = masks[kant.van]! | kant.bit;
    masks[kant.naar] = masks[kant.naar]! | kant.terug;
    open(kant.naar);
    rand = rand.filter((e) => !bereikt.has(e.naar));
  }

  if (bereikt.size !== gebied.length) throw new Error('het gebied hangt niet aan elkaar');
  return masks;
}

export type PlanWens = {
  readonly gebied: readonly number[];
  readonly wtw: number;
  /** How many pieces ship turned the wrong way. */
  readonly draaien: number;
  readonly seed: number;
};

export type Plan = { readonly bord: Bord; readonly par: number };

export function maakPlan(wens: PlanWens): Plan {
  const next = rng(wens.seed);
  const echt = boomVan(wens.gebied, wens.wtw, next);

  // A cross looks the same whatever you do to it, so turning one is a move
  // the player can never see and par would quietly disagree with the board.
  const draaibaar = wens.gebied.filter((i) => periode(echt[i]!) > 1);
  for (let i = draaibaar.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [draaibaar[i], draaibaar[j]] = [draaibaar[j]!, draaibaar[i]!];
  }

  const masks = [...echt];
  for (const i of draaibaar.slice(0, wens.draaien)) {
    const p = periode(masks[i]!);
    masks[i] = draai(masks[i]!, 1 + Math.floor(next() * (p - 1)));
  }

  // The dead ends are the roosters. Turning a piece never changes how many
  // openings it has, so these are the same before and after the scramble.
  const roosters = wens.gebied.filter((i) => i !== wens.wtw && openingen(echt[i]!) === 1);
  const bord: Bord = { width, height, masks, wtw: wens.wtw, roosters };
  return { bord, par: solve(bord, bord.masks).par };
}

export type Zoekopdracht = {
  readonly gebied: readonly number[];
  readonly wtw: number;
  readonly draaien: number;
  readonly parVan: number;
  readonly parTot: number;
  readonly roostersVan: number;
  readonly roostersTot: number;
  readonly pogingen: number;
};

/** The first seed whose plan lands inside the window asked for. */
export function zoekPlan(opdracht: Zoekopdracht): (Plan & { seed: number }) | null {
  for (let seed = 1; seed <= opdracht.pogingen; seed++) {
    const plan = maakPlan({
      gebied: opdracht.gebied,
      wtw: opdracht.wtw,
      draaien: opdracht.draaien,
      seed,
    });
    const roosters = plan.bord.roosters.length;
    if (roosters < opdracht.roostersVan || roosters > opdracht.roostersTot) continue;
    if (plan.par < opdracht.parVan || plan.par > opdracht.parTot) continue;
    return { ...plan, seed };
  }
  return null;
}

/** The masks as they go into levels.ts: twenty to a line, like the others. */
export function alsBron(bord: Bord): string {
  const regels: string[] = [];
  for (let i = 0; i < bord.masks.length; i += 20) {
    regels.push(bord.masks.slice(i, i + 20).join(', '));
  }
  return `masks: [${regels.join(',\n        ')}],\n      wtw: ${bord.wtw},\n      roosters: [${bord.roosters.join(', ')}],`;
}
