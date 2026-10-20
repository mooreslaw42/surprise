import { PALETTE_RGBA } from './palette.ts';
import { PixelBuffer } from './pixelbuffer.ts';

export const WIDTH = 384;
export const HEIGHT = 216;

/**
 * A PixelBuffer wired to a canvas. All drawing lives in the base class, which
 * is DOM-free and tested; this subclass only owns scaling and presentation.
 *
 * Nothing in the game ever touches a real screen coordinate, so the whole
 * thing is resolution independent and authentically chunky.
 */
export class Screen extends PixelBuffer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly backing: HTMLCanvasElement;
  private readonly backingCtx: CanvasRenderingContext2D;
  private readonly image: ImageData;
  private readonly image32: Uint32Array;

  scale = 1;
  scanlines = true;

  constructor(canvas: HTMLCanvasElement) {
    super(WIDTH, HEIGHT);
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('no 2d context');
    this.ctx = ctx;

    this.backing = document.createElement('canvas');
    this.backing.width = WIDTH;
    this.backing.height = HEIGHT;
    const backingCtx = this.backing.getContext('2d', { alpha: false });
    if (!backingCtx) throw new Error('no 2d backing context');
    this.backingCtx = backingCtx;

    this.image = backingCtx.createImageData(WIDTH, HEIGHT);
    this.image32 = new Uint32Array(this.image.data.buffer);

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  /** Largest integer scale that still fits the window, floor 1. */
  resize(): void {
    const scale = Math.max(1, Math.floor(Math.min(window.innerWidth / WIDTH, window.innerHeight / HEIGHT)));
    this.scale = scale;
    this.canvas.width = WIDTH * scale;
    this.canvas.height = HEIGHT * scale;
    this.canvas.style.marginTop = `${Math.max(0, (window.innerHeight - HEIGHT * scale) / 2)}px`;
    this.ctx.imageSmoothingEnabled = false;
  }

  /** Push the pixel buffer to the visible canvas. */
  present(): void {
    const { pixels, image32 } = this;
    for (let i = 0; i < pixels.length; i++) {
      image32[i] = PALETTE_RGBA[pixels[i]!]!;
    }
    this.backingCtx.putImageData(this.image, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(this.backing, 0, 0, this.canvas.width, this.canvas.height);

    if (this.scanlines && this.scale >= 2) {
      this.ctx.globalAlpha = 0.18;
      this.ctx.fillStyle = '#000';
      for (let y = 0; y < this.canvas.height; y += this.scale) {
        this.ctx.fillRect(0, y + this.scale - 1, this.canvas.width, 1);
      }
      this.ctx.globalAlpha = 1;
    }
  }
}
