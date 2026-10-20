import { type Color } from './palette.ts';
import { GLYPH_W, GLYPH_H, TRACKING, glyph, textWidth } from './font.ts';

/**
 * An indexed-colour pixel buffer with all the drawing primitives. Deliberately
 * free of any DOM reference so it can be exercised headlessly in tests —
 * see pixelbuffer.test.ts.
 *
 * Every primitive clips to the buffer. Note the guards against inverted rects:
 * Uint8Array.fill() reads a negative `end` as relative to the end of the array,
 * so an unguarded off-screen rect silently paints most of the screen.
 */
export class PixelBuffer {
  readonly pixels: Uint8Array;
  readonly width: number;
  readonly height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.pixels = new Uint8Array(width * height);
  }

  clear(color: Color = 0): void {
    this.pixels.fill(color);
  }

  set(x: number, y: number, color: Color): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    this.pixels[y * this.width + x] = color;
  }

  get(x: number, y: number): Color {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return 0;
    return this.pixels[y * this.width + x]!;
  }

  fillRect(x: number, y: number, w: number, h: number, color: Color): void {
    const x0 = Math.max(0, Math.trunc(x));
    const y0 = Math.max(0, Math.trunc(y));
    const x1 = Math.min(this.width, Math.trunc(x) + Math.trunc(w));
    const y1 = Math.min(this.height, Math.trunc(y) + Math.trunc(h));
    if (x1 <= x0 || y1 <= y0) return;
    for (let py = y0; py < y1; py++) {
      this.pixels.fill(color, py * this.width + x0, py * this.width + x1);
    }
  }

  strokeRect(x: number, y: number, w: number, h: number, color: Color): void {
    if (w <= 0 || h <= 0) return;
    this.fillRect(x, y, w, 1, color);
    this.fillRect(x, y + h - 1, w, 1, color);
    this.fillRect(x, y, 1, h, color);
    this.fillRect(x + w - 1, y, 1, h, color);
  }

  /** 2x2 ordered dither between two colours, for gradients and material texture. */
  ditherRect(x: number, y: number, w: number, h: number, a: Color, b: Color): void {
    const x0 = Math.max(0, Math.trunc(x));
    const y0 = Math.max(0, Math.trunc(y));
    const x1 = Math.min(this.width, Math.trunc(x) + Math.trunc(w));
    const y1 = Math.min(this.height, Math.trunc(y) + Math.trunc(h));
    if (x1 <= x0 || y1 <= y0) return;
    for (let py = y0; py < y1; py++) {
      const row = py * this.width;
      for (let px = x0; px < x1; px++) {
        this.pixels[row + px] = (px + py) % 2 === 0 ? a : b;
      }
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, color: Color): void {
    let x = Math.trunc(x0);
    let y = Math.trunc(y0);
    const ex = Math.trunc(x1);
    const ey = Math.trunc(y1);
    const dx = Math.abs(ex - x);
    const dy = -Math.abs(ey - y);
    const sx = x < ex ? 1 : -1;
    const sy = y < ey ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x, y, color);
      if (x === ex && y === ey) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
  }

  text(text: string, x: number, y: number, color: Color): void {
    let cx = Math.trunc(x);
    for (const ch of text) {
      const { bits } = glyph(ch);
      for (let gy = 0; gy < GLYPH_H; gy++) {
        for (let gx = 0; gx < GLYPH_W; gx++) {
          if (bits[gy * GLYPH_W + gx]) this.set(cx + gx, y + gy, color);
        }
      }
      cx += GLYPH_W + TRACKING;
    }
  }

  /** Text with a one-pixel drop shadow, which is how it stays readable on busy art. */
  textShadow(text: string, x: number, y: number, color: Color, shadow: Color = 0): void {
    this.text(text, x + 1, y + 1, shadow);
    this.text(text, x, y, color);
  }

  textCentered(text: string, cx: number, y: number, color: Color): void {
    this.text(text, Math.round(cx - textWidth(text) / 2), y, color);
  }

  textCenteredShadow(text: string, cx: number, y: number, color: Color, shadow: Color = 0): void {
    this.textShadow(text, Math.round(cx - textWidth(text) / 2), y, color, shadow);
  }

  /** Integer-scaled text, for titles. */
  textScaled(text: string, x: number, y: number, color: Color, scale: number): void {
    let cx = Math.trunc(x);
    for (const ch of text) {
      const { bits } = glyph(ch);
      for (let gy = 0; gy < GLYPH_H; gy++) {
        for (let gx = 0; gx < GLYPH_W; gx++) {
          if (bits[gy * GLYPH_W + gx]) {
            this.fillRect(cx + gx * scale, y + gy * scale, scale, scale, color);
          }
        }
      }
      cx += (GLYPH_W + TRACKING) * scale;
    }
  }

  textScaledWidth(text: string, scale: number): number {
    return textWidth(text) * scale;
  }
}
