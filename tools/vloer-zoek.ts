/**
 * Plank length and joint spacing for a floor of a given shape.
 *
 * The rooms are the real rooms now, which are very nearly rectangles, and a
 * rectangle laid om-en-om is not a puzzle. What is left to choose is the
 * plank and how far joints must stay apart. This tries every pair and prints
 * par beside the best any two-row rhythm can do. Keep a pair where the
 * rhythm loses by more than the two planks a second star forgives.
 *
 *   node --experimental-strip-types tools/vloer-zoek.ts <breedte> <rijen> [kort:van-tot:hoeveel]
 *
 * The optional last argument shortens a run of courses, for a pier.
 */
import { isSolved, totaalPlanken, type Vloer } from '../src/puzzles/vloeren/model.ts';
import { solve } from '../src/puzzles/vloeren/solver.ts';

const [bArg, rArg, kortArg] = process.argv.slice(2);
const b = Number(bArg);
const n = Number(rArg);
const kort = kortArg ? kortArg.split(':')[0]!.split('-').map(Number) : null;
const minder = kortArg ? Number(kortArg.split(':')[1]) : 0;
const vorm = Array.from({ length: n }, (_, r) => ({
  links: 0,
  breedte: kort && r >= kort[0]! && r <= kort[1]! ? b - minder : b,
}));

for (let plank = 4; plank <= 9; plank++) {
  for (let versprong = 2; versprong <= 4; versprong++) {
    const v: Vloer = { vorm, plank, versprong };
    let par: number;
    try { par = solve(v).par; } catch { continue; }
    // Best any om-en-om rhythm can do.
    let ritme = Infinity;
    for (let a = 1; a <= plank; a++) {
      for (let c = 1; c <= plank; c++) {
        const plan = vorm.map((_, r) => (r % 2 === 0 ? a : c));
        if (isSolved(v, plan)) ritme = Math.min(ritme, totaalPlanken(v, plan));
      }
    }
    console.log(`plank ${plank} versprong ${versprong}  par ${par}  beste ritme ${ritme === Infinity ? '-' : ritme}`);
  }
}
