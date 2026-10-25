/**
 * Klossen: find the backing timber before you drill.
 *
 * The plasterboard is on. Everything that has to hang on this wall — kastjes,
 * a tv-beugel, a radiator — needs its own klos: a block of timber screwed to
 * the frame behind the board, before the board went on. Wouter put them there.
 * Wouter did not write down where.
 *
 * What is left is the detector. Run it down a column or along a row and it
 * beeps once per klos, so the numbers along the edges say how many klossen
 * are in that line. Together with two things you know for nothing:
 *
 *   - every thing that hangs there has exactly one klos, directly against it
 *     (above, below, left or right — that is where its beugel bites);
 *   - no two klossen touch, not even corner to corner. Two blocks against
 *     each other should have been one bigger block, and the detector could
 *     not tell them apart anyway.
 *
 * Which makes it tents-and-trees, on a wall, with a stud finder for clues.
 * And every square you can prove is a square you do not have to drill twice.
 */

export const MERK = {
  ONBEKEND: 0,
  LEEG: 1,
  KLOS: 2,
} as const;

export type MerkWaarde = (typeof MERK)[keyof typeof MERK];

/** What hangs on the wall. Decides the icon, and nothing else. */
export type DingSoort = 'kastje' | 'plank' | 'tvbeugel' | 'radiator' | 'kapstok' | 'wandlamp';

export const DING_NAMEN: Record<DingSoort, string> = {
  kastje: 'HANGKASTJE',
  plank: 'WANDPLANK',
  tvbeugel: 'TV-BEUGEL',
  radiator: 'RADIATOR',
  kapstok: 'KAPSTOK',
  wandlamp: 'WANDLAMP',
};

export type Ding = {
  readonly at: number;
  readonly soort: DingSoort;
};

export type Wand = {
  readonly width: number;
  readonly height: number;
  /** Cells with no board to drill into at all: the window and door openings. */
  readonly blok: readonly boolean[];
  readonly dingen: readonly Ding[];
  /** What the detector beeps per column and per row. */
  readonly kolomTel: readonly number[];
  readonly rijTel: readonly number[];
  /** Where the klossen really are. The answer, and the only one there is. */
  readonly klossen: readonly number[];
};

export function index(w: { width: number }, x: number, y: number): number {
  return y * w.width + x;
}

export function xy(w: { width: number }, i: number): { x: number; y: number } {
  return { x: i % w.width, y: Math.floor(i / w.width) };
}

export function cellen(w: Wand): number {
  return w.width * w.height;
}

const ORTHO = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
const RONDOM = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
] as const;

function rondom(w: Wand, i: number, deltas: readonly (readonly [number, number])[]): number[] {
  const { x, y } = xy(w, i);
  const out: number[] = [];
  for (const [dx, dy] of deltas) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= w.width || ny >= w.height) continue;
    out.push(index(w, nx, ny));
  }
  return out;
}

/** The four cells a beugel could reach from here. */
export function buren4(w: Wand, i: number): number[] {
  return rondom(w, i, ORTHO);
}

/** All eight, which is what the no-touching rule cares about. */
export function buren8(w: Wand, i: number): number[] {
  return rondom(w, i, RONDOM);
}

export function dingOp(w: Wand, i: number): Ding | undefined {
  return w.dingen.find((d) => d.at === i);
}

/** Could a klos sit here at all: board to drill into, and nothing hanging on it. */
export function bruikbaar(w: Wand, i: number): boolean {
  return !w.blok[i] && !w.dingen.some((d) => d.at === i);
}

/**
 * Hand every thing on the wall its own klos, or report that it cannot be done.
 * A klos sitting next to two kastjes still only holds one of them up, which is
 * the whole reason this needs a matching and not a count.
 */
export function koppel(w: Wand, geplaatst: readonly number[]): Map<number, number> | null {
  const kandidaten = w.dingen.map((d) => buren4(w, d.at).filter((c) => geplaatst.includes(c)));
  /** klos cell -> ding index */
  const vanKlos = new Map<number, number>();

  const zoek = (ding: number, gezien: Set<number>): boolean => {
    for (const klos of kandidaten[ding]!) {
      if (gezien.has(klos)) continue;
      gezien.add(klos);
      const bezet = vanKlos.get(klos);
      if (bezet === undefined || zoek(bezet, gezien)) {
        vanKlos.set(klos, ding);
        return true;
      }
    }
    return false;
  };

  for (let d = 0; d < w.dingen.length; d++) {
    if (!zoek(d, new Set())) return null;
  }
  const uit = new Map<number, number>();
  for (const [klos, ding] of vanKlos) uit.set(ding, klos);
  return uit;
}

export type Fault =
  | { kind: 'raak'; at: number }
  | { kind: 'tegen'; at: number }
  | { kind: 'kolom'; lijn: number }
  | { kind: 'rij'; lijn: number }
  | { kind: 'zonder'; ding: number };

export function geplaatst(merken: readonly MerkWaarde[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < merken.length; i++) if (merken[i] === MERK.KLOS) out.push(i);
  return out;
}

export function faults(w: Wand, merken: readonly MerkWaarde[]): Fault[] {
  const out: Fault[] = [];
  const klossen = geplaatst(merken);

  for (const i of klossen) {
    if (!bruikbaar(w, i)) out.push({ kind: 'raak', at: i });
    if (buren8(w, i).some((j) => merken[j] === MERK.KLOS)) out.push({ kind: 'tegen', at: i });
  }
  for (let x = 0; x < w.width; x++) {
    let n = 0;
    for (let y = 0; y < w.height; y++) if (merken[index(w, x, y)] === MERK.KLOS) n++;
    if (n !== w.kolomTel[x]) out.push({ kind: 'kolom', lijn: x });
  }
  for (let y = 0; y < w.height; y++) {
    let n = 0;
    for (let x = 0; x < w.width; x++) if (merken[index(w, x, y)] === MERK.KLOS) n++;
    if (n !== w.rijTel[y]) out.push({ kind: 'rij', lijn: y });
  }
  const paren = koppel(w, klossen);
  if (!paren) {
    for (let d = 0; d < w.dingen.length; d++) {
      const eigen = buren4(w, w.dingen[d]!.at).filter((c) => klossen.includes(c));
      if (eigen.length === 0) out.push({ kind: 'zonder', ding: d });
    }
    // Enough klossen all round, but two things fighting over the same one.
    if (!out.some((f) => f.kind === 'zonder')) out.push({ kind: 'zonder', ding: -1 });
  }
  return out;
}

export function isSolved(w: Wand, merken: readonly MerkWaarde[]): boolean {
  return faults(w, merken).length === 0;
}

export function isKlos(w: Wand, i: number): boolean {
  return w.klossen.includes(i);
}

/** Holes drilled into nothing but board. */
export function missers(w: Wand, merken: readonly MerkWaarde[]): number {
  let n = 0;
  for (let i = 0; i < merken.length; i++) {
    if (merken[i] === MERK.KLOS && !isKlos(w, i)) n++;
  }
  return n;
}

/** Dutch plural for the handful of words the bar needs. */
function meervoud(n: number, een: string, meer: string): string {
  return `${n} ${n === 1 ? een : meer}`;
}

/**
 * The one thing still wrong, in the order it is worth saying.
 *
 * A wall that looks finished and is not accepted has to explain itself.
 * Without this the player checks the same forty squares again and blames
 * the game, which is exactly what happened.
 */
export function watMist(w: Wand, merken: readonly MerkWaarde[]): string | null {
  const fouten = faults(w, merken);
  if (fouten.length === 0) return null;
  if (fouten.some((f) => f.kind === 'tegen')) return 'TWEE KLOSSEN RAKEN ELKAAR';
  if (fouten.some((f) => f.kind === 'raak')) return 'DAAR KAN GEEN KLOS ZITTEN';

  const staan = geplaatst(merken).length;
  const nodig = w.dingen.length;
  if (staan < nodig) return `${meervoud(nodig - staan, 'KLOS', 'KLOSSEN')} TE WEINIG`;
  if (staan > nodig) return `${meervoud(staan - nodig, 'KLOS', 'KLOSSEN')} TE VEEL`;

  const lijnen = fouten.filter((f) => f.kind === 'kolom' || f.kind === 'rij').length;
  if (lijnen > 0) return `${meervoud(lijnen, 'RIJ OF KOLOM KLOPT', 'RIJEN OF KOLOMMEN KLOPPEN')} NIET`;
  const los = fouten.filter((f) => f.kind === 'zonder').length;
  return `${meervoud(los, 'DING HANGT', 'DINGEN HANGEN')} NOG NERGENS AAN`;
}

export function stars(gaten: number): number {
  if (gaten === 0) return 3;
  if (gaten <= 2) return 2;
  return 1;
}
