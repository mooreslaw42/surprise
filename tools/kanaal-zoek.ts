/**
 * Kanaalplannen with exactly one answer.
 *
 *   node --experimental-strip-types tools/kanaal-zoek.ts <ruimtes,> <toe> <af|-> <kruisingen min> <par van> <par tot> [pogingen]
 *
 * With af "-" the plan is one system, like the first one always was. Either
 * way a seed is only kept when the counter finds a single arrangement.
 */
import { gebiedVan, maakDubbel, maakPlan, alsBron, dubbelAlsBron } from '../src/puzzles/kanalen/generate.ts';
import { periode, draai, type Bord } from '../src/puzzles/kanalen/model.ts';
import { solve, tel } from '../src/puzzles/kanalen/solver.ts';

const [ruimtes, toeArg, afArg, kruisArg, vanArg, totArg, pogingenArg] = process.argv.slice(2);
const gebied = gebiedVan(ruimtes!.split(','));
const toe = Number(toeArg);
let beste: { bord: Bord; par: number; seed: number } | null = null;

for (let seed = 1; seed <= Number(pogingenArg ?? 400); seed++) {
  let bord: Bord | null;
  if (afArg === '-') {
    const plan = maakPlan({ gebied, wtw: toe, draaien: gebied.length, seed });
    // Turn everything, not a chosen few.
    let s = seed * 31 + 7;
    const masks = plan.bord.masks.map((m) => {
      const p = periode(m);
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return p > 1 ? draai(m, s % p) : m;
    });
    bord = { ...plan.bord, masks };
  } else {
    bord = maakDubbel({ gebied, toe, af: Number(afArg), kruisKans: 0.9, seed });
  }
  if (!bord) continue;
  if ((bord.kruisingen ?? []).length < Number(kruisArg)) continue;
  if (afArg !== '-') {
    const af = (bord.afRoosters ?? []).length;
    if (af < 2 || bord.roosters.length - af < 2) continue;
  }
  let uniek: boolean;
  let par: number;
  try {
    uniek = tel(bord, bord.masks, 2, 3_000_000) === 1;
    if (!uniek) continue;
    par = solve(bord, bord.masks).par;
  } catch { continue; }
  if (par < Number(vanArg) || par > Number(totArg)) continue;
  if (!beste || (bord.kruisingen ?? []).length > (beste.bord.kruisingen ?? []).length) beste = { bord, par, seed };
  if ((beste.bord.kruisingen ?? []).length >= Number(kruisArg) + 1 || afArg === '-') break;
}
if (!beste) console.log('niets');
else {
  const b = beste.bord;
  console.log(`seed ${beste.seed}  par ${beste.par}  roosters ${b.roosters.length} (${(b.afRoosters ?? []).length} afvoer)  kruisingen ${(b.kruisingen ?? []).length}`);
  console.log(afArg === '-' ? alsBron(b) : dubbelAlsBron(b));
}
