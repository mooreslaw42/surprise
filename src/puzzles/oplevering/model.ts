import { PLATTEGROND, ruimteOp } from '../../data/plattegrond.ts';
import { LEEG, RICHTINGEN, type Bord } from '../kanalen/model.ts';

/**
 * Oplevering: the unit is finally here, and it has to go in.
 *
 * Air does not travel across a floor plan. It goes under the floor to the
 * room, up a shaft, and over the ceiling to the roosters. So the board is
 * two drawings of the same house — ONDER DE VLOER and BOVEN HET PLAFOND —
 * and the only thing joining them is a schacht: a boxed-in duct against an
 * inside wall, which the player has to site.
 *
 * Each drawing on its own is the kanaalplan the player already knows: turn
 * the pieces until every opening meets an opening. What is new is that
 * neither can be finished alone. The ceiling of a room is not connected to
 * anything until a schacht reaches it, and a schacht can only stand where
 * there is duct on both drawings and nothing of his own already in the wall.
 *
 * Turning a piece never moves it, so where a schacht can go is fixed by the
 * drawing and where it may go is fixed by the eight phases before this one.
 */

export const BREEDTE = PLATTEGROND.width;
export const HOOGTE = PLATTEGROND.height;
export const CELLEN = BREEDTE * HOOGTE;

export const SCHACHTEN = 3;

/** Why a cell against an inside wall cannot take a schacht. */
export type Reden = 'kabel' | 'klos';

export type Kandidaat = {
  /** The cell, same index on both drawings. */
  readonly cel: number;
  /** Which named wall it stands against, for the message. */
  readonly wand: string;
  /** Something of the player's own is in the wall here. */
  readonly bezet: Reden | null;
  /** Fresh paint: allowed, and it costs a star. */
  readonly geschilderd: boolean;
};

export type Baasbord = {
  /** Opening masks as shipped: both drawings, turned wrong. */
  readonly vloer: readonly number[];
  readonly plafond: readonly number[];
  /** Where the unit stands, on the floor drawing. */
  readonly wtw: number;
  /** The dead ends on the ceiling drawing. */
  readonly roosters: readonly number[];
  readonly kandidaten: readonly Kandidaat[];
  /** One way it comes right, kept from the making: proof, and the hint. */
  readonly oplossing: {
    readonly vloer: readonly number[];
    readonly plafond: readonly number[];
    readonly schachten: readonly number[];
  };
};

export type Stand = {
  vloer: number[];
  plafond: number[];
  schachten: number[];
};

export function begin(bord: Baasbord): Stand {
  return { vloer: [...bord.vloer], plafond: [...bord.plafond], schachten: [] };
}

/** One drawing as a kanaalplan board, so that puzzle's code can read it. */
export function laag(masks: readonly number[], wtw: number): Bord {
  return { width: BREEDTE, height: HOOGTE, masks: [...masks], wtw, roosters: [] };
}

export function kandidaatOp(bord: Baasbord, cel: number): Kandidaat | undefined {
  return bord.kandidaten.find((k) => k.cel === cel);
}

/**
 * Whether a schacht may stand here, and if not, why. 'geen' is not a
 * candidate at all; 'leeg' is a candidate with no duct to join on one of the
 * two drawings, which no amount of turning will fix.
 */
export type Weigering = Reden | 'geen' | 'leeg' | 'rooster' | 'vol';

export function magSchacht(bord: Baasbord, stand: Stand, cel: number): Weigering | null {
  const k = kandidaatOp(bord, cel);
  if (!k) return 'geen';
  if (k.bezet) return k.bezet;
  if (bord.vloer[cel] === LEEG || bord.plafond[cel] === LEEG) return 'leeg';
  if (bord.roosters.includes(cel)) return 'rooster';
  if (stand.schachten.length >= SCHACHTEN && !stand.schachten.includes(cel)) return 'vol';
  return null;
}

/** Which room a cell is in, as an index into the floor plan's list. */
export function kamerVan(cel: number): number {
  const ruimte = ruimteOp(cel % BREEDTE, Math.floor(cel / BREEDTE));
  return ruimte ? PLATTEGROND.ruimtes.indexOf(ruimte) : -1;
}

/**
 * Sides of a piece that face a wall, a blank cell or a closed side.
 *
 * Over the ceiling a room is a room: duct does not cross the wall between
 * two of them, so there an opening into the next room counts as open too.
 * That is what makes every room need a schacht of its own, and it is what
 * keeps par exact — the three ceilings come right independently.
 */
function lekken(masks: readonly number[], perKamer: boolean): number[] {
  const out: number[] = [];
  for (let i = 0; i < masks.length; i++) {
    const mask = masks[i]!;
    if (mask === LEEG) continue;
    const x = i % BREEDTE;
    const y = Math.floor(i / BREEDTE);
    for (const r of RICHTINGEN) {
      if (!(mask & r.bit)) continue;
      const nx = x + r.dx;
      const ny = y + r.dy;
      const j = nx < 0 || ny < 0 || nx >= BREEDTE || ny >= HOOGTE ? -1 : ny * BREEDTE + nx;
      if (j < 0 || !(masks[j]! & r.terug) || (perKamer && kamerVan(j) !== kamerVan(i))) {
        out.push(i);
        break;
      }
    }
  }
  return out;
}

/**
 * Where the air gets to, on both drawings at once. Along a drawing where two
 * openings meet, and between drawings wherever a schacht stands.
 */
export function bereikt(bord: Baasbord, stand: Stand): { vloer: boolean[]; plafond: boolean[] } {
  const seen = [new Array<boolean>(CELLEN).fill(false), new Array<boolean>(CELLEN).fill(false)];
  const lagen = [stand.vloer, stand.plafond];
  if (stand.vloer[bord.wtw] === LEEG) return { vloer: seen[0]!, plafond: seen[1]! };

  seen[0]![bord.wtw] = true;
  const stack: [number, number][] = [[0, bord.wtw]];
  while (stack.length) {
    const [l, i] = stack.pop()!;
    const masks = lagen[l]!;
    const x = i % BREEDTE;
    const y = Math.floor(i / BREEDTE);
    for (const r of RICHTINGEN) {
      if (!(masks[i]! & r.bit)) continue;
      const nx = x + r.dx;
      const ny = y + r.dy;
      if (nx < 0 || ny < 0 || nx >= BREEDTE || ny >= HOOGTE) continue;
      const j = ny * BREEDTE + nx;
      if (seen[l]![j] || !(masks[j]! & r.terug)) continue;
      if (l === 1 && kamerVan(j) !== kamerVan(i)) continue;
      seen[l]![j] = true;
      stack.push([l, j]);
    }
    const ander = 1 - l;
    if (stand.schachten.includes(i) && lagen[ander]![i] !== LEEG && !seen[ander]![i]) {
      seen[ander]![i] = true;
      stack.push([ander, i]);
    }
  }
  return { vloer: seen[0]!, plafond: seen[1]! };
}

export type Gebreken = {
  /** Pieces with an opening onto nothing, per drawing. */
  readonly lekVloer: readonly number[];
  readonly lekPlafond: readonly number[];
  /** Duct the air does not reach. */
  readonly losVloer: readonly number[];
  readonly losPlafond: readonly number[];
};

export function gebreken(bord: Baasbord, stand: Stand): Gebreken {
  const lucht = bereikt(bord, stand);
  const los = (masks: readonly number[], seen: readonly boolean[]): number[] => {
    const out: number[] = [];
    for (let i = 0; i < masks.length; i++) if (masks[i] !== LEEG && !seen[i]) out.push(i);
    return out;
  };
  return {
    lekVloer: lekken(stand.vloer, false),
    lekPlafond: lekken(stand.plafond, true),
    losVloer: los(stand.vloer, lucht.vloer),
    losPlafond: los(stand.plafond, lucht.plafond),
  };
}

export function isSolved(bord: Baasbord, stand: Stand): boolean {
  if (stand.schachten.length > SCHACHTEN) return false;
  if (stand.schachten.some((cel) => magSchacht(bord, { ...stand, schachten: [] }, cel) !== null)) return false;
  const g = gebreken(bord, stand);
  return g.lekVloer.length + g.lekPlafond.length + g.losVloer.length + g.losPlafond.length === 0;
}

/** Roosters with air coming out of them, which is the number worth showing. */
export function roostersAan(bord: Baasbord, stand: Stand): number {
  const lucht = bereikt(bord, stand);
  return bord.roosters.filter((i) => lucht.plafond[i]).length;
}

export function doorVerf(bord: Baasbord, stand: Stand): boolean {
  return stand.schachten.some((cel) => kandidaatOp(bord, cel)?.geschilderd);
}

/** On turns, like every kanaalplan; a schacht through fresh paint costs one. */
export function stars(draaien: number, par: number, verf: boolean): number {
  const basis = draaien <= par ? 3 : draaien <= Math.ceil(par * 1.35) ? 2 : 1;
  return Math.max(1, basis - (verf ? 1 : 0));
}
