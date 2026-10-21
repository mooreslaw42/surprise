import { SURFACES } from '../src/data/house.ts';
import { gridSize } from '../src/puzzles/sloop/generate.ts';
import { zoekWand, blokVan } from '../src/puzzles/klossen/generate.ts';
import { solve } from '../src/puzzles/klossen/solver.ts';

for (const surface of SURFACES) {
  const { cols, rows } = gridSize(surface);
  const vrij = blokVan(surface).filter((b) => !b).length;
  const regels: string[] = [];
  for (const aantal of [6, 7, 8, 9, 10, 11, 12]) {
    for (const moeilijk of [true, false]) {
      const hit = zoekWand({ surface, aantal, moeilijk, pogingen: 1500 });
      if (!hit) continue;
      const r = solve(hit.wand);
      regels.push(`${aantal}k seed ${hit.seed} slagen ${r.slagen}${moeilijk ? ' HARD' : ''}`);
      break;
    }
  }
  console.log(`${surface.id.padEnd(24)} ${cols}x${rows} vrij ${vrij}  ${regels.join(' | ')}`);
}
