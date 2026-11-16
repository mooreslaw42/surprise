import { lied, type Lied, type Muziekkeuze } from '../engine/muziek.ts';
import type { StageKind } from './stages.ts';

/**
 * The songbook: three pieces after his own records, written as data for the
 * little synth in audio.ts.
 *
 * The ballad is an arrangement: the harmony and the fall of it, not the
 * notes. The other two started that way as well and did not survive being
 * played to anyone, so the riff and the slow blues now follow the records
 * themselves, off guitar tabs, on a guitar voice that was built for them.
 * A few bars each, looped. All three are in copyright, which is the reason
 * the URL stays unlisted.
 */

/**
 * Menus and the house map, after *Blue in Green*.
 *
 * Eight bars, no drums, slow enough that it never nags while you page through
 * the ladder looking at what you have not earned yet. Dm9 and A7 either side
 * of a Db7 that drops into Cm9, which is where the colour is: the melody
 * leans on the notes that do not belong to the chord — f over the A7, g over
 * the Db7 — and lets them hang.
 */
export const BALLADE: Lied = lied({
  id: 'ballade',
  naam: 'BLAUW IN GROEN',
  naar: 'Blue in Green',
  bpm: 58,
  sporen: [
    {
      // Four-note voicings, one a bar, sustained the whole way through.
      stem: 'driehoek',
      volume: 0.3,
      noten: `
        d3+f3+a3+e4*16  | a2+c#3+g3+f4*16 | d3+f3+a3+e4*16  | db3+f3+b3+g4*16 |
        c3+eb3+g3+d4*16 | f2+a2+eb3+d4*16 | bb2+d3+f3+a3*16 | a2+c#3+g3+f3*16
      `,
    },
    {
      // The tune. A square, kept quiet and rolled off, so it reads as a
      // melody over the pad without turning into a telephone.
      stem: 'puls',
      volume: 0.45,
      noten: `
        .*4 a4*6 f4*3 e4*3   | f4*8 c#4*8          |
        d4*4 e4*2 f4*6 a4*4  | g4*6 f4*4 db4*6     |
        eb4*8 d4*4 c4*4      | .*2 a4*4 g4*4 f4*6  |
        d4*6 f4*4 a4*6       | .*4 f4*4 e4*8
      `,
    },
    {
      // Root on one, the fifth halfway. Nothing walks: it is a ballad.
      stem: 'driehoek',
      volume: 0.55,
      noten: `
        d2*8 a2*8   | a1*8 e2*8  | d2*8 a2*8  | db2*8 ab2*8 |
        c2*8 g2*8   | f2*8 c3*8  | bb1*8 f2*8 | a1*8 e2*8
      `,
    },
  ],
});

/**
 * The title screen and every stage theme: *Can't You Hear Me Knocking*.
 *
 * This one is the record's own opening riff, off a tab Pim sent, because the
 * first version was a tune in the right mood and nobody recognised it. Open
 * G tuning, in D: two strings at a time, pulled off from the tenth fret down
 * to the seventh, and then the D chord worried at with one finger. Four bars
 * of that, then four of the verse — D, down through C to G and home — so the
 * riff comes back as an arrival rather than a loop.
 *
 * The bass leaves the second half of the bar empty, as it does on the
 * record; the drums are what carry it. Transposed per stage, which is what
 * makes eight stages out of one riff.
 */
export const RIFF: Lied = lied({
  id: 'riff',
  naam: 'HOOR JE MIJ KLOPPEN',
  naar: "Can't You Hear Me Knocking",
  bpm: 80,
  swing: 0.1,
  sporen: [
    {
      stem: 'gitaar',
      volume: 0.85,
      noten: `
        f4+c4! e4+b3 d4+a3*2 e4+b3 d4+a3*2 c4+f3! b3+e3 a3+d3*2 a3+d3 b3+d3*2 a3+d3*2 |
        a3+d3!*2 a3+d3*2 b3+d3 a3+d3*2 c4+d3! b3+d3 a3+d3*2 a3+d3 b3+d3*2 a3+d3*2 |
        f4+c4!*2 d4+a3*2 e4+b3 d4+a3*2 c4+f3! b3+e3 a3+d3*2 a3+d3 b3+d3 d4+a3*3 |
        a3+d3!*2 a3+d3*2 b3+d3 a3+d3*2 c4+d3! b3+d3 a3+d3*2 a3+d3 .*4 |
        d3+a3+d4!*2 . d3+a3+d4 d3+a3+d4*2 . d3+a3+d4 .*2 d3+a3+d4*2 .*4 |
        f4+c4! e4+b3 d4+a3*2 e4+b3 d4+a3*2 c4+f3 b3+e3 .*3 c3+g3+c4!*2 c3+g3+c4*2 |
        c3+g3+c4*2 . c3+g3+c4 c3+g3+c4*2 .*2 g2+d3+g3!*2 g2+d3+g3 . g2+d3+g3*2 .*2 |
        d3+a3+d4!*3 . a3+d3 b3+d3*2 a3+d3*2 .*7
      `,
    },
    {
      stem: 'bas',
      volume: 0.7,
      noten: `
        d2*2 a1 d2 d2 a1 d2*2 d2 a1*2 .*5 |
        d2*2 . a1 d2*2 d2 . a1*2 d2*2 d2 a1*2 . |
        d2*2 a1 d2 d2 a1 d2*2 d2 a1*2 .*5 |
        d2*2 . a1 d2*2 d2 . a1*2 d2*2 d2 a1*2 . |
        d2*2 a1 d2 d2 a1 d2*2 d2 a1*2 .*5 |
        d2*2 a1 d2 d2 a1 d2*2 .*4 c2*2 c2*2 |
        c2*2 g1 c2 c2*2 .*2 g1*2 g1 . g1*2 g1 a1 |
        d2*3 . d2 a1 d2*2 .*4 a1*2 c2*2
      `,
    },
    {
      // Straight and behind the beat, nothing clever: the riff is syncopated
      // enough for the whole band.
      stem: 'slagwerk',
      noten: `
        k!+h . h . s!+h . h k k+h . h . s!+h . h . |
        k!+h . h k s!+h . h . k+h k h . s!+h . o .
      `,
    },
  ],
});

/** The comping figure of the slow blues, for the bars that are all alike. */
function kwartslag(akkoord: string, onder: string, staart = 'bb3 b3 c4'): string {
  // The chord, the same shape a fret lower on the last triplet, and back on
  // two; G on three; then the three notes that walk up into the next bar.
  return `${akkoord}!*2 ${onder} ${akkoord}*3 g3*3 ${staart}`;
}

const C7 = kwartslag('c3+g3+bb3+e4', 'b2+f#3+a3+eb4');
const F9 = kwartslag('f3+a3+eb4+g4', 'e3+g#3+d4+g4');
const G7 = kwartslag('g3+b3+f4+g4', 'f#3+a#3+e4+g4');
/** C7 again, but the second half climbs the neck instead of walking. */
const C7_OP = 'c3+g3+bb3+e4!*2 b2+f#3+a3+eb4 c3+g3+bb3+e4*3 c3+c4+e4+bb4*2 c4+f4+a4*2 f4*2';
/** The bar after it: a trill on the third, and the walk-up back in. */
const TRILLER = 'eb4 e4 eb4 e4*3 g3*3 bb3 b3 c4';

/**
 * The bosses and the credits: Ten Years After's *Slow Blues in C*.
 *
 * Pim's pick, off a tab, in place of a fast boogie that did not sound like
 * anybody. Twelve bars in twelve-eight, so the grid is twelve steps and one
 * step is one triplet. The rhythm guitar is the record's: a ninth chord slid
 * down a fret and back, and a three-note walk-up at the end of every bar
 * that makes the next one inevitable. The turnaround in bar eleven is the
 * oldest one there is. The lead on top is the right scale in the right
 * place on the neck and leaves the first two bars and the last two alone.
 *
 * Slow on purpose under a boss: these are the two levels where he will sit
 * and think for a quarter of an hour.
 */
export const BLUES: Lied = lied({
  id: 'blues',
  naam: 'TRAGE BLUES IN C',
  naar: 'Slow Blues in C',
  bpm: 60,
  stappenPerMaat: 12,
  sporen: [
    {
      stem: 'schoon',
      volume: 0.9,
      noten: [
        C7, F9, C7_OP, TRILLER,
        F9, F9, C7_OP, TRILLER,
        G7, kwartslag('f3+a3+eb4+g4', 'e3+g#3+d4+g4', 'bb3 b3 eb4'),
        'c4! c5 c5 bb3 c5 c5 a3 c5 c5 ab3 c5 g3',
        'f4!*3 b3*3 g3*3 g2*3',
      ].join(' | '),
    },
    {
      stem: 'gitaar',
      volume: 0.9,
      noten: `
        .*12                               | .*9 g4 bb4 c5                    |
        eb5!*2 c5 bb4*3 g4*2 bb4 c5*3      | .*12                             |
        a4 c5! c5 c5 c5 c5 a4 c5 c5 c5*3   | eb5!*2 f5 eb5*2 c5 bb4*3 .*3     |
        g4 bb4 c5 eb5!*3 c5*2 bb4 g4*3     | .*6 f4 g4 bb4 c5*3               |
        d5!*3 f5*2 d5 b4*3 g4*3            | eb5*2 c5 a4*3 f4*2 a4 c5*3       |
        .*12                               | .*12
      `,
    },
    {
      stem: 'bas',
      volume: 0.6,
      noten: `
        c2*3 e2*3 g2*3 a2*3    | f2*3 a2*3 c3*3 a2*3    | c2*3 e2*3 g2*3 a2*3  | c2*3 e2*3 g2*3 e2*3 |
        f2*3 a2*3 c3*3 a2*3    | f2*3 a2*3 c3*3 a2*3    | c2*3 e2*3 g2*3 a2*3  | c2*3 e2*3 g2*3 e2*3 |
        g2*3 b2*3 d3*3 b2*3    | f2*3 a2*3 c3*3 a2*3    | c2*3 bb1*3 a1*3 ab1*3 | g1*3 g1*3 g1*3 g1 a1 b1
      `,
    },
    {
      stem: 'slagwerk',
      volume: 0.8,
      noten: 'k!+h! h h s+h! h h k+h! h k s!+h! h h',
    },
  ],
});

export const LIEDJES: readonly Lied[] = [BALLADE, RIFF, BLUES];

/**
 * The riff, moved, once per stage. Small intervals, chosen so the bass stays
 * on a note a speaker can actually make and the lead stays under the ceiling
 * where a square starts to whistle.
 *
 * Kanaalplan gets it four semitones down and slower: the same tune as the
 * work either side of it, dragged out, because that is what planning the
 * ventilation for the fourth time feels like.
 */
const THEMA: Record<StageKind, Muziekkeuze> = {
  leeghalen: { lied: RIFF },
  sloop: { lied: RIFF },
  isolatie: { lied: RIFF, halveTonen: 3 },
  elektra: { lied: RIFF, halveTonen: 5 },
  klossen: { lied: RIFF, halveTonen: -2 },
  vloeren: { lied: RIFF, halveTonen: 2 },
  schilderen: { lied: RIFF, halveTonen: 7 },
  kanalen: { lied: RIFF, halveTonen: -4, tempo: 0.88 },
  // The two bosses play the blues; these are only here to keep the table whole.
  tuinhuis: { lied: BLUES },
  oplevering: { lied: BLUES },
};

export function thema(kind: StageKind): Muziekkeuze {
  return THEMA[kind];
}

/**
 * The three that are not a stage theme.
 *
 * The game opens on the riff, untransposed — it is the hook, and a title
 * screen is no place to be tasteful. Note that this is the same request as
 * the sloop theme, so walking off the title straight into a wall would not
 * interrupt it; everything else goes by way of the house map and the ballad.
 */
export const OPENING: Muziekkeuze = { lied: RIFF };
export const MENU: Muziekkeuze = { lied: BALLADE };
export const BAAS: Muziekkeuze = { lied: BLUES };
