/**
 * The gedicht before the game: Pim, talking, one strofe to a box, Enter for
 * the next. It plays once, the first time anyone goes past the title screen.
 *
 * One string per line, an empty string between strofen. Lines are shown as
 * written — a poem does not wrap — so at most 44 characters each. Rewrite it
 * in the editor at /teksten.html, where each strofe is previewed as the box
 * it will be.
 *
 * CONCEPT: these lines are a stand-in until Pim has written his own.
 */
export const INTRO: readonly string[] = [
  'SINT ZAT TE PEINZEN, MET EEN ZUCHT:',
  'WAT GEEF JE IEMAND DIE AL JAREN',
  'ZIJN EIGEN HUIS LOOPT TE VERBOUWEN',
  'EN NOOIT EENS RUSTIG ZIT TE STAREN?',
  '',
  'GEEN BOORMACHINE, GEEN NIEUW ZAAGJE,',
  'DAAR LIGT DE SCHUUR AL VOL MEE, TOCH?',
  'DUS KREEG DE PIET VAN SINT EEN VRAAGJE:',
  'BOUW HEM EEN HUIS DAT AF IS. NOG.',
  '',
  'HIER IS HET DAN. JE EIGEN KAMERS,',
  'JE EIGEN MUREN, STEEN VOOR STEEN.',
  'ALLEEN: DIT KEER KOMT ER EEN EINDE AAN.',
  'DRUK MAAR OP ENTER. SLOPEN. GA ER HEEN.',
];

/** The poem as boxes: the lines between two blank ones are one strofe. */
export function strofen(regels: readonly string[]): string[][] {
  const uit: string[][] = [];
  let huidig: string[] = [];
  for (const regel of regels) {
    if (regel.trim() === '') {
      if (huidig.length > 0) uit.push(huidig);
      huidig = [];
    } else {
      huidig.push(regel);
    }
  }
  if (huidig.length > 0) uit.push(huidig);
  return uit;
}
