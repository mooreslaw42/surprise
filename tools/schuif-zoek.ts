/**
 * Hard rooms for Leeghalen, found rather than drawn.
 *
 * A random room is almost always easy. So: fill a room at random, walk every
 * position it can reach, and then ask which of those positions is furthest
 * from having the bank out of the door. That one is the puzzle. The same
 * trick the published Rush Hour sets were made with.
 *
 *   node --experimental-strip-types tools/schuif-zoek.ts [van] [tot] [pogingen] [stukken]
 */
const N = 6;
const RIJ = 2;

type P = { len: number; hor: boolean; vast: number };   // vast: the row or column it lives in

function rng(seed: number): () => number {
  let s = seed || 1;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

function bezet(ps: P[], pos: number[]): Uint8Array {
  const b = new Uint8Array(N * N);
  ps.forEach((p, i) => {
    for (let k = 0; k < p.len; k++) b[p.hor ? p.vast * N + pos[i]! + k : (pos[i]! + k) * N + p.vast] = 1;
  });
  return b;
}

function buren(ps: P[], pos: number[]): number[][] {
  const b = bezet(ps, pos);
  const out: number[][] = [];
  ps.forEach((p, i) => {
    const cel = (a: number) => (p.hor ? p.vast * N + a : a * N + p.vast);
    for (let a = pos[i]! - 1; a >= 0 && !b[cel(a)]; a--) { const q = [...pos]; q[i] = a; out.push(q); }
    for (let a = pos[i]! + 1; a + p.len <= N && !b[cel(a + p.len - 1)]; a++) { const q = [...pos]; q[i] = a; out.push(q); }
  });
  return out;
}

function maak(next: () => number, aantal: number): { ps: P[]; pos: number[] } | null {
  const ps: P[] = [{ len: 2, hor: true, vast: RIJ }];
  const pos = [Math.floor(next() * 3)];
  for (let t = 0; t < 200 && ps.length < aantal; t++) {
    const len = next() < 0.3 ? 3 : 2;
    const hor = next() < 0.45;
    const vast = Math.floor(next() * N);
    if (hor && vast === RIJ) continue;                // nothing else lies in the door's row
    const a = Math.floor(next() * (N - len + 1));
    const b = bezet(ps, pos);
    let vrij = true;
    for (let k = 0; k < len; k++) if (b[hor ? vast * N + a + k : (a + k) * N + vast]) vrij = false;
    if (!vrij) continue;
    ps.push({ len, hor, vast });
    pos.push(a);
  }
  return ps.length === aantal ? { ps, pos } : null;
}

/** The position in this room's whole reachable set that is furthest from solved. */
function verste(ps: P[], start: number[]): { pos: number[]; par: number } | null {
  const key = (p: number[]) => p.join('');
  const alle = new Map<string, number[]>([[key(start), start]]);
  const rij = [start];
  while (rij.length) {
    if (alle.size > 12000) return null;
    const p = rij.pop()!;
    for (const q of buren(ps, p)) {
      const k = key(q);
      if (!alle.has(k)) { alle.set(k, q); rij.push(q); }
    }
  }
  const afstand = new Map<string, number>();
  let laag: number[][] = [];
  for (const [k, p] of alle) if (p[0]! + 2 === N) { afstand.set(k, 0); laag.push(p); }
  if (laag.length === 0) return null;
  let d = 0;
  let laatste = laag;
  while (laag.length) {
    laatste = laag;
    const volgende: number[][] = [];
    d++;
    for (const p of laag) {
      for (const q of buren(ps, p)) {
        const k = key(q);
        if (!afstand.has(k)) { afstand.set(k, d); volgende.push(q); }
      }
    }
    laag = volgende;
  }
  return { pos: laatste[0]!, par: d - 1 };
}

function teken(ps: P[], pos: number[]): string[] {
  const rows = Array.from({ length: N }, () => Array<string>(N).fill('.'));
  const letters = 'TABCDEFGHIJKLMNOP';
  ps.forEach((p, i) => {
    for (let k = 0; k < p.len; k++) {
      if (p.hor) rows[p.vast]![pos[i]! + k] = letters[i]!;
      else rows[pos[i]! + k]![p.vast] = letters[i]!;
    }
  });
  return rows.map((r) => r.join(''));
}

const [van, tot, pogingen, stukken] = [2, 3, 4, 5].map((i) => Number(process.argv[i]));
const next = rng(van * 7919 + tot + Number(process.argv[6] ?? 0));

/** Swap one piece of furniture for another somewhere else. */
function verbouw(ps: P[], pos: number[]): { ps: P[]; pos: number[] } | null {
  const weg = 1 + Math.floor(next() * (ps.length - 1));
  const ps2 = ps.filter((_, i) => i !== weg);
  const pos2 = pos.filter((_, i) => i !== weg);
  for (let t = 0; t < 60; t++) {
    const len = next() < 0.35 ? 3 : 2;
    const hor = next() < 0.45;
    const vast = Math.floor(next() * N);
    if (hor && vast === RIJ) continue;
    const a = Math.floor(next() * (N - len + 1));
    const b = bezet(ps2, pos2);
    let vrij = true;
    for (let k = 0; k < len; k++) if (b[hor ? vast * N + a + k : (a + k) * N + vast]) vrij = false;
    if (!vrij) continue;
    return { ps: [...ps2, { len, hor, vast }], pos: [...pos2, a] };
  }
  return null;
}

// Climb: start from the best of a handful of random rooms, then keep any
// swap of one piece that does not make the room easier.
let hier: { ps: P[]; pos: number[]; par: number } | null = null;
for (let t = 0; t < 300; t++) {
  const kamer = maak(next, stukken!);
  const v = kamer && verste(kamer.ps, kamer.pos);
  if (kamer && v && (!hier || v.par > hier.par)) hier = { ps: kamer.ps, pos: v.pos, par: v.par };
}
for (let t = 0; hier && t < pogingen! && hier.par < tot!; t++) {
  const kamer = verbouw(hier.ps, hier.pos);
  const v = kamer && verste(kamer.ps, kamer.pos);
  if (kamer && v && v.par >= hier.par && v.par <= tot!) hier = { ps: kamer.ps, pos: v.pos, par: v.par };
}
console.log(hier && hier.par >= van! ? `par ${hier.par}\n${teken(hier.ps, hier.pos).map((r) => `      '${r}',`).join('\n')}` : 'niets');
