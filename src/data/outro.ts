import type { Beat } from './praatjes.ts';

/**
 * The end of the game, as copy. Pim's own wording is in teksten.eigen.ts
 * and wins over what is written here.
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

/** Said over the finished house, before the gedicht. Myrthe says goodbye. */
export const SLOT: readonly Beat[] = [
  { wie: 'pim', tekst: ['HIJ DRAAIT. HOOR JE DAT? NEE. DAT KLOPT. DAT IS DE BEDOELING.'] },
  { wie: 'wiep', tekst: ['MOOI HOOR. IK ZAT AL EEN TIJDJE WARM, MAAR MOOI.'] },
  { wie: 'moeder', tekst: ['HET IS AF. HET IS ECHT AF.', 'DUS. MIJN KLEIATELIER.'] },
  { wie: 'myrthe', tekst: ['DOEI WOUTER! ALS JE OOIT WEER IETS SLOOPT: BEL ME. IK KOM MET DE KRUIWAGEN.', 'EN DE TAART NEEM IK OOK MEE.'] },
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
  'MUZIEK: THE ROLLING STONES,',
  'GESPEELD DOOR EEN COMPUTER UIT 1985',
  '',
  'START ME UP',
  'BROWN SUGAR',
  'SATISFACTION',
  "JUMPIN' JACK FLASH",
  'PAINT IT BLACK',
  'MISS YOU',
  'ANGIE',
  '',
  '5 DECEMBER 2026',
  '',
  '',
  'OPGELEVERD.',
];
