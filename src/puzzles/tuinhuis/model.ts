/**
 * The tuinhuis: a tiny house on a trailer, seen from the side.
 *
 * Seven metres by four on a half-metre grid, so fourteen cells long and eight
 * high, of which the bottom two are chassis and never appear here: the model
 * only knows the fourteen by six a house can be put in. Row 0 is the floor,
 * straight on the chassis, and y counts upward, because everything in this
 * puzzle is about what something stands on.
 *
 * The pieces are the functions of the house, each a rectangle in section,
 * none of them turnable — a shower lying on its side is not a shower.
 *
 * The rules are the ones that make it a house somebody could live in, not
 * just a stack that fits: the bed under the roof with the stair up to it,
 * shower and wc together, nothing put down on the worktop or the sofa, and
 * the window in the back wall left as a window.
 */

export type Soort =
  | 'douche' | 'wc' | 'keuken' | 'techniek' | 'bank'
  | 'kasttrap' | 'vliering' | 'berging';

/**
 * What a piece demands of where it ends up. `vloer` is straight on the
 * chassis; `boven` is up under the roof, because that is where you sleep in
 * a tiny house; `raakt` is a stair: on the floor, and carrying the vliering,
 * because a stair that reaches nothing is a cupboard.
 */
export type Eis = 'vloer' | 'boven' | 'raakt' | 'vrij';

export type Stuk = {
  readonly soort: Soort;
  readonly naam: string;
  /** Size in cells: half metres. */
  readonly w: number;
  readonly h: number;
  readonly kg: number;
  readonly eis: Eis;
};

/** Where a piece sits: its left column and its bottom row. */
export type Plaatsing = { readonly stuk: number; readonly x: number; readonly y: number };

/** A rectangle of cells: left column, bottom row, size. */
export type Vak = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

export type Doorsnede = {
  readonly width: number;
  readonly height: number;
  readonly stukken: readonly Stuk[];
  /** Where the axle is, in cells from the nose. */
  readonly as: number;
  /**
   * How far the centre of mass may sit from the axle, in cells, either way.
   * Inside half of it the trailer tows properly; in the outer half it tows,
   * and costs a star.
   */
  readonly band: number;
  /** The window in the back wall. Nothing may stand in front of it. */
  readonly raam: Vak;
};

export const BREEDTE = 14;
export const HOOGTE = 6;

/**
 * The eight pieces, in cells.
 *
 * Changed from TUINHUIS.md §3 so the house that comes out is one you could
 * live in. The kasttrap is two metres, all the way up to the vliering, so it
 * can carry it; the keukenblok is a metre and a half. The werkplek is gone:
 * there was no floor left for a desk, and a desk on top of a cupboard is not
 * a desk. What has to stand on the floor fills it exactly, so the floor is a
 * question of order and nothing else.
 */
export const STUKKEN: readonly Stuk[] = [
  { soort: 'douche', naam: 'DOUCHE', w: 2, h: 4, kg: 180, eis: 'vloer' },
  { soort: 'wc', naam: 'WC', w: 2, h: 4, kg: 90, eis: 'vloer' },
  { soort: 'keuken', naam: 'KEUKENBLOK', w: 3, h: 2, kg: 250, eis: 'vloer' },
  { soort: 'techniek', naam: 'TECHNIEK', w: 2, h: 2, kg: 300, eis: 'vloer' },
  { soort: 'bank', naam: 'BANK', w: 3, h: 2, kg: 120, eis: 'vloer' },
  { soort: 'kasttrap', naam: 'KASTTRAP', w: 2, h: 4, kg: 110, eis: 'raakt' },
  { soort: 'vliering', naam: 'SLAAPVLIERING', w: 6, h: 2, kg: 220, eis: 'boven' },
  { soort: 'berging', naam: 'BERGING', w: 2, h: 2, kg: 80, eis: 'vrij' },
];

/** Stands on the chassis: the floor pieces, and the stair. */
export function opDeVloer(stuk: Stuk): boolean {
  return stuk.eis === 'vloer' || stuk.eis === 'raakt';
}

/** You do not put things down on these: you cook on one and sit on the other. */
const NIETS_OP: readonly Soort[] = ['keuken', 'bank'];

export type FaultKind =
  | 'buiten'      // sticks out past the nose or the tail, or through the floor
  | 'hoogte'      // above the four metre line
  | 'overlap'     // two things in one place
  | 'zweeft'      // not resting, all of it, on the chassis or on other pieces
  | 'vloer'       // has to stand on the floor and does not
  | 'boven'       // the vliering, not up under the roof
  | 'trap'        // the kasttrap, reaching nothing
  | 'raam'        // standing in front of the window
  | 'erop'        // put down on the worktop or the sofa
  | 'badkamer'    // douche and wc not side by side
  | 'balans';     // the whole thing, hanging wrong on the axle

/** `stuk` is the piece at fault; balance is nobody's in particular. */
export type Fault = { readonly kind: FaultKind; readonly stuk: number };

/** A grid of who is where: piece index per cell, -1 for nothing. */
export function bezetting(d: Doorsnede, plaatsingen: readonly Plaatsing[]): Int8Array {
  const grid = new Int8Array(d.width * d.height).fill(-1);
  for (const p of plaatsingen) {
    const stuk = d.stukken[p.stuk]!;
    for (let y = Math.max(0, p.y); y < Math.min(d.height, p.y + stuk.h); y++) {
      for (let x = Math.max(0, p.x); x < Math.min(d.width, p.x + stuk.w); x++) {
        grid[y * d.width + x] = p.stuk;
      }
    }
  }
  return grid;
}

function overlappen(d: Doorsnede, a: Plaatsing, b: Plaatsing): boolean {
  const sa = d.stukken[a.stuk]!;
  const sb = d.stukken[b.stuk]!;
  return a.x < b.x + sb.w && b.x < a.x + sa.w && a.y < b.y + sb.h && b.y < a.y + sa.h;
}

/** Sharing a length of edge, not just a corner. */
function raken(d: Doorsnede, a: Plaatsing, b: Plaatsing): boolean {
  const sa = d.stukken[a.stuk]!;
  const sb = d.stukken[b.stuk]!;
  const overlapX = Math.min(a.x + sa.w, b.x + sb.w) - Math.max(a.x, b.x);
  const overlapY = Math.min(a.y + sa.h, b.y + sb.h) - Math.max(a.y, b.y);
  const naast = (a.x + sa.w === b.x || b.x + sb.w === a.x) && overlapY > 0;
  const op = (a.y + sa.h === b.y || b.y + sb.h === a.y) && overlapX > 0;
  return naast || op;
}

/**
 * The centre of mass along the trailer, in cells from the nose, of whatever
 * has been put in so far. Null for an empty trailer, which hangs wherever
 * the chassis does and is nobody's problem yet.
 *
 * Only the length matters: how high the weight sits changes how the thing
 * corners, not how hard it leans on the towbar.
 */
export function zwaartepunt(d: Doorsnede, plaatsingen: readonly Plaatsing[]): number | null {
  let kg = 0;
  let moment = 0;
  for (const p of plaatsingen) {
    const stuk = d.stukken[p.stuk]!;
    kg += stuk.kg;
    moment += stuk.kg * (p.x + stuk.w / 2);
  }
  return kg === 0 ? null : moment / kg;
}

export type Balans = 'leeg' | 'netjes' | 'net' | 'neuszwaar' | 'staartzwaar';

/**
 * How it hangs. The nose is at x = 0, so weight ahead of the axle presses the
 * towbar down and weight behind it lifts the car. `net` is inside the band
 * but in its outer half: it tows, and nobody would call it tidy.
 */
export function balans(d: Doorsnede, plaatsingen: readonly Plaatsing[]): Balans {
  const z = zwaartepunt(d, plaatsingen);
  if (z === null) return 'leeg';
  const uit = z - d.as;
  // A hair of tolerance, so a section built to sit exactly on the edge of
  // the band is not thrown out by the last bit of a float.
  if (Math.abs(uit) <= d.band / 2 + 1e-9) return 'netjes';
  if (Math.abs(uit) <= d.band + 1e-9) return 'net';
  return uit < 0 ? 'neuszwaar' : 'staartzwaar';
}

/**
 * Everything wrong with the section as it stands, one fault per piece per
 * rule. An unfinished section is not a fault; that is `isSolved`'s business.
 */
export function faults(d: Doorsnede, plaatsingen: readonly Plaatsing[]): Fault[] {
  const out: Fault[] = [];
  const grid = bezetting(d, plaatsingen);
  const vliering = plaatsingen.find((p) => d.stukken[p.stuk]!.soort === 'vliering');

  for (const p of plaatsingen) {
    const stuk = d.stukken[p.stuk]!;
    if (p.x < 0 || p.x + stuk.w > d.width || p.y < 0) out.push({ kind: 'buiten', stuk: p.stuk });
    if (p.y + stuk.h > d.height) out.push({ kind: 'hoogte', stuk: p.stuk });
    if (plaatsingen.some((q) => q !== p && overlappen(d, p, q))) out.push({ kind: 'overlap', stuk: p.stuk });

    // Resting means every cell of the underside has something under it. Half
    // on is not on: an overhang in a house that does a hundred on the
    // motorway is a thing that comes off.
    if (p.y > 0) {
      let rust = true;
      for (let x = p.x; x < p.x + stuk.w; x++) {
        const onder = x >= 0 && x < d.width && p.y - 1 < d.height ? grid[(p.y - 1) * d.width + x]! : -1;
        if (onder < 0 || onder === p.stuk) rust = false;
      }
      if (!rust) out.push({ kind: 'zweeft', stuk: p.stuk });
    }

    if (opDeVloer(stuk) && p.y !== 0) out.push({ kind: 'vloer', stuk: p.stuk });
    if (stuk.eis === 'boven' && p.y + stuk.h !== d.height) out.push({ kind: 'boven', stuk: p.stuk });
    const r = d.raam;
    if (p.x < r.x + r.w && r.x < p.x + stuk.w && p.y < r.y + r.h && r.y < p.y + stuk.h) {
      out.push({ kind: 'raam', stuk: p.stuk });
    }
    if (p.y > 0) {
      for (let x = Math.max(0, p.x); x < Math.min(d.width, p.x + stuk.w); x++) {
        const onder = grid[(p.y - 1) * d.width + x]!;
        if (onder >= 0 && onder !== p.stuk && NIETS_OP.includes(d.stukken[onder]!.soort)) {
          out.push({ kind: 'erop', stuk: p.stuk });
          break;
        }
      }
    }
    // With the vliering still in the tray the stair reaches nothing either.
    if (stuk.eis === 'raakt' && !(vliering && raken(d, p, vliering))) out.push({ kind: 'trap', stuk: p.stuk });
  }

  // Only once both are in: half a bathroom is not yet a wrong one.
  const douche = plaatsingen.find((p) => d.stukken[p.stuk]!.soort === 'douche');
  const wc = plaatsingen.find((p) => d.stukken[p.stuk]!.soort === 'wc');
  if (douche && wc && !raken(d, douche, wc)) out.push({ kind: 'badkamer', stuk: wc.stuk });

  const b = balans(d, plaatsingen);
  if (b === 'neuszwaar' || b === 'staartzwaar') out.push({ kind: 'balans', stuk: -1 });
  return out;
}

/** Done when every piece is in and there is nothing left to say about it. */
export function isSolved(d: Doorsnede, plaatsingen: readonly Plaatsing[]): boolean {
  if (plaatsingen.length !== d.stukken.length) return false;
  if (new Set(plaatsingen.map((p) => p.stuk)).size !== d.stukken.length) return false;
  return faults(d, plaatsingen).length === 0;
}

/**
 * The dead cells: empty, and no use to anyone.
 *
 * Counting every empty cell would be counting nothing — nine pieces in a
 * fixed box always leave the same number over. What differs between a good
 * section and a bad one is whether the air that is left is one room or a
 * handful of gaps. So the largest connected stretch of empty cells is the
 * room, and every empty cell that is not part of it is dead: the slot beside
 * the stair, the half metre behind the shower that nobody can get to.
 *
 * Of two stretches the same size the first one found is the room; which one
 * makes no difference to the count.
 */
export function lozeCellen(d: Doorsnede, plaatsingen: readonly Plaatsing[]): number[] {
  const grid = bezetting(d, plaatsingen);
  const gezien = new Uint8Array(grid.length);
  const stukken: number[][] = [];
  for (let start = 0; start < grid.length; start++) {
    if (grid[start]! >= 0 || gezien[start]) continue;
    const stuk: number[] = [];
    const stapel = [start];
    gezien[start] = 1;
    while (stapel.length > 0) {
      const cel = stapel.pop()!;
      stuk.push(cel);
      const x = cel % d.width;
      const buren = [
        x > 0 ? cel - 1 : -1,
        x < d.width - 1 ? cel + 1 : -1,
        cel - d.width,
        cel + d.width,
      ];
      for (const buur of buren) {
        if (buur < 0 || buur >= grid.length || grid[buur]! >= 0 || gezien[buur]) continue;
        gezien[buur] = 1;
        stapel.push(buur);
      }
    }
    stukken.push(stuk);
  }
  let kamer = 0;
  stukken.forEach((s, i) => { if (s.length > stukken[kamer]!.length) kamer = i; });
  return stukken.filter((_, i) => i !== kamer).flat().sort((a, b) => a - b);
}

export function lozeRuimte(d: Doorsnede, plaatsingen: readonly Plaatsing[]): number {
  return lozeCellen(d, plaatsingen).length;
}

/** How many dead cells over par still earns the second star. */
export const SPELING = 4;

/**
 * Three for a section as tight as the best one known, two for close, one for
 * finishing. Then one off if it only just hangs right: sloppy towing is
 * allowed and is not free. Finishing is always worth one.
 */
export function stars(loos: number, par: number, netjes: boolean): number {
  const basis = loos <= par ? 3 : loos <= par + SPELING ? 2 : 1;
  return Math.max(1, netjes ? basis : basis - 1);
}
