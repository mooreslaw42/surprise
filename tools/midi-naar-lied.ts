/**
 * MIDI to the tracker notation in src/engine/muziek.ts.
 *
 * A song here is a stretch of bars out of one file and, per game voice, the
 * channel to take it from and how: the top note for a lead, the bottom note
 * for a bass, up to three notes for chords, or the drum kit mapped onto the
 * five drums the synth has. Everything is snapped to sixteenths.
 *
 *   node --experimental-strip-types tools/midi-naar-lied.ts toon <file> <channel> <from> <to>
 *     prints one channel, a bar per line, to find the bars worth looping
 *   node --experimental-strip-types tools/midi-naar-lied.ts schrijf
 *     writes src/data/stones.ts from the SONGS table below
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { leesMidi, type MidiBestand, type MidiNoot } from './midi.ts';

export type Manier = 'boven' | 'onder' | 'akkoord' | 'drums';

export type Partij = {
  readonly stem: 'puls' | 'zaag' | 'driehoek' | 'bas' | 'slagwerk';
  readonly kanaal: number;            // 1-based, as the MIDI tools print it
  readonly spoor?: number;            // only when two tracks share a channel
  readonly manier: Manier;
  readonly volume?: number;
  /** Semitones, to move a part into a register the chip can sing in. */
  readonly transponeer?: number;
  /** Leave out notes below or above, to keep the riff and drop the rest. */
  readonly van?: number;
  readonly tot?: number;
};

const NAMEN = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
export const naam = (midi: number): string => `${NAMEN[midi % 12]}${Math.floor(midi / 12) - 1}`;

/** General MIDI drum notes onto the synth's kit. Anything else is left out. */
function drum(toon: number): string | null {
  if (toon === 35 || toon === 36) return 'k';
  if (toon === 38 || toon === 40 || toon === 39 || toon === 37) return 's';
  if (toon === 42 || toon === 44 || toon === 70 || toon === 69 || toon === 54 || toon === 56) return 'h';
  if (toon === 46) return 'o';
  if (toon === 49 || toon === 57 || toon === 55 || toon === 52) return 'c';
  if (toon === 51 || toon === 59 || toon === 53) return 'h';
  return null;
}

function notenVan(m: MidiBestand, p: Pick<Partij, 'kanaal' | 'spoor'>): MidiNoot[] {
  const uit: MidiNoot[] = [];
  m.sporen.forEach((s, i) => {
    if (p.spoor !== undefined && i !== p.spoor) return;
    for (const n of s.noten) if (n.kanaal === p.kanaal - 1 && n.toon >= 20) uit.push(n);
  });
  return uit;
}

/** One part, bars [van, tot), as tokens, one per sixteenth. */
export function stappen(m: MidiBestand, p: Partij, vanMaat: number, totMaat: number): string[] {
  const zestiende = m.ticksPerKwart / 4;
  const begin = vanMaat * 16;
  const n = (totMaat - vanMaat) * 16;
  const opStap: MidiNoot[][] = Array.from({ length: n }, () => []);
  for (const noot of notenVan(m, p)) {
    if (p.manier !== 'drums' && ((p.van !== undefined && noot.toon < p.van) || (p.tot !== undefined && noot.toon > p.tot))) continue;
    const stap = Math.round(noot.start / zestiende) - begin;
    if (stap < 0 || stap >= n) continue;
    opStap[stap]!.push(noot);
  }

  const uit: string[] = new Array(n).fill('.');
  if (p.manier === 'drums') {
    opStap.forEach((ns, i) => {
      const slagen = [...new Set(ns.map((x) => drum(x.toon)).filter((x): x is string => x !== null))];
      if (slagen.length === 0) return;
      const hard = ns.some((x) => x.sterkte >= 100);
      uit[i] = slagen.sort().map((s, j) => (j === 0 && hard ? `${s}!` : s)).join('+');
    });
    return uit;
  }

  const t = p.transponeer ?? 0;
  let klinkt = 0;   // steps the last struck note still has to ring
  opStap.forEach((ns, i) => {
    if (ns.length === 0) {
      if (klinkt > 0) { uit[i] = '-'; klinkt--; }
      return;
    }
    const tonen = [...new Set(ns.map((x) => x.toon))].sort((a, b) => a - b);
    let gekozen: number[];
    if (p.manier === 'boven') gekozen = [tonen[tonen.length - 1]!];
    else if (p.manier === 'onder') gekozen = [tonen[0]!];
    else gekozen = tonen.slice(-3);
    const hard = ns.some((x) => x.sterkte >= 105);
    uit[i] = gekozen.map((x, j) => naam(x + t) + (j === 0 && hard ? '!' : '')).join('+');
    const lengte = Math.max(...ns.map((x) => Math.round(x.lengte / zestiende)));
    klinkt = Math.max(0, lengte - 1);
  });
  return uit;
}

/** Tokens into bars of sixteen, with the `x*n` shorthand where it helps. */
export function opschrijven(tokens: string[]): string {
  const maten: string[] = [];
  for (let b = 0; b < tokens.length; b += 16) {
    const maat = tokens.slice(b, b + 16);
    const delen: string[] = [];
    for (let i = 0; i < maat.length; i++) {
      let j = i + 1;
      while (j < maat.length && maat[j] === '-') j++;
      const lengte = j - i;
      delen.push(lengte > 1 && maat[i] !== '.' && maat[i] !== '-' ? `${maat[i]}*${lengte}` : maat[i]!);
      if (lengte > 1 && maat[i] !== '.' && maat[i] !== '-') i = j - 1;
    }
    maten.push(delen.join(' '));
  }
  return maten.join(' | ');
}

export function lees(pad: string): MidiBestand {
  return leesMidi(new Uint8Array(readFileSync(pad)));
}

if (process.argv[2] === 'toon') {
  const [, , , pad, kanaal, van, tot, manier] = process.argv;
  const m = lees(pad!);
  const p: Partij = { stem: 'puls', kanaal: Number(kanaal), manier: (manier as Manier) ?? 'akkoord' };
  const tokens = stappen(m, p, Number(van), Number(tot));
  for (let b = 0; b < tokens.length; b += 16) {
    console.log(String(Number(van) + b / 16).padStart(4), tokens.slice(b, b + 16).map((x) => x.padEnd(4)).join(' '));
  }
}

type Lied = {
  readonly id: string;
  readonly naam: string;
  readonly naar: string;
  readonly bestand: string;
  readonly maten: readonly [number, number];
  /** When the file's own tempo is off the record. */
  readonly bpm?: number;
  readonly partijen: readonly Partij[];
};

/**
 * The Stones, a loop each, played by a chip. The bars are where the riff,
 * the bass and the drums are all in; the lead is moved up an octave or two,
 * because a square wave down where a guitar lives is only buzz.
 */
export const SONGS: readonly Lied[] = [
  {
    id: 'start-me-up', naam: 'START ME UP', naar: 'Start Me Up',
    bestand: 'StartMeUp.mid', maten: [9, 13], bpm: 122,
    partijen: [
      { stem: 'zaag', kanaal: 13, manier: 'akkoord', volume: 0.75 },
      { stem: 'puls', kanaal: 13, manier: 'boven', transponeer: 12, volume: 0.5 },
      { stem: 'bas', kanaal: 11, manier: 'onder', transponeer: 12 },
      { stem: 'slagwerk', kanaal: 10, manier: 'drums', volume: 0.85 },
    ],
  },
  {
    id: 'satisfaction', naam: 'SATISFACTION', naar: "(I Can't Get No) Satisfaction",
    bestand: 'Satisfaction.mid', maten: [4, 8], bpm: 136,
    partijen: [
      { stem: 'puls', kanaal: 2, manier: 'boven', transponeer: 24 },
      { stem: 'zaag', kanaal: 5, manier: 'akkoord', volume: 0.45 },
      { stem: 'bas', kanaal: 8, manier: 'onder', transponeer: 12 },
      { stem: 'slagwerk', kanaal: 10, manier: 'drums', volume: 0.85 },
    ],
  },
  {
    id: 'paint-it-black', naam: 'PAINT IT BLACK', naar: 'Paint It Black',
    bestand: 'paintitb.mid', maten: [11, 15], bpm: 156,
    partijen: [
      { stem: 'puls', kanaal: 8, manier: 'boven', transponeer: 12 },
      { stem: 'zaag', kanaal: 7, manier: 'boven', volume: 0.4 },
      { stem: 'bas', kanaal: 2, manier: 'onder', transponeer: 12 },
      { stem: 'slagwerk', kanaal: 10, manier: 'drums', volume: 0.85 },
    ],
  },
  {
    id: 'jumpin-jack-flash', naam: "JUMPIN' JACK FLASH", naar: "Jumpin' Jack Flash",
    bestand: 'JumpinJackFlash.mid', maten: [2, 6],
    partijen: [
      { stem: 'puls', kanaal: 3, manier: 'boven', transponeer: 12 },
      { stem: 'zaag', kanaal: 6, manier: 'boven', volume: 0.4 },
      { stem: 'bas', kanaal: 2, manier: 'onder', transponeer: 12 },
      { stem: 'slagwerk', kanaal: 10, manier: 'drums', volume: 0.85 },
    ],
  },
  {
    id: 'brown-sugar', naam: 'BROWN SUGAR', naar: 'Brown Sugar',
    bestand: 'BrownSugar.mid', maten: [201, 205],
    partijen: [
      { stem: 'puls', kanaal: 5, manier: 'boven', transponeer: 12, volume: 0.8 },
      { stem: 'zaag', kanaal: 5, manier: 'akkoord', volume: 0.45 },
      { stem: 'bas', kanaal: 2, manier: 'onder', transponeer: 12 },
      { stem: 'slagwerk', kanaal: 10, manier: 'drums', volume: 0.85 },
    ],
  },
  {
    id: 'miss-you', naam: 'MISS YOU', naar: 'Miss You',
    bestand: 'MissYou.mid', maten: [2, 6],
    partijen: [
      { stem: 'bas', kanaal: 9, manier: 'onder', transponeer: 12 },
      { stem: 'puls', kanaal: 5, manier: 'boven', volume: 0.6 },
      { stem: 'zaag', kanaal: 8, manier: 'akkoord', volume: 0.35 },
      { stem: 'slagwerk', kanaal: 10, manier: 'drums', volume: 0.85 },
    ],
  },
  {
    id: 'angie', naam: 'ANGIE', naar: 'Angie',
    bestand: 'Angie2.mid', maten: [1, 5], bpm: 72,
    partijen: [
      { stem: 'driehoek', kanaal: 5, manier: 'akkoord', volume: 0.8 },
      { stem: 'puls', kanaal: 5, manier: 'boven', transponeer: 12, volume: 0.45 },
      { stem: 'bas', kanaal: 9, manier: 'onder', transponeer: 12 },
    ],
  },
];

/** The tempo in force where the loop starts, unless the song says otherwise. */
function bpmVan(m: MidiBestand, lied: Lied): number {
  if (lied.bpm) return lied.bpm;
  const tick = lied.maten[0] * m.ticksPerKwart * 4;
  let us = 500000;
  for (const t of m.tempi) if (t.tick <= tick) us = t.usPerKwart;
  return Math.round(60e6 / us);
}

if (process.argv[2] === 'schrijf') {
  const regels: string[] = [
    "import { lied, type Lied } from '../engine/muziek.ts';",
    '',
    '/*',
    ' * GENERATED by tools/midi-naar-lied.ts from the MIDI files in muziek-bron/.',
    ' * Do not edit by hand: change the SONGS table there and run it again.',
    ' */',
    '',
  ];
  for (const l of SONGS) {
    const m = lees(`muziek-bron/${l.bestand}`);
    const constNaam = l.id.toUpperCase().replace(/-/g, '_');
    regels.push(`export const ${constNaam}: Lied = lied({`);
    regels.push(`  id: '${l.id}',`, `  naam: ${JSON.stringify(l.naam)},`, `  naar: ${JSON.stringify(l.naar)},`, `  bpm: ${bpmVan(m, l)},`, '  sporen: [');
    for (const p of l.partijen) {
      const tokens = stappen(m, p, l.maten[0], l.maten[1]);
      if (tokens.every((x) => x === '.' || x === '-')) throw new Error(`${l.id}: channel ${p.kanaal} is empty in those bars`);
      regels.push(`    {`, `      stem: '${p.stem}',`);
      if (p.volume !== undefined) regels.push(`      volume: ${p.volume},`);
      regels.push(`      noten: ${JSON.stringify(opschrijven(tokens))},`, '    },');
    }
    regels.push('  ],', '});', '');
  }
  writeFileSync('src/data/stones.ts', regels.join('\n'));
  console.log(`wrote src/data/stones.ts: ${SONGS.length} songs`);
}
