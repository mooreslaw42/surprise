import { C } from '../engine/palette.ts';
import type { PixelBuffer } from '../engine/pixelbuffer.ts';
import { drawPim, PIM_W, PIM_H } from './pim.ts';

/**
 * Everyone who gets a word in. All three are drawn from photographs Pim
 * sent, to the same frame and the same light, so they sit in one box without
 * the text jumping about.
 *
 * Drawn, not traced, for the reason given in pim.ts: at forty pixels a
 * likeness is the three or four things that survive being tiny. For Wiep
 * that is the copper bowl cut, the blue over the eyes, the red mouth and the
 * red shirt. For Moeder it is fair hair pinned up and escaping, thin
 * glasses, a white blouse and a smile.
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

/** A mouth that is mostly smile: lips, and teeth between them. */
function lach(screen: PixelBuffer, cx: number, y: number, talking: boolean, lip: number): void {
  const my = y + 26;
  if (talking) {
    screen.fillEllipse(cx, my, 4, 3, lip);
    screen.fillEllipse(cx, my, 3, 2, C.DONKERROOD);
    screen.fillRect(cx - 2, my - 2, 5, 1, C.WIT);
    return;
  }
  screen.fillRect(cx - 4, my - 1, 9, 1, lip);
  screen.fillRect(cx - 3, my, 7, 1, C.WIT);
  screen.fillRect(cx - 3, my + 1, 7, 1, lip);
  screen.set(cx - 5, my - 2, lip);
  screen.set(cx + 5, my - 2, lip);
}

/**
 * Moeder. Fair hair pinned up on top with half of it come loose, thin
 * glasses, a white blouse open at the neck, and smiling: she is asking
 * about the kleiatelier, but she is asking nicely. The thumbprint of clay
 * stays, on the blouse now.
 */
export function drawMoeder(screen: PixelBuffer, x: number, y: number, talking = false): void {
  const cx = x + 20;
  schouders(screen, cx, y, C.WIT, C.KALK, C.WIT);
  // The open neck of the blouse, and its edge.
  for (let i = 0; i < 6; i++) {
    screen.fillRect(cx - (5 - i), y + 37 + i, (5 - i) * 2 + 1, 1, C.LICHTHOUT);
    screen.set(cx - (5 - i) - 1, y + 37 + i, C.ZANDGRIJS);
    screen.set(cx + (5 - i) + 1, y + 37 + i, C.ZANDGRIJS);
  }
  screen.fillRect(cx, y + 43, 1, 3, C.ZANDGRIJS);
  screen.fillRect(cx + 8, y + 42, 3, 2, C.ASGRIJS);
  screen.set(cx + 9, y + 44, C.ZANDGRIJS);

  // Pinned up: a knot on top, behind everything. Fair going grey, so it is
  // kept a clear step paler than the skin or the two run together.
  screen.fillEllipse(cx + 4, y + 3, 6, 4, C.ROET);
  screen.fillEllipse(cx + 4, y + 3, 5, 3, C.KALK);
  screen.fillEllipse(cx + 5, y + 2, 3, 1, C.BOTERGEEL);

  screen.fillEllipse(cx, y + 14, 13, 12, C.ROET);
  screen.fillEllipse(cx, y + 14, 12, 11, C.KALK);
  // The strands that got away, down either side of the face.
  screen.fillRect(cx - 13, y + 15, 3, 14, C.KALK);
  screen.fillRect(cx + 11, y + 15, 3, 12, C.KALK);
  screen.fillRect(cx - 14, y + 16, 1, 13, C.ROET);
  screen.fillRect(cx + 14, y + 16, 1, 11, C.ROET);
  screen.ditherRect(cx - 13, y + 18, 2, 10, C.KALK, C.LICHTOKER);
  screen.ditherRect(cx + 12, y + 18, 2, 8, C.KALK, C.ZANDGRIJS);

  gezicht(screen, cx, y);

  // A thin fringe, parted, with the forehead showing through it.
  screen.fillEllipse(cx - 4, y + 9, 8, 4, C.KALK);
  screen.fillEllipse(cx + 6, y + 10, 5, 3, C.KALK);
  screen.fillEllipse(cx, y + 6, 8, 3, C.BOTERGEEL);
  screen.fillEllipse(cx + 2, y + 5, 4, 1, C.WIT);
  screen.fillRect(cx + 1, y + 10, 1, 3, C.BOTERGEEL);
  screen.fillRect(cx - 5, y + 11, 1, 2, C.BOTERGEEL);

  ogen(screen, cx, y, false);
  // Thin frames, nearly not there.
  screen.strokeRect(cx - 8, y + 15, 7, 5, C.ZANDGRIJS);
  screen.strokeRect(cx + 2, y + 15, 7, 5, C.ZANDGRIJS);
  screen.fillRect(cx - 1, y + 17, 3, 1, C.ZANDGRIJS);
  lach(screen, cx, y, talking, C.TERRACOTTA);
}

/**
 * Wiep. A copper bowl cut with a blunt fringe and a bit left long at the
 * neck, blue over the eyes, a red mouth, a red shirt buttoned to the collar
 * and one small earring. Laughing, because she usually is, and because she
 * is about to ask for help with a tiny house.
 */
export function drawWiep(screen: PixelBuffer, x: number, y: number, talking = false): void {
  const cx = x + 20;
  schouders(screen, cx, y, C.ROESTROOD, C.TERRACOTTA, C.ROESTROOD);
  // The collar, two points, and the buttons under it.
  screen.fillRect(cx - 9, y + 37, 7, 3, C.ROESTROOD);
  screen.fillRect(cx + 3, y + 37, 7, 3, C.ROESTROOD);
  screen.fillRect(cx - 9, y + 40, 6, 1, C.TERRACOTTA);
  screen.fillRect(cx + 4, y + 40, 6, 1, C.TERRACOTTA);
  screen.set(cx - 3, y + 41, C.TERRACOTTA);
  screen.set(cx + 3, y + 41, C.TERRACOTTA);
  screen.fillRect(cx, y + 40, 1, 6, C.TERRACOTTA);
  screen.set(cx + 1, y + 42, C.LICHTOKER);
  screen.set(cx + 1, y + 45, C.LICHTOKER);

  // The bowl, behind the face, and the longer bit at the nape on one side.
  screen.fillEllipse(cx, y + 13, 14, 12, C.ROET);
  screen.fillEllipse(cx, y + 13, 13, 11, C.TERRACOTTA);
  screen.fillRect(cx - 13, y + 13, 4, 16, C.TERRACOTTA);
  screen.fillRect(cx - 14, y + 14, 1, 15, C.ROET);
  screen.fillRect(cx - 12, y + 29, 3, 3, C.MAHONIE);
  screen.fillRect(cx + 10, y + 13, 4, 10, C.TERRACOTTA);
  screen.fillRect(cx + 14, y + 14, 1, 9, C.ROET);
  screen.ditherRect(cx - 13, y + 18, 3, 11, C.TERRACOTTA, C.MAHONIE);

  gezicht(screen, cx, y);

  // Blue over the eyes, then the eyes; no brows, the fringe has them.
  for (const side of [-1, 1] as const) {
    const ex = cx + side * 5;
    screen.fillRect(ex - 2, y + 15, 5, 1, C.DIEPBLAUW);
    screen.fillRect(ex - 2, y + 16, 4, 1, C.LUCHTBLAUW);
    screen.fillRect(ex - 2, y + 17, 4, 2, C.WIT);
    screen.fillRect(ex - 1, y + 17, 2, 2, C.ROET);
  }

  // The fringe: cut dead straight, heavy, down to the eyes.
  screen.fillEllipse(cx, y + 8, 11, 6, C.TERRACOTTA);
  screen.fillRect(cx - 10, y + 9, 21, 5, C.TERRACOTTA);
  screen.fillRect(cx - 10, y + 14, 21, 1, C.MAHONIE);
  for (let px = cx - 9; px <= cx + 9; px += 3) screen.fillRect(px, y + 10, 1, 4, C.MAHONIE);
  screen.fillEllipse(cx + 2, y + 5, 7, 2, C.ROESTROOD);
  screen.fillEllipse(cx + 3, y + 4, 3, 1, C.LICHTOKER);

  // Freckles, and the earring.
  screen.set(cx - 5, y + 22, C.HOUT);
  screen.set(cx - 7, y + 21, C.HOUT);
  screen.set(cx + 6, y + 22, C.HOUT);
  screen.set(cx + 4, y + 21, C.HOUT);
  screen.fillRect(cx - 10, y + 24, 1, 2, C.KALK);
  lach(screen, cx, y, talking, C.ROESTROOD);
}
