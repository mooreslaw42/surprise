import type { Lied, Muziekkeuze } from '../engine/muziek.ts';
import type { StageKind } from './stages.ts';
import {
  ANGIE, BROWN_SUGAR, JUMPIN_JACK_FLASH, MISS_YOU, PAINT_IT_BLACK, SATISFACTION, START_ME_UP,
} from './stones.ts';

/**
 * The songbook: seven Rolling Stones songs, played by an 80s home computer.
 *
 * The notes come from MIDI files of the records (muziek-bron/), cut to a
 * four-bar loop where the riff, the bass and the drums are all in, by
 * tools/midi-naar-lied.ts. Notes from the records, sounds from a chip: square
 * lead, sawtooth chords, square bass, noise drums. All of it is in
 * copyright, which is the reason the URL stays unlisted.
 */
export const LIEDJES: readonly Lied[] = [
  START_ME_UP, BROWN_SUGAR, SATISFACTION, JUMPIN_JACK_FLASH, PAINT_IT_BLACK, MISS_YOU, ANGIE,
];

/**
 * Three riffs taking turns over the stages, so the same one never plays two
 * stages running. Kanaalplan gets Start Me Up: the unit that never arrives,
 * and the song about something that will not start.
 */
const THEMA: Record<StageKind, Muziekkeuze> = {
  leeghalen: { lied: SATISFACTION },
  sloop: { lied: JUMPIN_JACK_FLASH },
  isolatie: { lied: PAINT_IT_BLACK },
  elektra: { lied: SATISFACTION },
  klossen: { lied: JUMPIN_JACK_FLASH },
  vloeren: { lied: PAINT_IT_BLACK },
  schilderen: { lied: SATISFACTION },
  kanalen: { lied: START_ME_UP },
  // The two bosses play Miss You; these are only here to keep the table whole.
  tuinhuis: { lied: MISS_YOU },
  oplevering: { lied: MISS_YOU },
};

export function thema(kind: StageKind): Muziekkeuze {
  return THEMA[kind];
}

/** The title screen: the 1981 one, which is as 80s as the Stones get. */
export const OPENING: Muziekkeuze = { lied: START_ME_UP };
/** The house map, and the finished house in the outro. */
export const MENU: Muziekkeuze = { lied: BROWN_SUGAR };
export const BAAS: Muziekkeuze = { lied: MISS_YOU };
/** The credits. */
export const AFTITELING_MUZIEK: Muziekkeuze = { lied: ANGIE };
