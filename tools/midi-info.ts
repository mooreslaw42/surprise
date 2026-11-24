/** List what is in a MIDI file: tempo, metre, and per channel the instrument and range. */
import { readFileSync } from 'node:fs';
import { GM_FAMILIE, leesMidi } from './midi.ts';

for (const pad of process.argv.slice(2)) {
  const m = leesMidi(new Uint8Array(readFileSync(pad)));
  const bpm = m.tempi.map((t) => Math.round(60e6 / t.usPerKwart));
  console.log(`\n== ${pad}  ppq ${m.ticksPerKwart}  bpm ${[...new Set(bpm)].join(',')}  maat ${m.maatsoorten.map((x) => `${x.teller}/${x.noemer}@${x.tick}`).join(' ')}`);
  m.sporen.forEach((s, i) => {
    const perKanaal = new Map<number, typeof s.noten[number][]>();
    for (const n of s.noten) {
      if (!perKanaal.has(n.kanaal)) perKanaal.set(n.kanaal, []);
      perKanaal.get(n.kanaal)!.push(n);
    }
    for (const [k, ns] of perKanaal) {
      const prog = s.programma.get(k) ?? 0;
      const soort = k === 9 ? 'DRUMS' : `${GM_FAMILIE[prog >> 3]} ${prog}`;
      const tonen = ns.map((n) => n.toon);
      const eerste = (ns[0]!.start / m.ticksPerKwart / 4).toFixed(1);
      const laatste = (ns[ns.length - 1]!.start / m.ticksPerKwart / 4).toFixed(1);
      console.log(`  spoor ${i} k${k + 1} ${soort.padEnd(12)} ${String(ns.length).padStart(5)} noten  ${Math.min(...tonen)}-${Math.max(...tonen)}  maat ${eerste}-${laatste}  "${s.naam}"`);
    }
  });
}
