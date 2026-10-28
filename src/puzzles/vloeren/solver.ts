import { type Legplan, type Vloer, nadenBotsen, planken, restant, totaalPlanken } from './model.ts';

/**
 * The tidiest floor: fewest planks opened.
 *
 * One row only ever looks at the one above it — for the joints — and at what
 * that row left over — for the free start. So the whole thing is a walk
 * across rows with the previous row's first plank as the only state, and the
 * best floor falls out of a small table. That the room is ragged changes the
 * numbers in each cell of the table, not the shape of the walk.
 *
 * Par is therefore a proven minimum.
 */

export type SolveResult = { par: number; plan: Legplan };

export function solve(v: Vloer): SolveResult {
  const R = v.vorm.length;
  const INF = Infinity;
  const keuzes = (r: number): number => Math.min(v.plank, v.vorm[r]!.breedte);

  // kosten[r][e] = fewest planks for rows r.. given row r starts with e.
  const kosten: number[][] = Array.from({ length: R }, () => new Array<number>(v.plank + 1).fill(INF));
  const keuze: number[][] = Array.from({ length: R }, () => new Array<number>(v.plank + 1).fill(0));

  for (let r = R - 1; r >= 0; r--) {
    for (let e = 1; e <= keuzes(r); e++) {
      if (r === R - 1) {
        kosten[r]![e] = 0;
        continue;
      }
      const over = restant(v, r, e);
      let beste = INF;
      let besteKeuze = 0;
      for (let n = 1; n <= keuzes(r + 1); n++) {
        if (nadenBotsen(v, r, e, r + 1, n)) continue;
        const hier = planken(v, r + 1, n, over) + kosten[r + 1]![n]!;
        if (hier < beste) { beste = hier; besteKeuze = n; }
      }
      kosten[r]![e] = beste;
      keuze[r]![e] = besteKeuze;
    }
  }

  let beste = INF;
  let start = 0;
  for (let e = 1; e <= keuzes(0); e++) {
    const hier = planken(v, 0, e, 0) + kosten[0]![e]!;
    if (hier < beste) { beste = hier; start = e; }
  }
  if (!Number.isFinite(beste) || start === 0) throw new Error('this floor cannot be laid to the rules');

  const plan: Legplan = [start];
  for (let r = 0; r + 1 < R; r++) {
    const volgende = keuze[r]![plan[r]!]!;
    if (!volgende) throw new Error('this floor cannot be laid to the rules');
    plan.push(volgende);
  }
  return { par: totaalPlanken(v, plan), plan };
}
