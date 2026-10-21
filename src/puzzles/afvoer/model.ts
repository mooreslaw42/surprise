/**
 * Afvoer: get the waste water from every appliance down to the standleiding.
 *
 * Seen in section, straight through the room, so the fall is something you
 * look at rather than something you are told. Two rules and no more:
 *
 *   water runs right and down, never up;
 *   and it may not run flat for long, or it stops.
 *
 * Runs may join — a shared drain is good work and costs less pipe — and the
 * joists are in the way, because they always are.
 */

export const VAK = {
  LEEG: 0,
  BALK: 1,
  STAND: 2,
} as const;

export type VakWaarde = (typeof VAK)[keyof typeof VAK];

export type Apparaat = {
  readonly naam: string;
  /** Where its outlet sits, in grid cells. */
  readonly x: number;
  readonly y: number;
};

export type Doorsnede = {
  readonly width: number;
  readonly height: number;
  readonly vakken: VakWaarde[];
  readonly apparaten: readonly Apparaat[];
  /** The cell the stack takes the water away from. */
  readonly stand: { x: number; y: number };
  /** How many cells a run may go flat before the water stops. */
  readonly maxVlak: number;
};

export type Pad = { x: number; y: number }[];

export function index(d: { width: number }, x: number, y: number): number {
  return y * d.width + x;
}

export function binnen(d: Doorsnede, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < d.width && y < d.height;
}

export function vakAt(d: Doorsnede, x: number, y: number): VakWaarde | undefined {
  return binnen(d, x, y) ? d.vakken[index(d, x, y)] : undefined;
}

/** Pipe may go anywhere but through a joist. */
export function vrij(d: Doorsnede, x: number, y: number): boolean {
  const vak = vakAt(d, x, y);
  return vak !== undefined && vak !== VAK.BALK;
}

export type Fault =
  | { kind: 'los'; which: number }
  | { kind: 'omhoog'; which: number; at: { x: number; y: number } }
  | { kind: 'doorbalk'; which: number; at: { x: number; y: number } }
  | { kind: 'vlak'; which: number; at: { x: number; y: number } };

/**
 * Where the water actually gets to before it gives up: follows the run from
 * the appliance and stops at the first thing that is wrong. Drawn as a wet
 * length of pipe, which is how the rules explain themselves.
 */
export function stroom(d: Doorsnede, pad: Pad): { tot: number; fout: Fault['kind'] | null } {
  if (pad.length === 0) return { tot: 0, fout: 'los' };
  let vlak = 0;
  for (let i = 1; i < pad.length; i++) {
    const van = pad[i - 1]!;
    const naar = pad[i]!;
    const dx = naar.x - van.x;
    const dy = naar.y - van.y;
    if (Math.abs(dx) + Math.abs(dy) !== 1) return { tot: i - 1, fout: 'los' };
    if (dy < 0 || dx < 0) return { tot: i - 1, fout: 'omhoog' };
    if (!vrij(d, naar.x, naar.y)) return { tot: i - 1, fout: 'doorbalk' };
    vlak = dy > 0 ? 0 : vlak + 1;
    if (vlak > d.maxVlak) return { tot: i - 1, fout: 'vlak' };
  }
  return { tot: pad.length - 1, fout: null };
}

export function faults(d: Doorsnede, paden: readonly Pad[]): Fault[] {
  const out: Fault[] = [];
  for (let i = 0; i < d.apparaten.length; i++) {
    const pad = paden[i] ?? [];
    const apparaat = d.apparaten[i]!;
    if (pad.length < 2 || pad[0]!.x !== apparaat.x || pad[0]!.y !== apparaat.y) {
      out.push({ kind: 'los', which: i });
      continue;
    }
    const { tot, fout } = stroom(d, pad);
    if (fout) {
      out.push({ kind: fout, which: i, at: pad[Math.min(tot + 1, pad.length - 1)]! });
      continue;
    }
    const eind = pad[pad.length - 1]!;
    if (eind.x !== d.stand.x || eind.y !== d.stand.y) out.push({ kind: 'los', which: i });
  }
  return out;
}

export function isSolved(d: Doorsnede, paden: readonly Pad[]): boolean {
  return faults(d, paden).length === 0;
}

/** Pipe laid, counting a shared length once. */
export function pijpLengte(d: Doorsnede, paden: readonly Pad[]): number {
  const cellen = new Set<number>();
  for (const pad of paden) {
    for (const p of pad) cellen.add(index(d, p.x, p.y));
  }
  return cellen.size;
}

export function stars(lengte: number, par: number): number {
  if (lengte <= par) return 3;
  if (lengte <= par + 3) return 2;
  return 1;
}

const TEKENS: Record<string, VakWaarde> = {
  '.': VAK.LEEG,
  '#': VAK.BALK,
  S: VAK.STAND,
};

/** Sections are authored as ASCII: '.' open, '#' joist, 'S' the stack. */
export function parseDoorsnede(
  rows: readonly string[],
  apparaten: readonly Apparaat[],
  maxVlak = 2,
): Doorsnede {
  const width = rows[0]?.length ?? 0;
  const vakken: VakWaarde[] = [];
  let stand: { x: number; y: number } | null = null;
  rows.forEach((row, y) => {
    if (row.length !== width) throw new Error(`ragged section row ${y}`);
    [...row].forEach((ch, x) => {
      const vak = TEKENS[ch];
      if (vak === undefined) throw new Error(`unknown section cell "${ch}"`);
      if (vak === VAK.STAND) stand = { x, y };
      vakken.push(vak);
    });
  });
  if (!stand) throw new Error('section has no standleiding');
  return { width, height: rows.length, vakken, apparaten, stand, maxVlak };
}
