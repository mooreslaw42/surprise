/**
 * Hard rooms for Leeghalen, found rather than drawn.
 *
 * A random room is almost always easy. So: fill a room at random, walk every
 * position it can reach, and then ask which of those positions is furthest
 * from having the bank out of the door. That one is the puzzle. The same
 * trick the published Rush Hour sets were made with.
 *
 *   node --experimental-strip-types tools/schuif-zoek.ts <van> <tot> <pogingen> <stukken> [zaad] [breed] [diep] [deurrij]
 *
 * The room is as wide and as deep as the real one, at three quarters of a
 * metre a square, with the door in the right-hand wall.
 */
const W = Number(process.argv[7] ?? 6);
const H = Number(process.argv[8] ?? 6);
const RIJ = Number(process.argv[9] ?? 2);
/** Rooms with more reachable positions than this are skipped: too slow to walk. */
const GRENS = Number(process.argv[10] ?? 12000);
/** How far a piece lying this way can slide: the room's length along it. */
const lengte = (hor: boolean): number => (hor ? W : H);

type P = { len: number; hor: boolean; vast: number };   // vast: the row or column it lives in

function rng(seed: number): () => number {
  let s = seed || 1;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

function bezet(ps: P[], pos: number[]): Uint8Array {
  const b = new Uint8Array(W * H);
  ps.forEach((p, i) => {
    for (let k = 0; k < p.len; k++) b[p.hor ? p.vast * W + pos[i]! + k : (pos[i]! + k) * W + p.vast] = 1;
  });
  return b;
}

function buren(ps: P[], pos: number[]): number[][] {
  const b = bezet(ps, pos);
  const out: number[][] = [];
  ps.forEach((p, i) => {
    const cel = (a: number) => (p.hor ? p.vast * W + a : a * W + p.vast);
    for (let a = pos[i]! - 1; a >= 0 && !b[cel(a)]; a--) { const q = [...pos]; q[i] = a; out.push(q); }
    for (let a = pos[i]! + 1; a + p.len <= lengte(p.hor) && !b[cel(a + p.len - 1)]; a++) { const q = [...pos]; q[i] = a; out.push(q); }
  });
  return out;
}

function maak(next: () => number, aantal: number): { ps: P[]; pos: number[] } | null {
  const ps: P[] = [{ len: 2, hor: true, vast: RIJ }];
  const pos = [Math.floor(next() * Math.max(1, W - 3))];
  for (let t = 0; t < 2000 && ps.length < aantal; t++) {
    const len = next() < 0.3 ? 3 : 2;
    const hor = next() < 0.45;
    const vast = Math.floor(next() * (hor ? H : W));
    if (hor && vast === RIJ) continue;                // nothing else lies in the door's row
    if (len > lengte(hor)) continue;
    const a = Math.floor(next() * (lengte(hor) - len + 1));
    const b = bezet(ps, pos);
    let vrij = true;
    for (let k = 0; k < len; k++) if (b[hor ? vast * W + a + k : (a + k) * W + vast]) vrij = false;
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
    if (alle.size > GRENS) return null;
    const p = rij.pop()!;
    for (const q of buren(ps, p)) {
      const k = key(q);
      if (!alle.has(k)) { alle.set(k, q); rij.push(q); }
    }
  }
  const afstand = new Map<string, number>();
  let laag: number[][] = [];
  for (const [k, p] of alle) if (p[0]! + 2 === W) { afstand.set(k, 0); laag.push(p); }
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
  const rows = Array.from({ length: H }, () => Array<string>(W).fill('.'));
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
    const vast = Math.floor(next() * (hor ? H : W));
    if (hor && vast === RIJ) continue;
    if (len > lengte(hor)) continue;
    const a = Math.floor(next() * (lengte(hor) - len + 1));
    const b = bezet(ps2, pos2);
    let vrij = true;
    for (let k = 0; k < len; k++) if (b[hor ? vast * W + a + k : (a + k) * W + vast]) vrij = false;
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
