import { LIEDJES, waarSpeelt } from '../data/liedjes.ts';
import type { Lied, Muziekkeuze } from '../engine/muziek.ts';
import { C } from '../engine/palette.ts';
import { WIDTH, HEIGHT, type Screen } from '../engine/screen.ts';
import type { Scene, SceneContext } from '../engine/scene.ts';

const TOP_H = 16;
const FOOTER_H = 14;
const RIJ_Y = 25;
const RIJ_H = 25;
const RIJ_X = 24;
const RIJ_W = WIDTH - RIJ_X * 2;

/**
 * The songs, to just listen to. Off the title screen: a list of the seven,
 * where each one plays in the game, and the one that is on with its levels
 * jumping. Nothing plays until something is picked, and picking the one that
 * is on stops it.
 */
export class JukeboxScene implements Scene {
  private time = 0;
  private gekozen = 0;
  private speelt: Lied | null = null;
  private sinds = 0;

  get muziek(): Muziekkeuze | null {
    return this.speelt ? { lied: this.speelt } : null;
  }

  /** Which row is under the pointer, or -1. */
  private rijOp(x: number, y: number): number {
    if (x < RIJ_X || x >= RIJ_X + RIJ_W || y < RIJ_Y) return -1;
    const i = Math.floor((y - RIJ_Y) / RIJ_H);
    return i < LIEDJES.length ? i : -1;
  }

  private kies(i: number): void {
    const lied = LIEDJES[i]!;
    this.gekozen = i;
    this.speelt = this.speelt === lied ? null : lied;
    this.sinds = this.time;
  }

  update(dt: number, ctx: SceneContext): void {
    this.time += dt;
    const n = LIEDJES.length;
    if (ctx.input.justPressed('Escape') || ctx.input.justPressed('Backspace')) { ctx.pop(); return; }
    if (ctx.input.justPressed('ArrowUp')) this.gekozen = (this.gekozen + n - 1) % n;
    if (ctx.input.justPressed('ArrowDown')) this.gekozen = (this.gekozen + 1) % n;

    const onder = this.rijOp(ctx.input.mouseX, ctx.input.mouseY);
    if (ctx.input.mouseOver && onder >= 0 && (ctx.input.mouseX !== this.muisX || ctx.input.mouseY !== this.muisY)) {
      this.gekozen = onder;
    }
    this.muisX = ctx.input.mouseX;
    this.muisY = ctx.input.mouseY;

    if (ctx.input.mouseClicked) {
      // Where the press landed, not where the pointer is now: it may have left.
      const { mousePressX: x, mousePressY: y } = ctx.input;
      if (this.terugKnop(x, y)) { ctx.pop(); return; }
      const rij = this.rijOp(x, y);
      if (rij >= 0) { this.kies(rij); return; }
    }
    if (ctx.input.confirmed()) this.kies(this.gekozen);
  }

  private muisX = -1;
  private muisY = -1;

  private terugKnop(x: number, y: number): boolean {
    return x >= 6 && x < 60 && y >= HEIGHT - FOOTER_H && y < HEIGHT;
  }

  render(screen: Screen, _ctx: SceneContext): void {
    screen.clear(C.ZWART);
    screen.ditherRect(0, TOP_H, WIDTH, HEIGHT - TOP_H - FOOTER_H, C.ZWART, C.DIEPBLAUW);

    screen.fillRect(0, 0, WIDTH, TOP_H, C.ZWART);
    screen.fillRect(0, TOP_H - 1, WIDTH, 1, C.MAGENTA);
    screen.text('JUKEBOX', 6, 5, C.BOTERGEEL);
    screen.text('THE ROLLING STONES, OP DE CHIP', WIDTH - 6 - 30 * 6, 5, C.ASGRIJS);

    LIEDJES.forEach((lied, i) => {
      const y = RIJ_Y + i * RIJ_H;
      const aan = this.speelt === lied;
      const hier = this.gekozen === i;
      screen.fillRect(RIJ_X, y, RIJ_W, RIJ_H - 3, aan ? C.DONKEROKER : C.ROET);
      if (hier) screen.strokeRect(RIJ_X, y, RIJ_W, RIJ_H - 3, aan ? C.BOTERGEEL : C.LICHTOKER);

      // A record: black, a label, spinning when it is the one that is on.
      const px = RIJ_X + 10;
      const py = y + 11;
      screen.fillEllipse(px, py, 6, 6, C.ZWART);
      screen.strokeEllipse(px, py, 4, 4, C.STEEN);
      screen.fillEllipse(px, py, 2, 2, aan ? C.ROESTROOD : C.STEEN);
      if (aan) {
        const hoek = this.time * 8;
        screen.set(px + Math.round(Math.cos(hoek) * 5), py + Math.round(Math.sin(hoek) * 5), C.KALK);
      }

      screen.text(lied.naar.toUpperCase(), RIJ_X + 24, y + 4, aan ? C.WIT : hier ? C.KALK : C.ZANDGRIJS);
      const waar = waarSpeelt(lied).join(', ');
      screen.text(waar, RIJ_X + 24, y + 13, aan ? C.LICHTOKER : C.STEEN);

      // Levels, jumping in time with nothing in particular but close enough.
      if (aan) {
        const bx = RIJ_X + RIJ_W - 28;
        const tel = Math.floor((this.time - this.sinds) * (lied.bpm / 60) * 4);
        for (let b = 0; b < 5; b++) {
          const h = 2 + ((tel * 7 + b * 13 + ((tel >> 1) * b)) % 9);
          screen.fillRect(bx + b * 4, y + 17 - h, 3, h, b === 4 ? C.ROESTROOD : C.SALIE);
        }
      } else {
        screen.text(`${lied.bpm}`, RIJ_X + RIJ_W - 6 - String(lied.bpm).length * 6, y + 8, C.STEEN);
      }
    });

    screen.fillRect(0, HEIGHT - FOOTER_H, WIDTH, FOOTER_H, C.ZWART);
    screen.fillRect(0, HEIGHT - FOOTER_H, WIDTH, 1, C.STEEN);
    screen.text('< TERUG', 6, HEIGHT - 10, C.LICHTOKER);
    screen.text('PIJLTJES = KIEZEN   ENTER = AAN / UIT', WIDTH - 6 - 36 * 6, HEIGHT - 10, C.ASGRIJS);
  }
}
