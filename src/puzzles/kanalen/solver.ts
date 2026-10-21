import {
  type Bord,
  LEEG, NOORD, OOST, ZUID, WEST,
  afstand, draai, isSolved, periode,
} from './model.ts';

/**
 * Fewest quarter turns that make the drawing right.
 *
 * Cells are fixed in reading order, so by the time one is decided its left
 * and upper neighbours already are: whether their facing sides are open is
 * known, and so is whether this cell sits against an edge. That settles most
 * orientations outright and the search barely branches.
 *
 * Every valid arrangement is enumerated and the cheapest kept, so par is a
 * proven minimum even when a board has more than one way to come right.
 */

const NODE_BUDGET = 2_000_000;

export type SolveResult = { par: number; oplossing: number[] };

export function solve(bord: Bord, masks: readonly number[]): SolveResult {
  const n = masks.length;
  // Each piece's distinct orientations: a straight has two, a cross one.
  const keuzes: number[][] = masks.map((mask) => {
    const out: number[] = [];
    for (let k = 0; k < periode(mask); k++) out.push(draai(mask, k));
    return out;
  });

  const gekozen = new Array<number>(n).fill(0);
  type Beste = { kosten: number; masks: number[] };
  // Held in an array rather than a `let`: assignments made inside the
  // recursion are invisible to control-flow narrowing, and the variable
  // would still read as null afterwards.
  const beste: Beste[] = [];
  let nodes = 0;

  const plaats = (i: number, kosten: number): void => {
    if (++nodes > NODE_BUDGET) throw new Error('kanalen solver gave up');
    if (beste[0] && kosten >= beste[0].kosten) return;
    if (i === n) {
      // Shape is guaranteed by the constraints; connectivity is not.
      if (isSolved(bord, gekozen)) beste[0] = { kosten, masks: [...gekozen] };
      return;
    }
    const x = i % bord.width;
    const y = Math.floor(i / bord.width);

    for (const kandidaat of keuzes[i]!) {
      if (x === 0 && (kandidaat & WEST)) continue;
      if (x === bord.width - 1 && (kandidaat & OOST)) continue;
      if (y === 0 && (kandidaat & NOORD)) continue;
      if (y === bord.height - 1 && (kandidaat & ZUID)) continue;
      if (x > 0) {
        const links = gekozen[i - 1]!;
        if (Boolean(links & OOST) !== Boolean(kandidaat & WEST)) continue;
      }
      if (y > 0) {
        const boven = gekozen[i - bord.width]!;
        if (Boolean(boven & ZUID) !== Boolean(kandidaat & NOORD)) continue;
      }
      gekozen[i] = kandidaat;
      plaats(i + 1, kosten + afstand(masks[i]!, kandidaat));
    }
    gekozen[i] = LEEG;
  };

  plaats(0, 0);
  const gevonden = beste[0];
  if (!gevonden) throw new Error('this drawing cannot be made right');
  return { par: gevonden.kosten, oplossing: gevonden.masks };
}
