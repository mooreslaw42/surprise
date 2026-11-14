import { PLATTEGROND, binnenshuis } from '../../data/plattegrond.ts';
import { LEEG, RICHTINGEN, draai, openingen, periode } from '../kanalen/model.ts';
import { solve } from '../kanalen/solver.ts';
import {
  BREEDTE, CELLEN, HOOGTE,
  type Baasbord, type Kandidaat, type Reden, kamerVan, laag,
} from './model.ts';

/**
 * The boss board, built out of what the player did.
 *
 * Every other level in the game is baked and checked in the test suite.
 * This one cannot be, because it depends on where he ran his cables, and
 * two players run them differently. So it is made when the level starts,
 * and it is safe for the same reason the kanaalplannen are: it is grown
 * from a working system and then turned wrong, never searched for. However
 * the cables lie, what comes out was a solution a moment ago.
 */

const cel = (x: number, y: number): number => y * BREEDTE + x;

/**
 * The four inside walls, and the cells of the plan that stand against each.
 *
 * PROVISIONAL in the same way house.ts is: which named wall is which line on
 * the plan rides on the room layout. It is these four entries and nothing
 * else.
 */
export type Wand = {
  /** The surface in house.ts, which is also what Elektra and Klossen call it. */
  readonly surface: string;
  readonly naam: string;
  /** Plan cells along the wall, in the order the wall's columns run. */
  readonly cellen: readonly number[];
  /** The big ochre wall. Painted in phase 7, and a schacht goes through it. */
  readonly geschilderd: boolean;
};

export const WANDEN: readonly Wand[] = [
  { surface: 'woonkamer-binnenmuur', naam: 'BINNENMUUR', cellen: [cel(4, 0), cel(4, 1)], geschilderd: true },
  { surface: 'woonkamer-haardwand', naam: 'HAARDWAND', cellen: [cel(4, 2), cel(4, 3)], geschilderd: false },
  { surface: 'keuken-zijwand', naam: 'KEUKEN ZIJWAND', cellen: [cel(5, 2), cel(6, 2), cel(7, 2), cel(8, 2)], geschilderd: false },
  { surface: 'tvkamer-zijwand', naam: 'TV-KAMER ZIJWAND', cellen: [cel(6, 3), cel(7, 3), cel(8, 3), cel(9, 3)], geschilderd: false },
];

/** What is already in one wall: the columns his cables and klossen sit in. */
export type Wandwerk = {
  /** How many columns the wall has in the level it came from. */
  readonly breedte: number;
  /** One entry per cable cell, so a long horizontal run weighs more. */
  readonly kabel: readonly number[];
  readonly klos: readonly number[];
};

export type Werk = Record<string, Wandwerk | undefined>;

/**
 * Which of a wall's plan cells are taken.
 *
 * A wall in Elektra is nine to eighteen columns wide and stands against two
 * to four cells of the plan, so a column lands on a plan cell by division.
 * A cable on its way to the meterkast crosses most of a wall, which would
 * shut every cell if any cable at all counted. So the cells with the most
 * cable in them go, half the wall at most, and the klossen after that — and
 * one cell always stays free, because a wall he cannot use at all is a dead
 * end, and this is the one level that must not have one.
 */
export function bezetting(wand: Wand, werk: Wandwerk | undefined): (Reden | null)[] {
  const n = wand.cellen.length;
  const out = new Array<Reden | null>(n).fill(null);
  if (!werk || werk.breedte <= 0) return out;

  const band = (kolom: number): number =>
    Math.min(n - 1, Math.max(0, Math.floor((kolom * n) / werk.breedte)));

  const kabels = new Array<number>(n).fill(0);
  for (const kolom of werk.kabel) kabels[band(kolom)]!++;
  const volgorde = kabels.map((aantal, i) => ({ aantal, i }))
    .filter((b) => b.aantal > 0)
    .sort((a, b) => (b.aantal - a.aantal) || (a.i - b.i));
  for (const b of volgorde.slice(0, Math.ceil(n / 2))) {
    if (out.filter((r) => r === null).length <= 1) break;
    out[b.i] = 'kabel';
  }

  for (const kolom of werk.klos) {
    const i = band(kolom);
    if (out[i] !== null) continue;
    if (out.filter((r) => r === null).length <= 1) break;
    out[i] = 'klos';
  }
  return out;
}

export function kandidatenVoor(werk: Werk): Kandidaat[] {
  return WANDEN.flatMap((wand) => {
    const bezet = bezetting(wand, werk[wand.surface]);
    return wand.cellen.map((c, i) => ({
      cel: c, wand: wand.naam, bezet: bezet[i]!, geschilderd: wand.geschilderd,
    }));
  });
}

function rng(seed: number): () => number {
  let s = (seed | 0) || 1;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function buren(i: number): { j: number; bit: number; terug: number }[] {
  const x = i % BREEDTE;
  const y = Math.floor(i / BREEDTE);
  const out: { j: number; bit: number; terug: number }[] = [];
  for (const r of RICHTINGEN) {
    const nx = x + r.dx;
    const ny = y + r.dy;
    if (nx < 0 || ny < 0 || nx >= BREEDTE || ny >= HOOGTE || !binnenshuis(nx, ny)) continue;
    out.push({ j: ny * BREEDTE + nx, bit: r.bit, terug: r.terug });
  }
  return out;
}

function schud<T>(lijst: T[], next: () => number): T[] {
  for (let i = lijst.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [lijst[i], lijst[j]] = [lijst[j]!, lijst[i]!];
  }
  return lijst;
}

/**
 * Under the floor: one trunk from the unit that passes every cell a schacht
 * could stand in. Long runs and few branches, which is what a main duct is,
 * and it means the floor drawing never decides where the schachten go —
 * that is left to the ceiling and to the walls.
 */
function vloerVan(wtw: number, langs: readonly number[], next: () => number): number[] {
  const masks = new Array<number>(CELLEN).fill(LEEG);
  const boom = new Set<number>([wtw]);

  for (const doel of langs) {
    if (boom.has(doel)) continue;
    // Shortest way from the target back to anything already laid.
    const van = new Map<number, { i: number; bit: number; terug: number }>();
    const rij = [doel];
    const gezien = new Set<number>([doel]);
    let raak = -1;
    while (rij.length && raak < 0) {
      const i = rij.shift()!;
      for (const b of schud(buren(i), next)) {
        if (gezien.has(b.j)) continue;
        gezien.add(b.j);
        van.set(b.j, { i, bit: b.bit, terug: b.terug });
        if (boom.has(b.j)) { raak = b.j; break; }
        rij.push(b.j);
      }
    }
    if (raak < 0) throw new Error('de vloer hangt niet aan elkaar');
    // Walk it back out, opening each joint from both sides.
    let i = raak;
    while (i !== doel) {
      const stap = van.get(i)!;
      // The step was recorded going from stap.i to i, so the bits are the
      // other way round from here.
      masks[i] = masks[i]! | stap.terug;
      masks[stap.i] = masks[stap.i]! | stap.bit;
      boom.add(i);
      i = stap.i;
    }
    boom.add(doel);
  }
  return masks;
}

/**
 * Over the ceiling, one room: a tree grown out from the foot of the schacht,
 * stopped short of filling the room. Short and branchy, every dead end a
 * rooster — and because it stops short, not every cell against the wall has
 * duct above it, which is half of what the player has to look for.
 */
function plafondVan(masks: number[], kamer: number, voet: number, deel: number, next: () => number): void {
  const gebied: number[] = [];
  for (let i = 0; i < CELLEN; i++) {
    if (binnenshuis(i % BREEDTE, Math.floor(i / BREEDTE)) && kamerVan(i) === kamer) gebied.push(i);
  }
  const doel = Math.max(4, Math.round(gebied.length * deel));
  const bereikt = new Set<number>([voet]);
  let rand = buren(voet).filter((b) => kamerVan(b.j) === kamer).map((b) => ({ van: voet, ...b }));

  while (rand.length > 0 && bereikt.size < doel) {
    const k = Math.floor(next() * rand.length);
    const kant = rand[k]!;
    rand.splice(k, 1);
    if (bereikt.has(kant.j)) continue;
    bereikt.add(kant.j);
    masks[kant.van] = masks[kant.van]! | kant.bit;
    masks[kant.j] = masks[kant.j]! | kant.terug;
    for (const b of buren(kant.j)) {
      if (kamerVan(b.j) === kamer && !bereikt.has(b.j)) rand.push({ van: kant.j, ...b });
    }
  }
}

function verdraai(masks: readonly number[], deel: number, next: () => number): number[] {
  const out = [...masks];
  const draaibaar = schud(out.map((m, i) => (m !== LEEG && periode(m) > 1 ? i : -1)).filter((i) => i >= 0), next);
  for (const i of draaibaar.slice(0, Math.round(draaibaar.length * deel))) {
    const p = periode(out[i]!);
    out[i] = draai(out[i]!, 1 + Math.floor(next() * (p - 1)));
  }
  return out;
}

/** How much of each ceiling gets duct, and how much of it ships turned. */
const DEEL_PLAFOND = 0.7;
const DEEL_VERDRAAID = 0.8;
const WTW = cel(0, 0);

export function maakBaas(werk: Werk, seed: number): Baasbord {
  const next = rng(seed);
  const kandidaten = kandidatenVoor(werk);

  // One schacht per room, each on a cell that is still free.
  const voeten = PLATTEGROND.ruimtes.map((_, kamer) => {
    const vrij = kandidaten.filter((k) => !k.bezet && kamerVan(k.cel) === kamer);
    if (vrij.length === 0) throw new Error(`geen vrije schacht in ruimte ${kamer}`);
    return vrij[Math.floor(next() * vrij.length)]!.cel;
  });

  const echtVloer = vloerVan(WTW, schud(kandidaten.map((k) => k.cel), next), next);
  const echtPlafond = new Array<number>(CELLEN).fill(LEEG);
  voeten.forEach((voet, kamer) => plafondVan(echtPlafond, kamer, voet, DEEL_PLAFOND, next));

  // Dead ends over the ceiling are roosters, except the foot of a schacht.
  const roosters: number[] = [];
  for (let i = 0; i < CELLEN; i++) {
    if (openingen(echtPlafond[i]!) === 1 && !voeten.includes(i)) roosters.push(i);
  }

  return {
    vloer: verdraai(echtVloer, DEEL_VERDRAAID, next),
    plafond: verdraai(echtPlafond, DEEL_VERDRAAID, next),
    wtw: WTW,
    roosters,
    kandidaten,
    oplossing: { vloer: echtVloer, plafond: echtPlafond, schachten: voeten },
  };
}

/** One room's ceiling on its own, which is how it has to come right. */
function kamerPlafond(masks: readonly number[], kamer: number): number[] {
  return masks.map((m, i) => (kamerVan(i) === kamer ? m : LEEG));
}

export type Rekening = {
  readonly par: number;
  /** The cheapest right answer from where the pieces stand now. */
  readonly vloer: number[];
  readonly plafond: number[];
};

/**
 * Fewest turns that make both drawings right, from any position.
 *
 * Turning never moves a piece and a schacht never turns one, so the two are
 * separate sums: the floor is one kanaalplan, and each room's ceiling is
 * another, hung from the foot of its schacht. Four small exact solves, and
 * par is a proven minimum like everywhere else.
 */
export function reken(bord: Baasbord, vloer: readonly number[], plafond: readonly number[]): Rekening {
  const onder = solve(laag(vloer, bord.wtw), vloer);
  let par = onder.par;
  const boven = new Array<number>(CELLEN).fill(LEEG);
  PLATTEGROND.ruimtes.forEach((_, kamer) => {
    const deel = kamerPlafond(plafond, kamer);
    const anker = deel.findIndex((m) => m !== LEEG);
    if (anker < 0) return;
    const uit = solve(laag(deel, anker), deel);
    par += uit.par;
    uit.oplossing.forEach((m, i) => { if (m !== LEEG) boven[i] = m; });
  });
  return { par, vloer: onder.oplossing, plafond: boven };
}

/** A seed out of the work itself, so the same history gives the same board. */
export function zaadVan(werk: Werk): number {
  let h = 2166136261;
  for (const wand of WANDEN) {
    const w = werk[wand.surface];
    for (const n of [w?.breedte ?? 0, ...(w?.kabel ?? []), -1, ...(w?.klos ?? [])]) {
      h = Math.imul(h ^ (n + 7), 16777619);
    }
  }
  return (h >>> 0) % 2147483647 || 1;
}
