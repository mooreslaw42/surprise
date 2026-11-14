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
 *
 * That much is a patience: turn things until they light up. What makes it a
 * puzzle is that a WTW is two systems, not one. Fresh air goes out to the
 * rooms on the TOEVOER and stale air comes back on the AFVOER, each from its
 * own side of the unit, each to its own roosters, and the two must never
 * join — a kitchen extract blowing into the bedroom supply is the one thing
 * the whole machine exists to prevent. Where they have to pass each other
 * there is a kruising: one duct over the other, not joined, and not turnable.
 *
 * So a piece that fits its neighbours is no longer enough. It has to fit
 * them on the right system, and every plan is chosen so that only one
 * arrangement of the whole drawing does.
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
  /**
   * Where the stale air comes back to. With this set the drawing is two
   * systems: `wtw` feeds the toevoer and this collects the afvoer.
   */
  readonly afvoer?: number;
  /** Which of the roosters are on the afvoer. The rest are toevoer. */
  readonly afRoosters?: readonly number[];
  /** Cells where two ducts cross without joining. All four sides open. */
  readonly kruisingen?: readonly number[];
};

export const TOE = 1;
export const AF = 2;

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

/** Fewest turns either way round: the right mouse button turns it back. */
export function kortste(van: number, naar: number): number {
  const d = afstand(van, naar);
  return d < 0 ? d : Math.min(d, periode(van) - d);
}

/** Clockwise turns from one orientation of a piece to another. */
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
  | { kind: 'los'; at: number }
  /** Toevoer and afvoer meet here: the two systems are one system. */
  | { kind: 'gemengd'; at: number }
  /** A rooster hanging on the wrong system. */
  | { kind: 'verkeerd'; at: number };

/**
 * Which system reaches each cell: TOE, AF, both, or neither. Kept per axis,
 * because at a kruising the duct running east-west and the one running
 * north-south are two different ducts. Everywhere else the two agree.
 */
export type Lucht = { readonly h: Uint8Array; readonly v: Uint8Array };

export function lucht(bord: Bord, masks: readonly number[]): Lucht {
  const h = new Uint8Array(masks.length);
  const v = new Uint8Array(masks.length);
  const kruis = new Set(bord.kruisingen ?? []);

  const stroom = (bron: number, merk: number): void => {
    if (masks[bron] === LEEG || masks[bron] === undefined) return;
    // Each entry is a cell and the side the air came in by (-1 at the unit).
    const stack: [number, number][] = [[bron, -1]];
    while (stack.length) {
      const [i, binnen] = stack.pop()!;
      const dwars = kruis.has(i);
      const horizontaal = binnen === OOST || binnen === WEST;
      if (dwars) {
        const as = horizontaal ? h : v;
        if (as[i]! & merk) continue;
        as[i] = as[i]! | merk;
      } else {
        if (h[i]! & merk) continue;
        h[i] = h[i]! | merk;
        v[i] = v[i]! | merk;
      }
      for (const richting of RICHTINGEN) {
        if (!(masks[i]! & richting.bit)) continue;
        // Over a kruising the air only goes straight on.
        if (dwars && binnen >= 0 && richting.terug !== binnen) continue;
        const j = buur(bord, i, richting);
        if (j < 0 || !(masks[j]! & richting.terug)) continue;
        stack.push([j, richting.terug]);
      }
    }
  };

  stroom(bord.wtw, TOE);
  if (bord.afvoer !== undefined) stroom(bord.afvoer, AF);
  return { h, v };
}

/**
 * Everything wrong with the drawing: an opening that meets a wall or a blank
 * cell or a closed side, duct not joined back to a unit, the two systems
 * joined to each other, and a rooster on the wrong one.
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

  const { h, v } = lucht(bord, masks);
  const af = new Set(bord.afRoosters ?? []);
  for (let i = 0; i < masks.length; i++) {
    if (masks[i] === LEEG) continue;
    if (h[i] === 0 || v[i] === 0) out.push({ kind: 'los', at: i });
    if (h[i] === (TOE | AF) || v[i] === (TOE | AF)) out.push({ kind: 'gemengd', at: i });
  }
  for (const i of bord.roosters) {
    const moet = af.has(i) ? AF : TOE;
    if (h[i] !== 0 && h[i] !== moet) out.push({ kind: 'verkeerd', at: i });
  }
  return out;
}

/** Which cells the fresh air actually reaches from the unit. */
export function verbonden(bord: Bord, masks: readonly number[]): boolean[] {
  const { h, v } = lucht(bord, masks);
  return masks.map((_, i) => Boolean((h[i]! | v[i]!) & TOE));
}

export function isSolved(bord: Bord, masks: readonly number[]): boolean {
  return faults(bord, masks).length === 0;
}

export function stars(draaien: number, par: number): number {
  if (draaien <= par) return 3;
  if (draaien <= Math.ceil(par * 1.35)) return 2;
  return 1;
}
