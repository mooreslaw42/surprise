/**
 * Kanalen: the ventilation system, as a blueprint, with every piece turned
 * the wrong way.
 *
 * Each cell holds a length of duct — a straight, a bend, a T, or an end cap —
 * and clicking turns it a quarter. The drawing is right when every opening
 * meets an opening, nothing vents into a wall, and the whole system hangs
 * together back to the WTW.
 *
 * Openings are a four-bit mask so turning a piece is a rotate of those bits,
 * and two pieces meet when each has the side facing the other open.
 */

export const NOORD = 1;
export const OOST = 2;
export const ZUID = 4;
export const WEST = 8;

export const RICHTINGEN = [
  { bit: NOORD, dx: 0, dy: -1, terug: ZUID },
  { bit: OOST, dx: 1, dy: 0, terug: WEST },
  { bit: ZUID, dx: 0, dy: 1, terug: NOORD },
  { bit: WEST, dx: -1, dy: 0, terug: OOST },
] as const;

export const LEEG = 0;

export type Bord = {
  readonly width: number;
  readonly height: number;
  /** Opening mask per cell; 0 is no duct at all. */
  readonly masks: number[];
  /** Index of the WTW unit. */
  readonly wtw: number;
  /** Indices of the roosters, which are the dead ends. */
  readonly roosters: readonly number[];
};

/** One quarter turn clockwise: N->E->S->W->N. */
export function draai(mask: number, kwarten = 1): number {
  const n = ((kwarten % 4) + 4) % 4;
  return ((mask << n) | (mask >> (4 - n))) & 0b1111;
}

/** How many quarter turns a piece needs to look the same again. */
export function periode(mask: number): number {
  for (let k = 1; k <= 4; k++) if (draai(mask, k) === mask) return k;
  return 4;
}

/** Fewest turns from one orientation of a piece to another. */
export function afstand(van: number, naar: number): number {
  for (let k = 0; k < 4; k++) if (draai(van, k) === naar) return k;
  return -1;
}

export function openingen(mask: number): number {
  let n = 0;
  for (let b = 0; b < 4; b++) if (mask & (1 << b)) n++;
  return n;
}

export function soort(mask: number): 'leeg' | 'eind' | 'recht' | 'bocht' | 'tstuk' | 'kruis' {
  switch (openingen(mask)) {
    case 0: return 'leeg';
    case 1: return 'eind';
    case 2: return (mask === (NOORD | ZUID) || mask === (OOST | WEST)) ? 'recht' : 'bocht';
    case 3: return 'tstuk';
    default: return 'kruis';
  }
}

export function xy(bord: Bord, i: number): { x: number; y: number } {
  return { x: i % bord.width, y: Math.floor(i / bord.width) };
}

export function buur(bord: Bord, i: number, richting: typeof RICHTINGEN[number]): number {
  const { x, y } = xy(bord, i);
  const nx = x + richting.dx;
  const ny = y + richting.dy;
  if (nx < 0 || ny < 0 || nx >= bord.width || ny >= bord.height) return -1;
  return ny * bord.width + nx;
}

export type Fault =
  | { kind: 'lek'; at: number; richting: number }
  | { kind: 'los'; at: number };

/**
 * Everything wrong with the drawing: an opening that meets a wall or a blank
 * cell or a closed side, and any duct not joined back to the unit.
 */
export function faults(bord: Bord, masks: readonly number[]): Fault[] {
  const out: Fault[] = [];

  for (let i = 0; i < masks.length; i++) {
    const mask = masks[i]!;
    if (mask === LEEG) continue;
    for (const richting of RICHTINGEN) {
      if (!(mask & richting.bit)) continue;
      const j = buur(bord, i, richting);
      if (j < 0 || !(masks[j]! & richting.terug)) {
        out.push({ kind: 'lek', at: i, richting: richting.bit });
      }
    }
  }

  const bereikt = verbonden(bord, masks);
  for (let i = 0; i < masks.length; i++) {
    if (masks[i] !== LEEG && !bereikt[i]) out.push({ kind: 'los', at: i });
  }
  return out;
}

/** Which cells the air actually reaches from the unit. */
export function verbonden(bord: Bord, masks: readonly number[]): boolean[] {
  const seen = new Array<boolean>(masks.length).fill(false);
  if (masks[bord.wtw] === LEEG) return seen;
  seen[bord.wtw] = true;
  const stack = [bord.wtw];
  while (stack.length) {
    const i = stack.pop()!;
    for (const richting of RICHTINGEN) {
      if (!(masks[i]! & richting.bit)) continue;
      const j = buur(bord, i, richting);
      if (j < 0 || seen[j] || !(masks[j]! & richting.terug)) continue;
      seen[j] = true;
      stack.push(j);
    }
  }
  return seen;
}

export function isSolved(bord: Bord, masks: readonly number[]): boolean {
  return faults(bord, masks).length === 0;
}

export function stars(draaien: number, par: number): number {
  if (draaien <= par) return 3;
  if (draaien <= Math.ceil(par * 1.35)) return 2;
  return 1;
}
