/**
 * Hand-drawn 5x7 bitmap font. No web fonts: no network, no licensing, and the
 * glyphs are exactly the shape we want at 1x.
 *
 * Each glyph is seven rows of five cells, '#' on and '.' off.
 *
 * TODO: Dutch diacritics (e-acute, e-diaeresis, i-diaeresis) need an accent
 * drawn into the line gap above the 7-cell body. Added with the dialogue system.
 */
const GLYPHS: Record<string, string> = {
  A: '.###./#...#/#...#/#####/#...#/#...#/#...#',
  B: '####./#...#/#...#/####./#...#/#...#/####.',
  C: '.###./#...#/#..../#..../#..../#...#/.###.',
  D: '####./#...#/#...#/#...#/#...#/#...#/####.',
  E: '#####/#..../#..../####./#..../#..../#####',
  F: '#####/#..../#..../####./#..../#..../#....',
  G: '.###./#...#/#..../#.###/#...#/#...#/.###.',
  H: '#...#/#...#/#...#/#####/#...#/#...#/#...#',
  I: '.###./..#../..#../..#../..#../..#../.###.',
  J: '..###/...#./...#./...#./...#./#..#./.##..',
  K: '#...#/#..#./#.#../##.../#.#../#..#./#...#',
  L: '#..../#..../#..../#..../#..../#..../#####',
  M: '#...#/##.##/#.#.#/#...#/#...#/#...#/#...#',
  N: '#...#/##..#/#.#.#/#..##/#...#/#...#/#...#',
  O: '.###./#...#/#...#/#...#/#...#/#...#/.###.',
  P: '####./#...#/#...#/####./#..../#..../#....',
  Q: '.###./#...#/#...#/#...#/#.#.#/#..#./.##.#',
  R: '####./#...#/#...#/####./#.#../#..#./#...#',
  S: '.####/#..../#..../.###./....#/....#/####.',
  T: '#####/..#../..#../..#../..#../..#../..#..',
  U: '#...#/#...#/#...#/#...#/#...#/#...#/.###.',
  V: '#...#/#...#/#...#/#...#/#...#/.#.#./..#..',
  W: '#...#/#...#/#...#/#...#/#.#.#/##.##/#...#',
  X: '#...#/#...#/.#.#./..#../.#.#./#...#/#...#',
  Y: '#...#/#...#/.#.#./..#../..#../..#../..#..',
  Z: '#####/....#/...#./..#../.#.../#..../#####',
  '0': '.###./#...#/#..##/#.#.#/##..#/#...#/.###.',
  '1': '..#../.##../..#../..#../..#../..#../.###.',
  '2': '.###./#...#/....#/...#./..#../.#.../#####',
  '3': '####./....#/....#/.###./....#/....#/####.',
  '4': '#...#/#...#/#...#/#####/....#/....#/....#',
  '5': '#####/#..../#..../####./....#/....#/####.',
  '6': '.###./#..../#..../####./#...#/#...#/.###.',
  '7': '#####/....#/...#./..#../.#.../.#.../.#...',
  '8': '.###./#...#/#...#/.###./#...#/#...#/.###.',
  '9': '.###./#...#/#...#/.####/....#/....#/.###.',
  ' ': '...../...../...../...../...../...../.....',
  '.': '...../...../...../...../...../.##../.##..',
  ',': '...../...../...../...../.##../.##../.#...',
  '!': '..#../..#../..#../..#../..#../...../..#..',
  '?': '.###./#...#/....#/...#./..#../...../..#..',
  ':': '...../.##../.##../...../.##../.##../.....',
  "'": '..#../..#../...../...../...../...../.....',
  '-': '...../...../...../#####/...../...../.....',
  '+': '...../..#../..#../#####/..#../..#../.....',
  '/': '....#/....#/...#./..#../.#.../#..../#....',
  '(': '...#./..#../.#.../.#.../.#.../..#../...#.',
  ')': '.#.../..#../...#./...#./...#./..#../.#...',
  '&': '.##../#..#./#.#../.#.../#.#.#/#..#./.##.#',
  '%': '#...#/#..#./...#./..#../.#.../.#..#/#...#',
  '=': '...../...../#####/...../#####/...../.....',
  '<': '...#./..#../.#.../#..../.#.../..#../...#.',
  '>': '.#.../..#../...#./....#/...#./..#../.#...',
  '"': '.#.#./.#.#./...../...../...../...../.....',
  ';': '...../.##../.##../...../.##../.##../.#...',
  '_': '...../...../...../...../...../...../#####',
  '#': '.#.#./#####/.#.#./#####/.#.#./...../.....',
  '*': '...../.#.#./..#../#####/..#../.#.#./.....',
};

export const GLYPH_W = 5;
export const GLYPH_H = 7;
/** One column of gap between glyphs. */
export const TRACKING = 1;
/** Two rows of gap between lines, leaving room for future accents. */
export const LEADING = 2;

export type Glyph = { readonly bits: Uint8Array };

const COMPILED = new Map<string, Glyph>();
for (const [ch, art] of Object.entries(GLYPHS)) {
  const rows = art.split('/');
  if (rows.length !== GLYPH_H) throw new Error(`glyph ${ch}: ${rows.length} rows`);
  const bits = new Uint8Array(GLYPH_W * GLYPH_H);
  for (let y = 0; y < GLYPH_H; y++) {
    const row = rows[y]!;
    if (row.length !== GLYPH_W) throw new Error(`glyph ${ch} row ${y}: ${row.length} cols`);
    for (let x = 0; x < GLYPH_W; x++) {
      bits[y * GLYPH_W + x] = row[x] === '#' ? 1 : 0;
    }
  }
  COMPILED.set(ch, { bits });
}

/**
 * Accented capitals, made rather than drawn: the mark goes in the top row
 * and the letter gives up one row from its upper half to make room. Enough
 * for Dutch — een, geinig, ruine and the rest with their marks on — which a
 * gedicht will want even if a status bar never does.
 */
const TEKENS: Record<string, string> = {
  '\u00b4': '...#.',   // acute
  '`': '.#...',        // grave
  '\u00a8': '.#.#.',   // diaeresis
  '^': '..#..',        // circumflex, as much of one as five pixels allow
};
const ACCENTEN: Record<string, [string, string]> = {
  '\u00c9': ['E', '\u00b4'], '\u00c8': ['E', '`'], '\u00cb': ['E', '\u00a8'], '\u00ca': ['E', '^'],
  '\u00c1': ['A', '\u00b4'], '\u00c0': ['A', '`'], '\u00c4': ['A', '\u00a8'],
  '\u00cf': ['I', '\u00a8'], '\u00cd': ['I', '\u00b4'],
  '\u00d3': ['O', '\u00b4'], '\u00d6': ['O', '\u00a8'], '\u00d2': ['O', '`'],
  '\u00da': ['U', '\u00b4'], '\u00dc': ['U', '\u00a8'],
};
for (const [ch, [basis, teken]] of Object.entries(ACCENTEN)) {
  const letter = COMPILED.get(basis)!.bits;
  const bits = new Uint8Array(GLYPH_W * GLYPH_H);
  [...TEKENS[teken]!].forEach((c, x) => { bits[x] = c === '#' ? 1 : 0; });
  // Rows 0, 1, 3, 4, 5, 6 of the letter, moved down under the mark.
  [0, 1, 3, 4, 5, 6].forEach((van, naar) => {
    for (let x = 0; x < GLYPH_W; x++) bits[(naar + 1) * GLYPH_W + x] = letter[van * GLYPH_W + x]!;
  });
  COMPILED.set(ch, { bits });
}

const FALLBACK = COMPILED.get('?')!;

/** Glyphs are uppercase-only, so lowercase input is folded up. */
export function glyph(ch: string): Glyph {
  return COMPILED.get(ch.toUpperCase()) ?? FALLBACK;
}

export function textWidth(text: string): number {
  if (text.length === 0) return 0;
  return text.length * (GLYPH_W + TRACKING) - TRACKING;
}

export function lineHeight(): number {
  return GLYPH_H + LEADING;
}

/** Whether the font can draw this character at all, rather than a '?'. */
export function kentTeken(ch: string): boolean {
  return COMPILED.has(ch.toUpperCase());
}
