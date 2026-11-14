import type { Beat } from './praatjes.ts';

/**
 * The end of the game, as copy. Everything in this file is Pim's to write;
 * what is here now is a stand-in so the outro can be seen running.
 */

/**
 * HET GEDICHT. One string per line, an empty string for a blank line. It
 * scrolls up the screen after the last level, slowly enough to read aloud.
 * Capitals only, at most 58 characters a line. Leave the list empty and the
 * outro skips straight past it.
 */
export const GEDICHT: readonly string[] = [
  'HIER KOMT HET GEDICHT.',
  '',
  'SINT ZAT TE DENKEN, EN PIM MOET HET NOG SCHRIJVEN:',
  'DEZE REGELS ZIJN ER ALLEEN OM TE BLIJVEN',
  'STAAN TOT DE ECHTE ZIJN GEMAAKT.',
  '',
  'VERVANG ZE IN SRC/DATA/OUTRO.TS',
  'EN DIT VERDWIJNT VANZELF.',
];

/** True while the lines above are the stand-in. Shows a note on screen. */
export const GEDICHT_IS_CONCEPT = true;

/**
 * The video message. Put the file at public/outro.mp4 and it plays after the
 * gedicht, full window, with sound. No file, no video: the outro notices and
 * carries on to the credits.
 */
export const VIDEO = 'outro.mp4';

/** Said over the finished house, before the gedicht. Moeder gets the last word. */
export const SLOT: readonly Beat[] = [
  { wie: 'pim', tekst: ['HIJ DRAAIT. HOOR JE DAT? NEE. DAT KLOPT. DAT IS DE BEDOELING.'] },
  { wie: 'wiep', tekst: ['MOOI HOOR. IK ZAT AL EEN TIJDJE WARM, MAAR MOOI.'] },
  { wie: 'moeder', tekst: ['HET IS AF. HET IS ECHT AF.', 'DUS. MIJN KLEIATELIER.'] },
  { wie: 'pim', tekst: ['MORGEN.'] },
];

export const AFTITELING: readonly string[] = [
  'DE EEUWIGE VERBOUWING',
  '',
  'EEN SINTERKLAASSURPRISE',
  'VOOR WOUTER',
  '',
  'BEDACHT EN GEBOUWD DOOR PIM',
  '',
  'MET DANK AAN',
  'MOEDER, VOOR HET GEDULD',
  'WIEP, VOOR HET VOORBEELD',
  'ZWART & DEKKER, VOOR NIETS',
  '',
  'MUZIEK NAAR DE PLATEN UIT DE KAST',
  '',
  '5 DECEMBER 2026',
  '',
  '',
  'OPGELEVERD.',
];
