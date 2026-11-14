import { C } from '../engine/palette.ts';
import type { PixelBuffer } from '../engine/pixelbuffer.ts';
import { drawPim, PIM_W, PIM_H } from './pim.ts';

/**
 * Everyone who gets a word in. Pim has a file to himself because he was
 * drawn from a photo; Moeder and Wiep are drawn from a description, to the
 * same frame and the same light, so the three sit in one box without the
 * text jumping about.
 *
 * PROVISIONAL likenesses: nobody has seen a photo of either. What carries
 * them is what they are in the story — clay on an apron, a tape measure
 * and a ponytail — and the hair and clothes are one line each to change.
 */

export type Spreker = 'pim' | 'moeder' | 'wiep';

export const SPREKER_NAAM: Record<Spreker, string> = {
  pim: 'PIM',
  moeder: 'MOEDER',
  wiep: 'WIEP',
};

export const PORTRET_W = PIM_W;
export const PORTRET_H = PIM_H;

export function drawPortret(
  screen: PixelBuffer, wie: Spreker, x: number, y: number, talking = false,
): void {
  if (wie === 'moeder') drawMoeder(screen, x, y, talking);
  else if (wie === 'wiep') drawWiep(screen, x, y, talking);
  else drawPim(screen, x, y, talking);
}

const SCHOUDERS = [13, 15, 16, 17, 18, 18];

function schouders(screen: PixelBuffer, cx: number, y: number, kleur: number, schaduw: number, licht: number): void {
  SCHOUDERS.forEach((half, i) => {
    const row = y + PORTRET_H - SCHOUDERS.length + i;
    screen.fillRect(cx - half - 1, row, half * 2 + 3, 1, C.ROET);
    screen.fillRect(cx - half, row, half * 2 + 1, 1, kleur);
    screen.fillRect(cx - half, row, Math.max(2, half - 8), 1, schaduw);
    screen.fillRect(cx + half - Math.max(2, half - 11), row, Math.max(2, half - 11), 1, licht);
  });
}

function gezicht(screen: PixelBuffer, cx: number, y: number): void {
  screen.fillRect(cx - 5, y + 29, 10, 8, C.ROET);
  screen.fillRect(cx - 4, y + 29, 8, 8, C.HOUT);
  screen.fillRect(cx - 2, y + 29, 6, 8, C.LICHTHOUT);

  screen.fillEllipse(cx, y + 20, 11, 13, C.ROET);
  screen.fillEllipse(cx, y + 20, 10, 12, C.HOUT);
  screen.fillEllipse(cx + 1, y + 20, 9, 11, C.LICHTHOUT);
  screen.fillEllipse(cx + 2, y + 19, 6, 8, C.LICHTOKER);
  screen.fillRect(cx - 1, y + 19, 2, 4, C.HOUT);
  screen.fillRect(cx, y + 22, 2, 1, C.LICHTOKER);
}

function ogen(screen: PixelBuffer, cx: number, y: number, streng: boolean): void {
  for (const side of [-1, 1] as const) {
    const ex = cx + side * 5;
    screen.fillRect(ex - 2, y + 12, 5, 1, C.STEEN);
    if (streng) screen.set(ex - side * 2, y + 13, C.STEEN);   // one brow down: a question that is not a question
    screen.fillRect(ex - 2, y + 17, 4, 2, C.WIT);
    screen.fillRect(ex - 1, y + 17, 2, 2, C.ROET);
    screen.fillRect(ex - 2, y + 16, 4, 1, C.STEEN);
  }
}

function mond(screen: PixelBuffer, cx: number, y: number, talking: boolean, kleur: number): void {
  const my = y + 26;
  if (talking) {
    screen.fillEllipse(cx, my, 3, 2, C.STEEN);
    screen.fillEllipse(cx, my, 2, 1, C.DONKERROOD);
  } else {
    screen.fillRect(cx - 3, my, 7, 1, kleur);
    screen.set(cx - 4, my - 1, kleur);
    screen.set(cx + 4, my - 1, kleur);
  }
}

/**
 * Moeder. Silver bob, a terracotta apron with a thumbprint of clay on it,
 * and the look of someone who has asked this before.
 */
export function drawMoeder(screen: PixelBuffer, x: number, y: number, talking = false): void {
  const cx = x + 20;
  schouders(screen, cx, y, C.SALIE, C.DONKERSALIE, C.LICHTSALIE);
  // The apron bib, and what is on it.
  screen.fillRect(cx - 8, y + 39, 17, 7, C.TERRACOTTA);
  screen.fillRect(cx - 8, y + 39, 17, 1, C.ROESTROOD);
  screen.fillRect(cx - 8, y + 36, 2, 4, C.TERRACOTTA);
  screen.fillRect(cx + 7, y + 36, 2, 4, C.TERRACOTTA);
  screen.fillRect(cx + 2, y + 42, 4, 2, C.ZANDGRIJS);
  screen.set(cx - 4, y + 43, C.ZANDGRIJS);

  // Hair behind the face first, so the bob frames it.
  screen.fillEllipse(cx, y + 15, 14, 13, C.ROET);
  screen.fillEllipse(cx, y + 15, 13, 12, C.ZANDGRIJS);
  screen.fillRect(cx - 13, y + 15, 27, 13, C.ZANDGRIJS);
  screen.fillRect(cx - 14, y + 16, 1, 12, C.ROET);
  screen.fillRect(cx + 14, y + 16, 1, 12, C.ROET);
  screen.fillRect(cx - 13, y + 28, 5, 1, C.ROET);
  screen.fillRect(cx + 9, y + 28, 5, 1, C.ROET);

  gezicht(screen, cx, y);

  // Fringe, swept to one side, and the light on top of it.
  screen.fillEllipse(cx - 2, y + 9, 11, 5, C.ZANDGRIJS);
  screen.fillEllipse(cx + 6, y + 10, 6, 4, C.ZANDGRIJS);
  screen.fillEllipse(cx + 1, y + 6, 8, 3, C.KALK);
  screen.fillEllipse(cx + 4, y + 5, 4, 2, C.WIT);
  screen.ditherRect(cx - 13, y + 17, 3, 10, C.ASGRIJS, C.ZANDGRIJS);

  ogen(screen, cx, y, true);
  // Reading glasses, pushed down the nose.
  screen.strokeRect(cx - 8, y + 19, 6, 4, C.DONKERROOD);
  screen.strokeRect(cx + 3, y + 19, 6, 4, C.DONKERROOD);
  screen.fillRect(cx - 2, y + 20, 5, 1, C.DONKERROOD);
  screen.set(cx - 11, y + 24, C.BOTERGEEL);
  screen.set(cx + 11, y + 24, C.BOTERGEEL);
  mond(screen, cx, y, talking, C.TERRACOTTA);
}

/**
 * Wiep. Dark hair tied up, a work jacket, a pencil behind the ear: someone
 * who is going to build a house whether or not anybody helps.
 */
export function drawWiep(screen: PixelBuffer, x: number, y: number, talking = false): void {
  const cx = x + 20;
  schouders(screen, cx, y, C.DIEPBLAUW, C.ROET, C.LUCHTBLAUW);
  // Collar and a zip.
  screen.fillRect(cx - 7, y + 37, 15, 3, C.DIEPBLAUW);
  screen.fillRect(cx - 7, y + 37, 15, 1, C.LUCHTBLAUW);
  screen.fillRect(cx, y + 39, 1, 7, C.ZANDGRIJS);

  // The ponytail, off to one side, behind everything.
  screen.fillEllipse(cx + 13, y + 12, 5, 6, C.ROET);
  screen.fillEllipse(cx + 13, y + 12, 4, 5, C.MAHONIE);
  screen.fillEllipse(cx + 15, y + 20, 3, 7, C.MAHONIE);
  screen.fillRect(cx + 10, y + 9, 2, 3, C.BOTERGEEL);

  screen.fillEllipse(cx, y + 12, 12, 10, C.ROET);
  screen.fillEllipse(cx, y + 12, 11, 9, C.MAHONIE);
  screen.fillRect(cx - 11, y + 13, 3, 9, C.MAHONIE);
  screen.fillRect(cx + 9, y + 13, 3, 7, C.MAHONIE);

  gezicht(screen, cx, y);

  // Pulled back tight off the forehead, with a parting.
  screen.fillEllipse(cx, y + 9, 10, 4, C.MAHONIE);
  screen.fillEllipse(cx - 6, y + 11, 5, 4, C.MAHONIE);
  screen.fillEllipse(cx + 7, y + 11, 4, 4, C.MAHONIE);
  screen.fillEllipse(cx + 2, y + 6, 6, 2, C.TERRACOTTA);
  screen.fillRect(cx - 2, y + 5, 1, 6, C.DONKERROOD);

  ogen(screen, cx, y, false);
  // Freckles, and the pencil.
  screen.set(cx - 5, y + 22, C.HOUT);
  screen.set(cx - 7, y + 21, C.HOUT);
  screen.set(cx + 6, y + 22, C.HOUT);
  screen.line(cx - 13, y + 12, cx - 8, y + 19, C.BOTERGEEL);
  screen.set(cx - 13, y + 12, C.ROET);
  mond(screen, cx, y, talking, C.DONKERROOD);
}
