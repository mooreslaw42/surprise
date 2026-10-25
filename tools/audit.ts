import { STAGES, stageLabel } from '../src/data/stages.ts';
import { SCHUIF_LEVELS } from '../src/puzzles/schuifwerk/levels.ts';
import { solve as schuifSolve } from '../src/puzzles/schuifwerk/solver.ts';
import { SLOOP_LEVELS, gridFor } from '../src/puzzles/sloop/levels.ts';
import { solve as sloopSolve } from '../src/puzzles/sloop/solver.ts';
import { ISOLATIE_LEVELS } from '../src/puzzles/isolatie/levels.ts';
import { solve as isoSolve } from '../src/puzzles/isolatie/solver.ts';
import { ELEKTRA_LEVELS } from '../src/puzzles/elektra/levels.ts';
import { KLOS_LEVELS } from '../src/puzzles/klossen/levels.ts';
import { solve as klosSolve } from '../src/puzzles/klossen/solver.ts';
import { VLOER_LEVELS } from '../src/puzzles/vloeren/levels.ts';
import { solve as vloerSolve } from '../src/puzzles/vloeren/solver.ts';
import { SCHILDER_LEVELS } from '../src/puzzles/schilderen/levels.ts';
import { solve as schilderSolve } from '../src/puzzles/schilderen/solver.ts';
import { KANAAL_LEVELS } from '../src/puzzles/kanalen/levels.ts';
import { solve as kanaalSolve } from '../src/puzzles/kanalen/solver.ts';

const lines: string[] = [];
function row(stage: string, id: string, maat: string, par: string, bron: string) {
  lines.push(`${stage.padEnd(22)} ${id.padEnd(30)} ${maat.padEnd(18)} ${par.padEnd(14)} ${bron}`);
}

for (const l of SCHUIF_LEVELS) {
  row('1 LEEGHALEN', l.id, `${l.plan.width}x${l.plan.height} ${l.plan.stukken.length}st`,
    `par ${schuifSolve(l.plan).par}`, 'VERZONNEN');
}
for (const l of SLOOP_LEVELS) {
  const g = gridFor(l);
  row('2 SLOOP', l.id, `${g.width}x${g.height}`, `par ${sloopSolve(g).par}`, 'GEMETEN');
}
for (const l of ISOLATIE_LEVELS) {
  row('3 ISOLATIE', l.id, `${l.muur.width}x${l.muur.height} ${l.muur.dekens.length}dek`,
    `par ${isoSolve(l.muur).par}`, 'VERZONNEN');
}
for (const l of ELEKTRA_LEVELS) {
  row('4 ELEKTRA', l.id, `${l.board.width}x${l.board.height} ${l.board.devices.length}dr`,
    `${l.board.groepen.length} groepen`, 'GEMETEN');
}
for (const l of KLOS_LEVELS) {
  row('5 DICHTZETTEN', l.id, `${l.wand.width}x${l.wand.height} ${l.wand.klossen.length}kl`,
    `${klosSolve(l.wand).slagen} slagen`, 'GEMETEN');
}
for (const l of VLOER_LEVELS) {
  row('6 VLOEREN', l.id, `${l.vloer.breedte}x${l.vloer.rijen}`,
    `par ${vloerSolve(l.vloer).par}`, 'VERZONNEN');
}
for (const l of SCHILDER_LEVELS) {
  row('7 SCHILDEREN', l.id, `${l.muur.width}x${l.muur.height}`,
    `par ${schilderSolve(l.muur).par}`, 'GEMETEN');
}
for (const l of KANAAL_LEVELS) {
  row('K KANALEN', l.id, `${l.bord.width}x${l.bord.height} ${l.bord.roosters.length}ro`,
    `par ${kanaalSolve(l.bord, l.bord.masks).par}`, 'PLATTEGROND');
}

console.log('STAGE'.padEnd(22), 'LEVEL'.padEnd(30), 'MAAT'.padEnd(18), 'PAR'.padEnd(14), 'BRON');
console.log(lines.join('\n'));
console.log('\nLADDER:', STAGES.map((s) => `${stageLabel(s)} (${s.entries.length})`).join(' | '));
