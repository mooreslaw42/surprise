/**
 * Leeghalen: get the furniture out before anything else can start.
 *
 * A bank slides along its own length and not sideways, a kast the same, and
 * everything is in everything else's way. Shifting the one piece that has to
 * reach the door means working out what has to move first.
 *
 * Built first for the ventilation stage, where it was good but wrong: that
 * one wanted a drawing, not a shoving match. It belongs here.
 */

export type Orientatie = 'horizontaal' | 'verticaal';

export type Stuk = {
  readonly id: string;
  /** Left-most, or top-most, cell. */
  readonly x: number;
  readonly y: number;
  readonly lengte: number;
  readonly orientatie: Orientatie;
  /** The one piece that has to get out of the door. */
  readonly hoofd: boolean;
};

export type Plan = {
  readonly width: number;
  readonly height: number;
  /** Immovable: a beam, the chimney, the unit itself. */
  readonly vast: readonly { x: number; y: number }[];
  readonly stukken: readonly Stuk[];
  /** Where the hoofdkanaal has to arrive, just outside the right-hand edge. */
  readonly aansluiting: { x: number; y: number };
};

export type Zet = { readonly id: string; readonly stap: number };

export function cellsOf(stuk: Stuk): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < stuk.lengte; i++) {
    out.push(stuk.orientatie === 'horizontaal'
      ? { x: stuk.x + i, y: stuk.y }
      : { x: stuk.x, y: stuk.y + i });
  }
  return out;
}

/** Which piece occupies each cell, by index; -1 for empty, -2 for fixed. */
export function bezetting(plan: Plan, stukken: readonly Stuk[]): Int8Array {
  const grid = new Int8Array(plan.width * plan.height).fill(-1);
  for (const v of plan.vast) grid[v.y * plan.width + v.x] = -2;
  stukken.forEach((stuk, i) => {
    for (const c of cellsOf(stuk)) grid[c.y * plan.width + c.x] = i;
  });
  return grid;
}

function binnen(plan: Plan, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < plan.width && y < plan.height;
}

/** Can this piece shift by `stap` cells along its own axis? */
export function kanSchuiven(plan: Plan, stukken: readonly Stuk[], i: number, stap: number): boolean {
  const stuk = stukken[i];
  if (!stuk || stap === 0) return false;
  const grid = bezetting(plan, stukken);
  const dx = stuk.orientatie === 'horizontaal' ? Math.sign(stap) : 0;
  const dy = stuk.orientatie === 'verticaal' ? Math.sign(stap) : 0;

  for (let n = 0; n < Math.abs(stap); n++) {
    // The leading cell, one step further along each time.
    const lead = stuk.orientatie === 'horizontaal'
      ? { x: dx > 0 ? stuk.x + stuk.lengte + n : stuk.x - 1 - n, y: stuk.y }
      : { x: stuk.x, y: dy > 0 ? stuk.y + stuk.lengte + n : stuk.y - 1 - n };
    if (!binnen(plan, lead.x, lead.y)) return false;
    const bezet = grid[lead.y * plan.width + lead.x]!;
    if (bezet !== -1) return false;
  }
  return true;
}

export function schuif(plan: Plan, stukken: readonly Stuk[], i: number, stap: number): Stuk[] {
  if (!kanSchuiven(plan, stukken, i, stap)) return [...stukken];
  return stukken.map((stuk, j) => {
    if (j !== i) return stuk;
    return stuk.orientatie === 'horizontaal'
      ? { ...stuk, x: stuk.x + stap }
      : { ...stuk, y: stuk.y + stap };
  });
}

export function hoofdIndex(stukken: readonly Stuk[]): number {
  return stukken.findIndex((s) => s.hoofd);
}

/** Done when the hoofdkanaal has slid clear of the right-hand edge. */
export function isSolved(plan: Plan, stukken: readonly Stuk[]): boolean {
  const i = hoofdIndex(stukken);
  if (i < 0) return false;
  const hoofd = stukken[i]!;
  return hoofd.orientatie === 'horizontaal'
    && hoofd.y === plan.aansluiting.y
    && hoofd.x + hoofd.lengte - 1 >= plan.width - 1;
}

/** A compact key for a position, so the solver can recognise one it has seen. */
export function sleutel(stukken: readonly Stuk[]): string {
  return stukken.map((s) => `${s.x},${s.y}`).join(';');
}

export function stars(zetten: number, par: number): number {
  if (zetten <= par) return 3;
  if (zetten <= par + 4) return 2;
  return 1;
}

/**
 * Plans are authored as ASCII art. '.' empty, '#' fixed, 'T' the hoofdkanaal,
 * any other letter a duct section; repeated letters that sit next to each
 * other form one piece.
 */
export function parsePlan(rows: readonly string[], aansluitingRij?: number): Plan {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  const vast: { x: number; y: number }[] = [];
  const cellsByLetter = new Map<string, { x: number; y: number }[]>();

  rows.forEach((row, y) => {
    if (row.length !== width) throw new Error(`ragged plan row ${y}`);
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      if (ch === '#') { vast.push({ x, y }); return; }
      if (!/[A-Z]/.test(ch)) throw new Error(`unknown plan cell "${ch}"`);
      const list = cellsByLetter.get(ch) ?? [];
      list.push({ x, y });
      cellsByLetter.set(ch, list);
    });
  });

  const stukken: Stuk[] = [];
  for (const [letter, cells] of cellsByLetter) {
    const xs = new Set(cells.map((c) => c.x));
    const ys = new Set(cells.map((c) => c.y));
    if (cells.length < 2) throw new Error(`piece ${letter} is only one cell`);
    if (xs.size !== 1 && ys.size !== 1) throw new Error(`piece ${letter} is not a straight run`);
    const orientatie: Orientatie = ys.size === 1 ? 'horizontaal' : 'verticaal';
    const x = Math.min(...cells.map((c) => c.x));
    const y = Math.min(...cells.map((c) => c.y));
    // A run with a gap in it would quietly behave as something longer.
    const span = orientatie === 'horizontaal'
      ? Math.max(...cells.map((c) => c.x)) - x + 1
      : Math.max(...cells.map((c) => c.y)) - y + 1;
    if (span !== cells.length) throw new Error(`piece ${letter} is broken in two`);
    stukken.push({ id: letter, x, y, lengte: cells.length, orientatie, hoofd: letter === 'T' });
  }
  stukken.sort((a, b) => a.id.localeCompare(b.id));

  const hoofd = stukken.find((s) => s.hoofd);
  if (!hoofd) throw new Error('plan has no hoofdkanaal');
  if (hoofd.orientatie !== 'horizontaal') throw new Error('the hoofdkanaal must lie horizontally');

  return {
    width, height, vast, stukken,
    aansluiting: { x: width, y: aansluitingRij ?? hoofd.y },
  };
}
