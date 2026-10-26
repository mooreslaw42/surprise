import { gebiedVan, maakPlan, zoekPlan, alsBron } from '../src/puzzles/kanalen/generate.ts';
import { KANAAL_LEVELS } from '../src/puzzles/kanalen/levels.ts';
import { solve } from '../src/puzzles/kanalen/solver.ts';
import { LEEG } from '../src/puzzles/kanalen/model.ts';

/**
 * Candidate boards for a kanaalplan, so a new one can be slotted into the
 * ladder without landing out of step with the plans either side of it.
 */

const bestaand = KANAAL_LEVELS.map((l) => ({
  id: l.id,
  cellen: l.bord.masks.filter((m) => m !== LEEG).length,
  par: solve(l.bord, l.bord.masks).par,
}));
console.log('BESTAAND:', bestaand.map((b) => `${b.id} ${b.cellen}c par ${b.par}`).join(' | '));

const gebied = gebiedVan(['WOONKAMER', 'KEUKEN']);
console.log(`GEBIED: ${gebied.length} cellen\n`);

// Sweep: how many pieces turned wrong, against where the unit hangs.
for (const wtw of [5, 9, 25, 0]) {
  for (const draaien of [30, 34, 38, 42, 46, 50]) {
    const hit = zoekPlan({
      gebied, wtw, draaien,
      parVan: 27, parTot: 68,
      roostersVan: 8, roostersTot: 17,
      pogingen: 60,
    });
    if (!hit) { console.log(`wtw ${wtw}  draaien ${draaien}  -`); continue; }
    console.log(`wtw ${String(wtw).padStart(2)}  draaien ${draaien}  seed ${String(hit.seed).padStart(3)}  par ${String(hit.par).padStart(2)}  roosters ${hit.bord.roosters.length}`);
  }
}

// Detail for whichever one is picked, ready to paste.
const kies = process.argv.slice(2);
if (kies.length === 3) {
  const [wtw, draaien, seed] = kies.map(Number) as [number, number, number];
  const plan = maakPlan({ gebied, wtw, draaien, seed });
  console.log(`\nGEKOZEN wtw ${wtw} draaien ${draaien} seed ${seed} -> par ${plan.par}, ${plan.bord.roosters.length} roosters\n`);
  console.log(alsBron(plan.bord));
}
