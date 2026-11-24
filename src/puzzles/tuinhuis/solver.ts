import {
  type Doorsnede, type Plaatsing,
  bezetting, isSolved, lozeRuimte, opDeVloer,
} from './model.ts';

/**
 * The search. Nothing in the game leans on it to prove the level can be done
 * — the generator builds a finished house first, so that is settled before
 * anyone asks. This exists for the hint, and for the tests, which do ask.
 *
 * It builds the way a builder does: bottom row first, left to right, then the
 * row above. Every finished section can be put together in that order,
 * because whatever a piece rests on is lower than it is, so walking the
 * placements in (row, column) order visits each section exactly once and
 * never has to wonder whether support is still coming.
 */

/** Where piece `i` could go right now: inside, free, resting, and by its own rule. */
export function plekken(d: Doorsnede, plaatsingen: readonly Plaatsing[], i: number): Plaatsing[] {
  const stuk = d.stukken[i]!;
  const grid = bezetting(d, plaatsingen);
  const out: Plaatsing[] = [];
  for (let y = 0; y + stuk.h <= d.height; y++) {
    if (opDeVloer(stuk) && y !== 0) break;
    if (stuk.eis === 'boven' && y + stuk.h !== d.height) continue;
    for (let x = 0; x + stuk.w <= d.width; x++) {
      let kan = true;
      for (let cx = x; cx < x + stuk.w && kan; cx++) {
        if (y > 0 && grid[(y - 1) * d.width + cx]! < 0) kan = false;
        for (let cy = y; cy < y + stuk.h && kan; cy++) {
          if (grid[cy * d.width + cx]! >= 0) kan = false;
        }
      }
      if (kan) out.push({ stuk: i, x, y });
    }
  }
  return out;
}

/**
 * Walk every finished section that keeps every rule, balance included, and
 * hand each to `bezoek`; stop as soon as it returns true.
 *
 * The stair's rule is left to the end rather than checked on the way: the
 * vliering it has to touch may well be placed after it.
 */
export function elkeOplossing(d: Doorsnede, bezoek: (oplossing: readonly Plaatsing[]) => boolean): void {
  const gezet: Plaatsing[] = [];
  const gebruikt = new Array<boolean>(d.stukken.length).fill(false);
  const vloerBreedte = d.stukken.reduce((n, s) => n + (opDeVloer(s) ? s.w : 0), 0);
  if (vloerBreedte > d.width) return;

  const stap = (vanY: number, vanX: number): boolean => {
    if (gezet.length === d.stukken.length) {
      return isSolved(d, gezet) && bezoek(gezet);
    }
    for (let i = 0; i < d.stukken.length; i++) {
      if (gebruikt[i]) continue;
      for (const p of plekken(d, gezet, i)) {
        if (p.y < vanY || (p.y === vanY && p.x < vanX)) continue;
        // Once the walk has left the floor nothing can be stood on it any
        // more, so a floor piece still in the tray ends this branch.
        if (p.y > 0 && d.stukken.some((s, j) => !gebruikt[j] && opDeVloer(s))) continue;
        gebruikt[i] = true;
        gezet.push(p);
        const klaar = stap(p.y, p.x);
        gezet.pop();
        gebruikt[i] = false;
        if (klaar) return true;
      }
    }
    return false;
  };
  stap(0, 0);
}

/** The first finished section the search comes to, or null when there is none. */
export function solve(d: Doorsnede): Plaatsing[] | null {
  let gevonden: Plaatsing[] | null = null;
  elkeOplossing(d, (o) => {
    gevonden = [...o];
    return true;
  });
  return gevonden;
}

/** The least dead space any finished section manages, or null when none exists. */
export function besteLoos(d: Doorsnede): number | null {
  let beste: number | null = null;
  elkeOplossing(d, (o) => {
    const loos = lozeRuimte(d, o);
    if (beste === null || loos < beste) beste = loos;
    return false;
  });
  return beste;
}

/** A stored solution in building order: nothing goes in before what it rests on. */
export function bouwvolgorde(oplossing: readonly Plaatsing[]): Plaatsing[] {
  return [...oplossing].sort((a, b) => a.y - b.y || a.x - b.x);
}

/**
 * The hint: the next piece of the stored solution that is not yet where the
 * solution has it, lowest first. Everything before it in building order is
 * already right, so what it rests on is there.
 */
export function hint(oplossing: readonly Plaatsing[], plaatsingen: readonly Plaatsing[]): Plaatsing | null {
  for (const doel of bouwvolgorde(oplossing)) {
    const nu = plaatsingen.find((p) => p.stuk === doel.stuk);
    if (!nu || nu.x !== doel.x || nu.y !== doel.y) return doel;
  }
  return null;
}

/**
 * Put the hinted piece in: lift it from wherever it was, clear out whatever
 * is standing in its cells, set it down. What gets cleared goes back to the
 * tray, which costs nothing here.
 */
export function pasHintToe(
  d: Doorsnede, oplossing: readonly Plaatsing[], plaatsingen: readonly Plaatsing[],
): Plaatsing[] {
  const doel = hint(oplossing, plaatsingen);
  if (!doel) return [...plaatsingen];
  const cellen = new Set<number>();
  const stuk = d.stukken[doel.stuk]!;
  for (let y = doel.y; y < doel.y + stuk.h; y++) {
    for (let x = doel.x; x < doel.x + stuk.w; x++) cellen.add(y * d.width + x);
  }
  const blijft = plaatsingen.filter((p) => {
    if (p.stuk === doel.stuk) return false;
    const s = d.stukken[p.stuk]!;
    for (let y = p.y; y < p.y + s.h; y++) {
      for (let x = p.x; x < p.x + s.w; x++) if (cellen.has(y * d.width + x)) return false;
    }
    return true;
  });
  return [...blijft, doel];
}
