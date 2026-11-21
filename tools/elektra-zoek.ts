/**
 * Where the sockets go, found rather than drawn.
 *
 * A placement in Elektra used to be hand-picked per wall, which lasted until
 * the walls changed. This scatters the devices a wall is meant to have over
 * the cells cable can reach — lamps along the ceiling, switches at hand
 * height, sockets low — asks the solver whether it can be wired at all, and
 * keeps a scatter near the top for cable used. More cable is more detour,
 * and detour is the puzzle.
 *
 *   node --experimental-strip-types tools/elektra-zoek.ts <surface id> <recept> [pogingen] [leiding x,y0,y1]
 *
 * Recept: wcd | licht | tweelamp | wissel | wissel3 | wisseltwee
 */
import { SURFACES } from '../src/data/house.ts';
import { surfaceToRows } from '../src/puzzles/sloop/generate.ts';
import { TILE, type Board, type Device, type GroepSoort, type TileValue } from '../src/puzzles/elektra/model.ts';
import { solve } from '../src/puzzles/elektra/solver.ts';

type Wens = { kind: Device['kind']; amp: number; naar?: number };
const RECEPTEN: Record<string, { groepen: GroepSoort[]; wensen: Wens[] }> = {
  wcd: { groepen: ['wcd', 'wcd'], wensen: [
    { kind: 'stopcontact', amp: 10 }, { kind: 'stopcontact', amp: 6 }, { kind: 'stopcontact', amp: 4 }] },
  oven: { groepen: ['wcd', 'wcd'], wensen: [
    { kind: 'stopcontact', amp: 8 }, { kind: 'stopcontact', amp: 8 }, { kind: 'stopcontact', amp: 6 }] },
  licht: { groepen: ['licht', 'wcd', 'wcd'], wensen: [
    { kind: 'lamp', amp: 6 }, { kind: 'schakelaar', amp: 0 },
    { kind: 'stopcontact', amp: 10 }, { kind: 'stopcontact', amp: 8 }] },
  tweelamp: { groepen: ['licht', 'wcd', 'wcd'], wensen: [
    { kind: 'lamp', amp: 4 }, { kind: 'lamp', amp: 4 }, { kind: 'schakelaar', amp: 0 },
    { kind: 'stopcontact', amp: 10 }, { kind: 'stopcontact', amp: 8 }] },
  wissel: { groepen: ['licht', 'wcd', 'wcd'], wensen: [
    { kind: 'lamp', amp: 6, naar: 1 }, { kind: 'schakelaar', amp: 0, naar: 2 }, { kind: 'schakelaar', amp: 0 },
    { kind: 'stopcontact', amp: 10 }, { kind: 'stopcontact', amp: 8 }] },
  wissel3: { groepen: ['licht', 'wcd', 'wcd'], wensen: [
    { kind: 'lamp', amp: 4, naar: 1 }, { kind: 'schakelaar', amp: 0, naar: 2 }, { kind: 'schakelaar', amp: 0 },
    { kind: 'stopcontact', amp: 8 }, { kind: 'stopcontact', amp: 10 }, { kind: 'stopcontact', amp: 6 }] },
  wisseltwee: { groepen: ['licht', 'wcd', 'wcd'], wensen: [
    { kind: 'lamp', amp: 4, naar: 2 }, { kind: 'lamp', amp: 4, naar: 2 },
    { kind: 'schakelaar', amp: 0, naar: 3 }, { kind: 'schakelaar', amp: 0 },
    { kind: 'stopcontact', amp: 10 }, { kind: 'stopcontact', amp: 8 }] },
};

const [id, receptNaam, pogingenArg, leidingArg] = process.argv.slice(2);
const surface = SURFACES.find((s) => s.id === id)!;
const recept = RECEPTEN[receptNaam!]!;
const rows = surfaceToRows(surface);
const width = rows[0]!.length;
const height = rows.length;
const leiding = leidingArg ? leidingArg.split(',').map(Number) : null;

let s = 12345;
// The low bits of this generator repeat every few calls: take the high ones.
const rnd = (n: number): number => { s = (s * 1103515245 + 12345) & 0x7fffffff; return (s >> 9) % n; };

function basis(): TileValue[] {
  const tiles: TileValue[] = [];
  for (const row of rows) for (const ch of row) tiles.push(ch === '#' ? TILE.MUUR : TILE.GESLOTEN);
  if (leiding) for (let y = leiding[1]!; y <= leiding[2]!; y++) tiles[y * width + leiding[0]!] = TILE.GESLOTEN;
  return tiles;
}

// The meterkast: the first column, from the left, with enough wall low down.
const leeg = basis();
const n = recept.groepen.length;
let kastX = -1;
for (let x = 0; x < width && kastX < 0; x++) {
  let ok = true;
  for (let k = 0; k < n; k++) if (leeg[(height - 1 - n + k) * width + x] !== TILE.MUUR) ok = false;
  if (ok) kastX = x;
}
const kastY = height - 1 - n;

// A door runs floor to lintel and cable does not cross it, so a wall with a
// door in it is two walls. Only the side the meterkast is on gets devices.
const bereik = new Set<number>([kastY * width + kastX]);
for (const rij = [kastY * width + kastX]; rij.length > 0;) {
  const i = rij.pop()!;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const x = (i % width) + dx;
    const y = Math.floor(i / width) + dy;
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const j = y * width + x;
    if (leeg[j] !== TILE.MUUR || bereik.has(j)) continue;
    bereik.add(j);
    rij.push(j);
  }
}

const gevonden: { par: number; devices: Device[] }[] = [];
for (let poging = 0; poging < Number(pogingenArg ?? 300); poging++) {
  const tiles = basis();
  const bezet = new Set<number>();
  for (let k = 0; k < n; k++) bezet.add((kastY + k) * width + kastX);
  const devices: Device[] = [];
  let mis = false;
  for (const wens of recept.wensen) {
    let gezet = false;
    for (let t = 0; t < 40 && !gezet; t++) {
      const x = rnd(width);
      const y = wens.kind === 'lamp' ? 0 : wens.kind === 'schakelaar' ? 2 + rnd(2) : 2 + rnd(height - 2);
      const i = y * width + x;
      if (tiles[i] !== TILE.MUUR || bezet.has(i) || !bereik.has(i)) continue;
      // Not shoulder to shoulder: two devices in adjoining cells read as one.
      if ([...bezet].some((b) => Math.abs((b % width) - x) + Math.abs(Math.floor(b / width) - y) < 2)) continue;
      bezet.add(i);
      devices.push({ kind: wens.kind, cel: { x, y }, amp: wens.amp, ...(wens.naar !== undefined ? { naar: wens.naar } : {}) });
      gezet = true;
    }
    if (!gezet) { mis = true; break; }
  }
  if (mis) { if (process.env.WAAROM) console.log("geen plek", bereik.size, kastX, kastY); continue; }
  const board: Board = {
    width, height, tiles,
    groepen: recept.groepen.map((soort, k) => ({
      cel: { x: kastX, y: kastY + k }, naam: soort === 'licht' ? 'LICHT' : 'WCD', soort, maxAmp: 16,
    })),
    devices,
  };
  for (const g of board.groepen) tiles[g.cel.y * width + g.cel.x] = TILE.METERKAST;
  for (const d of devices) {
    tiles[d.cel.y * width + d.cel.x] =
      d.kind === 'lamp' ? TILE.LAMP : d.kind === 'schakelaar' ? TILE.SCHAKELAAR : TILE.STOPCONTACT;
  }
  let par: number;
  try { par = solve(board).par; } catch (e) { if (process.env.WAAROM) console.log(String(e)); continue; }
  gevonden.push({ par, devices });
}

// Not the very longest: that one is always a lamp in one corner and its
// switch in the other, which is a walk, not a puzzle. Four fifths of the way.
gevonden.sort((a, b) => a.par - b.par);
const beste = gevonden[Math.floor(gevonden.length * 0.8)] ?? null;

if (!beste) console.log(`${id}: niets`);
else {
  console.log(`${id}  par ${beste.par}  meterkast (${kastX}, ${kastY})`);
  for (const d of beste.devices) {
    console.log(`  ${d.kind}(${d.cel.x}, ${d.cel.y}, ${d.amp}${d.naar !== undefined ? `, naar ${d.naar}` : ''})`);
  }
}
