/**
 * Music as data: a tracker notation, a parser, and nothing that touches the
 * browser. The synth that makes a sound out of this lives in audio.ts; this
 * file is pure so the whole songbook can be checked in the test suite.
 *
 * A typo in a song is silence on 5 December, which is the same class of
 * disaster as an unsolvable level, so it gets the same treatment: the
 * arrangements are parsed the moment they are declared and a token that is
 * not a note throws by name. Nothing ships quietly broken.
 *
 * Notation, one token per step, whitespace-separated:
 *
 *   c4 a#3 eb2   a note. Middle C is c4. Sharps and flats both allowed.
 *   c4+e4+g4     a chord, struck together.
 *   e3!          accented, played harder.
 *   k s h o c    on a drum track: kick, snare, hat, open hat, crash.
 *   .            silence.
 *   -            hold whatever was struck last, one step longer.
 *   x*4          shorthand for x followed by three holds: four steps of x.
 *   |            bar line. Ignored, there to be counted by eye.
 *
 * Tracks loop at their own length, so a one-bar drum pattern runs happily
 * under an eight-bar riff and only the riff has to be written out.
 */

export type StemNaam = 'puls' | 'zaag' | 'driehoek' | 'bas' | 'slagwerk';

/** One-off sounds, played over the music rather than as part of it. */
export type Effect = 'klaar' | 'kapot' | 'fout' | 'tik' | 'fanfare';

export type Slag = 'kick' | 'snare' | 'hat' | 'open' | 'crash';

const SLAGWERK: Record<string, Slag> = {
  k: 'kick', s: 'snare', h: 'hat', o: 'open', c: 'crash',
};

const TREDEN: Record<string, number> = {
  c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11,
};

/** 4/4 throughout, so a bar is four beats and nothing here has to ask. */
const SLAGEN_PER_MAAT = 4;

/** Sixteenths. Twelve gives triplets, which is how the boogie shuffles. */
const STAPPEN_PER_MAAT = 16;

/** Under construction: the same shape as a Noot, before the holds are in. */
type Bouw = { toon: number; slag: Slag | null; lengte: number; accent: boolean };

/** One sounding note, resolved out of the notation. */
export type Noot = {
  /** MIDI number, or -1 on a drum track. */
  readonly toon: number;
  readonly slag: Slag | null;
  /** In steps. Holds have already been folded in. */
  readonly lengte: number;
  readonly accent: boolean;
};

export type Spoor = {
  readonly stem: StemNaam;
  /** 0..1, relative to the song. Defaults to full. */
  readonly volume?: number;
  readonly noten: string;
};

export type LiedSpec = {
  readonly id: string;
  /** What it says on the tin, and on the design sheet. */
  readonly naam: string;
  /** Which record it is after, for the credits. */
  readonly naar: string;
  readonly bpm: number;
  readonly stappenPerMaat?: number;
  /** 0..1. How late the off-beat step lands. Only sensible on a 16 grid. */
  readonly swing?: number;
  readonly sporen: readonly Spoor[];
};

export type Lied = LiedSpec & {
  readonly stappenPerMaat: number;
  readonly swing: number;
  /** Parsed at declaration, so a bad token never reaches a December evening. */
  readonly partijen: readonly Partij[];
};

export type Partij = {
  readonly stem: StemNaam;
  readonly volume: number;
  /** Loop length in steps. Always a whole number of bars. */
  readonly stappen: number;
  /** What is struck on each step. Index with `stap % stappen`. */
  readonly perStap: readonly (readonly Noot[])[];
};

/** Which song to play, and how. The same riff, moved, is a different stage. */
export type Muziekkeuze = {
  readonly lied: Lied;
  /** Transpose. Eight stages out of one riff. */
  readonly halveTonen?: number;
  /** Multiplier on the tempo. Below 1 drags, which can be the joke. */
  readonly tempo?: number;
};

/** MIDI number for a name like c4, d#3 or bb1. Middle C is c4 = 60. */
export function toon(naam: string): number {
  const m = /^([a-g])([#b]?)(-?\d)$/.exec(naam.toLowerCase());
  if (!m) throw new Error(`not a note: ${naam}`);
  const trede = TREDEN[m[1]!]!;
  const buiging = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return 12 * (Number(m[3]) + 1) + trede + buiging;
}

export function hertz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Seconds per step. A sixteenth at 120 is an eighth of a second. */
export function stapDuur(bpm: number, stappenPerMaat: number): number {
  return (SLAGEN_PER_MAAT * 60) / bpm / stappenPerMaat;
}

/**
 * Expand the `x*4` shorthand and drop the bar lines, leaving one token per
 * step. Split out because getting the step count wrong is the easiest
 * mistake to make in this notation and the easiest thing to test.
 */
export function stappenVan(noten: string): string[] {
  const uit: string[] = [];
  for (const stuk of noten.split(/\s+/)) {
    if (stuk === '' || stuk === '|') continue;
    const m = /^(.+)\*(\d+)$/.exec(stuk);
    if (!m) {
      uit.push(stuk);
      continue;
    }
    const n = Number(m[2]);
    if (n < 1) throw new Error(`${stuk}: a token has to last at least one step`);
    uit.push(m[1]!);
    for (let i = 1; i < n; i++) uit.push('-');
  }
  return uit;
}

/**
 * Split a struck token into its notes. Chords are plus-separated and the
 * accent is per note, so `k!+h` is a hard kick under an ordinary hat.
 */
function slaan(token: string, stem: StemNaam, waar: string): Bouw[] {
  return token.split('+').map((stuk) => {
    const accent = stuk.endsWith('!');
    const deel = accent ? stuk.slice(0, -1) : stuk;
    if (deel === '') throw new Error(`${waar}: bare accent`);
    if (stem === 'slagwerk') {
      const slag = SLAGWERK[deel];
      if (!slag) throw new Error(`${waar}: ${deel} is not a drum (k s h o c)`);
      return { toon: -1, slag, lengte: 1, accent };
    }
    if (deel.length === 1 && SLAGWERK[deel] !== undefined) {
      throw new Error(`${waar}: ${deel} is a drum, and ${stem} is not a drum track`);
    }
    return { toon: toon(deel), slag: null, lengte: 1, accent };
  });
}

export function partij(spoor: Spoor, stappenPerMaat: number, waar: string = spoor.stem): Partij {
  const stappen = stappenVan(spoor.noten);
  if (stappen.length === 0) throw new Error(`${waar}: empty track`);
  if (stappen.length % stappenPerMaat !== 0) {
    // Tracks loop independently, so one that is not a whole number of bars
    // would drift against the others a little further every time round.
    throw new Error(
      `${waar}: ${stappen.length} steps is ${(stappen.length / stappenPerMaat).toFixed(2)} bars`,
    );
  }

  const perStap: Bouw[][] = stappen.map(() => []);
  // The notes still ringing, so a hold lengthens the chord rather than the
  // last note of it.
  let open: Bouw[] = [];
  stappen.forEach((token, i) => {
    if (token === '.') {
      open = [];
      return;
    }
    if (token === '-') {
      // A hold with nothing to hold is a rest; it reads as a tie that the
      // writer meant to carry over a bar line, so it should not be fatal.
      for (const noot of open) noot.lengte++;
      return;
    }
    const noten = slaan(token, spoor.stem, `${waar} step ${i}`);
    perStap[i] = noten;
    open = noten;
  });

  return {
    stem: spoor.stem,
    volume: spoor.volume ?? 1,
    stappen: stappen.length,
    perStap,
  };
}

/**
 * Declare a song. Parses on the spot: an arrangement that does not add up
 * fails the moment it is imported, which means in the test suite.
 */
export function lied(spec: LiedSpec): Lied {
  const stappenPerMaat = spec.stappenPerMaat ?? STAPPEN_PER_MAAT;
  if (spec.sporen.length === 0) throw new Error(`${spec.id}: a song needs a track`);
  return {
    ...spec,
    stappenPerMaat,
    swing: spec.swing ?? 0,
    partijen: spec.sporen.map((s, i) => partij(s, stappenPerMaat, `${spec.id} ${s.stem}[${i}]`)),
  };
}

/**
 * Two requests for music are the same request if they would sound the same.
 * Scenes name their music every frame, so this is what stops the riff
 * restarting sixty times a second — and what keeps it running unbroken
 * across the six walls of a stage.
 */
export function zelfdeKeuze(a: Muziekkeuze | null, b: Muziekkeuze | null): boolean {
  if (!a || !b) return a === b;
  return a.lied.id === b.lied.id &&
    (a.halveTonen ?? 0) === (b.halveTonen ?? 0) &&
    (a.tempo ?? 1) === (b.tempo ?? 1);
}

export type Boeking = {
  /** Steps to book, each with the moment on the audio clock it falls on. */
  readonly stappen: readonly { readonly stap: number; readonly t: number }[];
  /** Where the clock and the counter have got to, to hand back next frame. */
  readonly volgende: number;
  readonly stap: number;
};

/**
 * Which steps fall inside the lookahead window.
 *
 * Split out from the synth because it is the one piece of the audio that can
 * go wrong without making a sound you can point at. Two rules:
 *
 * Book ahead, so a note never waits on a frame. A sixteenth at 150bpm is
 * 130ms and a slow frame is 50, so scheduling a note when its step comes
 * round would put a third of the record late.
 *
 * And if the clock has run past us — the tab was in the background, where
 * requestAnimationFrame stops and the audio clock does not — do not catch
 * up. Playing the minute we missed as fast as the loop can book it is the
 * worst noise this game could make. Skip to now and carry on.
 */
export function boeken(
  stap: number, volgende: number, nu: number, duur: number, vooruit: number,
): Boeking {
  let t = volgende < nu ? nu + 0.04 : volgende;
  let n = stap;
  const stappen: { stap: number; t: number }[] = [];
  while (t < nu + vooruit) {
    stappen.push({ stap: n, t });
    t += duur;
    n++;
  }
  return { stappen, volgende: t, stap: n };
}

/** Every note in the song, for range checks and for the register of a part. */
export function alleTonen(lied: Lied): number[] {
  const uit: number[] = [];
  for (const partij of lied.partijen) {
    for (const stap of partij.perStap) {
      for (const noot of stap) if (noot.toon >= 0) uit.push(noot.toon);
    }
  }
  return uit;
}
