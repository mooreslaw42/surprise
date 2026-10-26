import { C } from '../engine/palette.ts';
import type { PixelBuffer } from '../engine/pixelbuffer.ts';

/**
 * Pim, who explains things.
 *
 * Drawn rather than traced: quantising the photo straight into the palette
 * turned mid-brown hair grey and the whole face to mush at this size, so the
 * likeness is carried by the parts that survive being tiny — round wire
 * glasses, a wide open smile, tousled hair, and the mustard turtleneck, which
 * happens to be the house's own oker.
 *
 * Skin is kept a rung lighter than the sweater on purpose; at 40 pixels they
 * are neighbouring hues and will read as one brown mass otherwise.
 */

export const PIM_W = 40;
export const PIM_H = 46;

export function drawPim(screen: PixelBuffer, x: number, y: number, talking = false): void {
  const cx = x + 20;
  drawShoulders(screen, cx, y);
  drawNeck(screen, cx, y);
  drawHead(screen, cx, y);
  drawHair(screen, cx, y);
  drawGlasses(screen, cx, y);
  drawMouth(screen, cx, y, talking);
}

/**
 * Mustard turtleneck with a rolled collar.
 *
 * The shoulders are drawn as explicit rows rather than an ellipse: an ellipse
 * wide enough to read as shoulders runs well past the bottom of the sprite,
 * and a portrait frame drawn over the overspill only hides the problem.
 */
const SHOULDER_HALF_WIDTH = [13, 15, 16, 17, 18, 18];

function drawShoulders(screen: PixelBuffer, cx: number, y: number): void {
  SHOULDER_HALF_WIDTH.forEach((half, i) => {
    const row = y + PIM_H - SHOULDER_HALF_WIDTH.length + i;
    screen.fillRect(cx - half - 1, row, half * 2 + 3, 1, C.ROET);
    screen.fillRect(cx - half, row, half * 2 + 1, 1, C.OKER);
    // Shading on his right, light on his left, as in the photo.
    screen.fillRect(cx - half, row, Math.max(2, half - 8), 1, C.DONKEROKER);
    screen.fillRect(cx + half - Math.max(2, half - 11), row, Math.max(2, half - 11), 1, C.LICHTOKER);
  });
  // A rib across the knit.
  screen.fillRect(cx - 13, y + PIM_H - 3, 27, 1, C.DONKEROKER);

  // The roll of the collar, sitting proud of the shoulders.
  screen.fillEllipse(cx, y + 38, 10, 5, C.ROET);
  screen.fillEllipse(cx, y + 38, 9, 4, C.OKER);
  screen.fillEllipse(cx, y + 37, 9, 3, C.LICHTOKER);
  screen.fillEllipse(cx, y + 38, 7, 2, C.OKER);
}

function drawNeck(screen: PixelBuffer, cx: number, y: number): void {
  screen.fillRect(cx - 6, y + 29, 12, 8, C.ROET);
  screen.fillRect(cx - 5, y + 29, 10, 7, C.HOUT);
  screen.fillRect(cx - 3, y + 29, 7, 7, C.LICHTHOUT);
}

function drawHead(screen: PixelBuffer, cx: number, y: number): void {
  screen.fillEllipse(cx, y + 20, 12, 14, C.ROET);          // outline
  screen.fillEllipse(cx, y + 20, 11, 13, C.HOUT);
  screen.fillEllipse(cx + 1, y + 20, 10, 12, C.LICHTHOUT);
  // Light from the front-right, as in the photo.
  screen.fillEllipse(cx + 2, y + 19, 7, 9, C.LICHTOKER);
  screen.fillEllipse(cx + 5, y + 21, 4, 5, C.LICHTOKER);
  screen.fillEllipse(cx - 6, y + 22, 4, 8, C.HOUT);

  screen.fillEllipse(cx - 11, y + 20, 2, 3, C.HOUT);       // ears
  screen.fillEllipse(cx + 11, y + 20, 2, 3, C.LICHTHOUT);
  screen.set(cx + 12, y + 23, C.LICHTOKER);                // earring

  // Nose: a short shadow and a lit tip.
  screen.fillRect(cx - 1, y + 19, 2, 4, C.HOUT);
  screen.fillRect(cx, y + 22, 2, 1, C.LICHTOKER);

  // A light moustache and a touch along the jaw, not a full beard.
  screen.ditherRect(cx - 4, y + 24, 9, 1, C.HOUT, C.LICHTOKER);
  screen.ditherRect(cx - 8, y + 29, 17, 3, C.HOUT, C.LICHTHOUT);
}

/** Tousled, parted on his left, shorter at the sides. */
function drawHair(screen: PixelBuffer, cx: number, y: number): void {
  // An irregular cap built from overlapping ellipses rather than spikes.
  screen.fillEllipse(cx, y + 11, 13, 10, C.ROET);
  screen.fillEllipse(cx, y + 11, 12, 9, C.DONKEROKER);
  screen.fillEllipse(cx - 6, y + 9, 7, 6, C.DONKEROKER);
  screen.fillEllipse(cx + 5, y + 8, 6, 5, C.DONKEROKER);
  screen.fillEllipse(cx + 9, y + 12, 5, 6, C.DONKEROKER);
  screen.fillEllipse(cx - 10, y + 13, 4, 6, C.DONKEROKER);

  // Sideburns past the ears.
  screen.fillRect(cx - 12, y + 13, 3, 8, C.DONKEROKER);
  screen.fillRect(cx + 10, y + 13, 3, 7, C.DONKEROKER);

  // The forehead, cut back further on his left so the parting shows.
  screen.fillEllipse(cx + 2, y + 16, 9, 4, C.LICHTHOUT);
  screen.fillEllipse(cx + 3, y + 16, 7, 3, C.LICHTOKER);
  screen.fillEllipse(cx - 7, y + 13, 4, 3, C.DONKEROKER);

  // Light across the top, and shadow where it tucks behind the ears.
  screen.fillEllipse(cx + 1, y + 6, 8, 3, C.HOUT);
  screen.fillEllipse(cx + 4, y + 5, 4, 2, C.LICHTHOUT);
  screen.ditherRect(cx - 12, y + 16, 4, 5, C.STEEN, C.DONKEROKER);
  screen.ditherRect(cx + 9, y + 16, 4, 4, C.STEEN, C.DONKEROKER);
}

/** Round wire frames: the strongest thing about the face at this size. */
function drawGlasses(screen: PixelBuffer, cx: number, y: number): void {
  const eyeY = y + 18;
  for (const side of [-1, 1] as const) {
    const ex = cx + side * 5;
    // Kept a clear row above the rim; any closer and brow, frame and eye
    // merge into one dark band across the face.
    screen.fillRect(ex - 3, eyeY - 7, 7, 1, C.STEEN);                // eyebrow
    screen.set(ex + side * 3, eyeY - 8, C.STEEN);
    // Gold wire is almost exactly skin tone at this size, so the rim is drawn
    // dark with a glint on it. It reads as round spectacles; gold does not.
    screen.strokeEllipse(ex, eyeY, 4, 3, C.STEEN);
    screen.set(ex + side * 3, eyeY - 2, C.LICHTOKER);
    // Smiling eyes: a closed curve, not a dot.
    screen.fillRect(ex - 2, eyeY, 4, 1, C.ROET);
    screen.set(ex - 3, eyeY - 1, C.ROET);
    screen.set(ex + 2, eyeY - 1, C.ROET);
  }
  screen.fillRect(cx - 1, eyeY - 1, 3, 1, C.STEEN);                  // bridge
  screen.fillRect(cx - 11, eyeY - 1, 2, 1, C.STEEN);                 // temples
  screen.fillRect(cx + 10, eyeY - 1, 2, 1, C.STEEN);
}

/** The big open smile. The teeth are what make it read as a grin. */
function drawMouth(screen: PixelBuffer, cx: number, y: number, talking: boolean): void {
  const my = y + 26;
  const open = talking ? 3 : 2;
  screen.fillEllipse(cx, my, 6, open + 1, C.STEEN);
  screen.fillEllipse(cx, my, 5, open, C.DONKERROOD);
  screen.fillEllipse(cx, my - 1, 5, open - 1, C.WIT);
  // Corners pulled up into the cheeks.
  screen.set(cx - 7, my - 2, C.STEEN);
  screen.set(cx + 7, my - 2, C.STEEN);
  screen.set(cx - 8, my - 3, C.HOUT);
  screen.set(cx + 8, my - 3, C.HOUT);
}
