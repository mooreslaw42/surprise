import { lied, type Lied, type Muziekkeuze } from '../engine/muziek.ts';
import type { StageKind } from './stages.ts';

/**
 * The songbook: three arrangements after his own records, written as data for
 * the little synth in audio.ts.
 *
 * Arrangements, not transcriptions. What carries across is the harmony and
 * the gesture — the chug of the riff, the shuffle of the boogie, the slow
 * modal fall of the ballad. Three voices and a noise channel cannot play a
 * Rolling Stones record anyway, and trying would sound like a ringtone; what
 * a chip can do is state the idea and get out of the way. All three are in
 * copyright, which is the other reason the URL stays unlisted.
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
 * The title screen and every stage theme, after *Can't You Hear Me Knocking*.
 *
 * A minor pentatonic, a chugging bass on the root, and off-beat stabs where
 * the rhythm guitar would be. Bass, stabs and drums loop every two bars; the
 * lead runs eight and ends by shutting up for half of one, because this has
 * to survive being on for twenty minutes while someone measures a wall.
 * Transposed per stage, which is what makes eight stages out of one riff.
 */
export const RIFF: Lied = lied({
  id: 'riff',
  naam: 'HOOR JE MIJ KLOPPEN',
  naar: "Can't You Hear Me Knocking",
  bpm: 112,
  swing: 0.12,
  sporen: [
    {
      stem: 'bas',
      noten: `
        a1*3 a1*3 a1*2 g1*2 a1*2 .*2 e2*2 |
        a1*3 a1*3 c2*2 d2*2 .*2 g1*2 a1*2
      `,
    },
    {
      // Power chords on the off-beat, low in the mix: the thing you would
      // miss if it were gone but never listen to.
      stem: 'zaag',
      volume: 0.3,
      noten: `
        .*2 a2+e3*2 .*2 a2+e3*2 .*2 g2+d3*2 .*2 a2+e3*2 |
        .*2 a2+e3*2 .*2 c3+g3*2 .*2 d3+a3*2 .*2 a2+e3*2
      `,
    },
    {
      stem: 'puls',
      volume: 0.8,
      noten: `
        .*2 a3*2 c4*2 d4*3 .*1 c4*2 a3*4 | g3*3 a3*3 .*2 a3*2 g3*2 e3*4 |
        .*2 e4*2 d4*2 c4*3 .*1 d4*2 c4*4 | a3*3 c4*3 .*2 d4*2 c4*2 a3*4 |
        a3*2 c4*2 d4*2 e4*2 g4*4 e4*4    | d4*4 c4*2 a3*2 .*4 c4*2 d4*2 |
        e4*3 d4*3 c4*2 a3*2 .*6          | .*8 g3*2 a3*2 .*4
      `,
    },
    {
      stem: 'slagwerk',
      noten: `
        k!+h! . h . s!+h . k+h . k+h! . h k  s!+h .  h  . |
        k!+h! . h . s!+h . k+h . k+h! . h .  s!+h s  o! .
      `,
    },
  ],
});

/**
 * The boogie bass figure: root, fifth, sixth, fifth, twice over, shuffled.
 * Written out by hand it is seventy-two tokens of the same four notes, and
 * one of them would be wrong, so the bar is generated and the form below
 * reads as the twelve-bar blues it is.
 */
function boogieMaat(root: string, vijf: string, zes: string): string {
  return `${root}*2 ${vijf} ${zes}*2 ${vijf} ${root}*2 ${vijf} ${zes}*2 ${vijf}`;
}

const E7 = boogieMaat('e2', 'b2', 'c#3');
const A7 = boogieMaat('a2', 'e3', 'f#3');
const B7 = boogieMaat('b2', 'f#3', 'g#3');

/**
 * The boss, after *I'm Going Home*.
 *
 * Twelve bars in E, fast, on a grid of twelve steps a bar rather than
 * sixteen — so a shuffled eighth is two steps long and then one, which is the
 * shuffle itself rather than an approximation of it. The licks leave whole
 * bars empty: the bass is the tune, and the ventilation unit has finally been
 * delivered, so the player has enough to think about.
 */
export const BOOGIE: Lied = lied({
  id: 'boogie',
  naam: 'IK GA NAAR HUIS',
  naar: "I'm Going Home",
  bpm: 150,
  stappenPerMaat: 12,
  sporen: [
    {
      stem: 'bas',
      noten: [E7, E7, E7, E7, A7, A7, E7, E7, B7, A7, E7, B7].join(' | '),
    },
    {
      stem: 'zaag',
      volume: 0.8,
      noten: `
        .*12                              | .*6 e4*2 g4 b4*2 a4              |
        g4*2 e4 d4*2 b3 .*6               | .*12                             |
        a4*2 c5 b4*2 a4 g4*2 e4 .*3       | .*3 g4*2 a4 g4*2 e4 d4*2 e4      |
        b4*2 a4 g4*2 e4 .*6               | .*6 d4*2 e4 g4*2 a4              |
        b4*2 d5 b4*2 a4 f#4*2 d#4 .*3     | a4*2 c5 a4*2 g4 e4*2 g4 e4*2 d4  |
        e4*2 g4 b4*2 e5 d5*2 b4 g4*2 e4   | .*6 b4*2 a4 f#4*2 .
      `,
    },
    {
      stem: 'slagwerk',
      noten: 'k!+h! . h s!+h . h k+h! . h s!+h . h',
    },
  ],
});

export const LIEDJES: readonly Lied[] = [BALLADE, RIFF, BOOGIE];

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
  // The two bosses play the boogie; these are only here to keep the table whole.
  tuinhuis: { lied: BOOGIE },
  oplevering: { lied: BOOGIE },
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
export const BAAS: Muziekkeuze = { lied: BOOGIE };
