/**
 * A Standard MIDI File reader, just enough to get notes out: tempo, time
 * signature, track names, programs, and every note with where it starts and
 * how long it lasts, in ticks. Nothing here plays anything.
 *
 * Used by tools/midi-naar-lied.ts, which turns the Stones files in
 * muziek-bron/ into the tracker notation in src/data/liedjes.ts. The game
 * never reads a MIDI file itself.
 */

export type MidiNoot = {
  readonly kanaal: number;
  readonly toon: number;
  readonly sterkte: number;
  /** In ticks from the start of the file. */
  readonly start: number;
  readonly lengte: number;
};

export type MidiSpoor = {
  readonly naam: string;
  /** Program per channel, as last set before the first note. */
  readonly programma: ReadonlyMap<number, number>;
  readonly noten: readonly MidiNoot[];
};

export type MidiBestand = {
  readonly formaat: number;
  readonly ticksPerKwart: number;
  /** Microseconds per quarter, with the tick it takes effect. */
  readonly tempi: readonly { readonly tick: number; readonly usPerKwart: number }[];
  readonly maatsoorten: readonly { readonly tick: number; readonly teller: number; readonly noemer: number }[];
  readonly sporen: readonly MidiSpoor[];
};

class Lezer {
  pos = 0;
  readonly data: Uint8Array;
  constructor(data: Uint8Array) { this.data = data; }
  byte(): number {
    if (this.pos >= this.data.length) throw new Error('MIDI file ends early');
    return this.data[this.pos++]!;
  }
  u16(): number { return (this.byte() << 8) | this.byte(); }
  u32(): number { return ((this.byte() << 24) >>> 0) + (this.byte() << 16) + (this.byte() << 8) + this.byte(); }
  vlq(): number {
    let n = 0;
    for (let i = 0; i < 4; i++) {
      const b = this.byte();
      n = (n << 7) | (b & 0x7f);
      if (!(b & 0x80)) return n;
    }
    throw new Error('variable-length number longer than four bytes');
  }
  tekst(n: number): string {
    const s = this.data.subarray(this.pos, this.pos + n);
    this.pos += n;
    return Array.from(s, (c) => String.fromCharCode(c)).join('');
  }
  id(): string { return this.tekst(4); }
}

export function leesMidi(data: Uint8Array): MidiBestand {
  const r = new Lezer(data);
  if (r.id() !== 'MThd') throw new Error('not a MIDI file');
  const kopLengte = r.u32();
  const formaat = r.u16();
  const aantal = r.u16();
  const deling = r.u16();
  r.pos += kopLengte - 6;
  if (deling & 0x8000) throw new Error('SMPTE timing is not supported');

  const tempi: { tick: number; usPerKwart: number }[] = [];
  const maatsoorten: { tick: number; teller: number; noemer: number }[] = [];
  const sporen: MidiSpoor[] = [];

  for (let s = 0; s < aantal && r.pos < data.length; s++) {
    const id = r.id();
    const lengte = r.u32();
    const einde = r.pos + lengte;
    if (id !== 'MTrk') { r.pos = einde; s--; continue; }

    let tick = 0;
    let status = 0;
    let naam = '';
    const programma = new Map<number, number>();
    const noten: MidiNoot[] = [];
    /** Notes still sounding, per channel and pitch: their start and velocity. */
    const open = new Map<number, { start: number; sterkte: number }[]>();
    const sluit = (kanaal: number, toon: number) => {
      const lijst = open.get(kanaal * 128 + toon);
      const o = lijst?.shift();
      if (o) noten.push({ kanaal, toon, sterkte: o.sterkte, start: o.start, lengte: Math.max(1, tick - o.start) });
    };

    while (r.pos < einde) {
      tick += r.vlq();
      let b = r.byte();
      if (b === 0xff) {
        const type = r.byte();
        const n = r.vlq();
        if (type === 0x51) {
          tempi.push({ tick, usPerKwart: (r.byte() << 16) | (r.byte() << 8) | r.byte() });
          r.pos += n - 3;
        } else if (type === 0x58) {
          const teller = r.byte();
          const noemer = 2 ** r.byte();
          maatsoorten.push({ tick, teller, noemer });
          r.pos += n - 2;
        } else if (type === 0x03 && !naam) {
          naam = r.tekst(n).trim();
        } else {
          r.pos += n;
        }
        continue;
      }
      if (b === 0xf0 || b === 0xf7) { r.pos += r.vlq(); continue; }

      let eerste: number;
      if (b & 0x80) { status = b; eerste = r.byte(); } else { eerste = b; b = status; }
      const soort = status & 0xf0;
      const kanaal = status & 0x0f;
      const tweede = soort === 0xc0 || soort === 0xd0 ? 0 : r.byte();

      if (soort === 0x90 && tweede > 0) {
        const sleutel = kanaal * 128 + eerste;
        if (!open.has(sleutel)) open.set(sleutel, []);
        open.get(sleutel)!.push({ start: tick, sterkte: tweede });
      } else if (soort === 0x80 || (soort === 0x90 && tweede === 0)) {
        sluit(kanaal, eerste);
      } else if (soort === 0xc0 && !programma.has(kanaal)) {
        programma.set(kanaal, eerste);
      }
    }
    for (const [sleutel, lijst] of open) for (const _ of lijst) sluit(Math.floor(sleutel / 128), sleutel % 128);
    noten.sort((a, b) => a.start - b.start || a.toon - b.toon);
    sporen.push({ naam, programma, noten });
    r.pos = einde;
  }

  return { formaat, ticksPerKwart: deling, tempi, maatsoorten, sporen };
}

/** General MIDI program names, in families of eight: enough to tell a guitar from a piano. */
export const GM_FAMILIE = [
  'PIANO', 'CHROM', 'ORGEL', 'GITAAR', 'BAS', 'STRIJK', 'ENSEMBLE', 'KOPER',
  'RIET', 'FLUIT', 'SYNTHLEAD', 'SYNTHPAD', 'SYNTHFX', 'ETNISCH', 'SLAG', 'FX',
] as const;
