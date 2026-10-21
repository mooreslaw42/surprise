import { type Legplan, type Vloer, faults, planken, restant, totaalPlanken } from './model.ts';

/**
 * The tidiest floor: fewest planks opened.
 *
 * One row only ever looks at the one above it — for the joints — and at what
 * that row left over — for the free start. So the whole thing is a walk
 * across rows with the previous row's first plank as the only state, and the
 * best floor falls out of a small table.
 *
 * Par is therefore a proven minimum.
 */

export type SolveResult = { par: number; plan: Legplan };

export function solve(v: Vloer): SolveResult {
  const keuzes = Math.min(v.plank, v.breedte);
  const INF = Infinity;

  // kosten[r][e] = fewest planks for rows r.. given row r starts with e.
  const kosten: number[][] = Array.from({ length: v.rijen }, () => new Array<number>(keuzes + 1).fill(INF));
  const keuze: number[][] = Array.from({ length: v.rijen }, () => new Array<number>(keuzes + 1).fill(0));

  for (let r = v.rijen - 1; r >= 0; r--) {
    for (let e = 1; e <= keuzes; e++) {
      if (r === v.rijen - 1) {
        kosten[r]![e] = 0;
        continue;
      }
      const over = restant(v, e);
      let beste = INF;
      let besteKeuze = 0;
      for (let n = 1; n <= keuzes; n++) {
        // Only the joint rule links two rows; reuse the shared check for it.
        const fout = faults({ ...v, rijen: 2 }, [e, n]).some((f) => f.kind === 'naad');
        if (fout) continue;
        const hier = planken(v, n, over) + kosten[r + 1]![n]!;
        if (hier < beste) { beste = hier; besteKeuze = n; }
      }
      kosten[r]![e] = beste;
      keuze[r]![e] = besteKeuze;
    }
  }

  let beste = INF;
  let start = 0;
  for (let e = 1; e <= keuzes; e++) {
    const hier = planken(v, e, 0) + kosten[0]![e]!;
    if (hier < beste) { beste = hier; start = e; }
  }
  if (!Number.isFinite(beste)) throw new Error('this floor cannot be laid to the rules');

  const plan: Legplan = [start];
  for (let r = 0; r + 1 < v.rijen; r++) {
    const volgende = keuze[r]![plan[r]!]!;
    if (!volgende) throw new Error('this floor cannot be laid to the rules');
    plan.push(volgende);
  }
  return { par: totaalPlanken(v, plan), plan };
}
