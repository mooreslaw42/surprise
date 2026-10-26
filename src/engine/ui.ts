import type { PixelBuffer } from './pixelbuffer.ts';
import { C } from './palette.ts';

const STAR = [
  '...#...',
  '..###..',
  '#######',
  '.#####.',
  '..###..',
  '.##.##.',
  '##...##',
];

/** A star, drawn at an integer scale. Filled when earned, outlined when not. */
export function drawStar(screen: PixelBuffer, x: number, y: number, earned: boolean, scale = 1): void {
  const color = earned ? C.BOTERGEEL : C.STEEN;
  for (let gy = 0; gy < STAR.length; gy++) {
    const row = STAR[gy]!;
    for (let gx = 0; gx < row.length; gx++) {
      if (row[gx] === '#') screen.fillRect(x + gx * scale, y + gy * scale, scale, scale, color);
    }
  }
}

export const STAR_W = STAR[0]!.length;
export const STAR_H = STAR.length;
