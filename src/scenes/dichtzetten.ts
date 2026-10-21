import { C } from '../engine/palette.ts';
import { WIDTH, HEIGHT, type Screen } from '../engine/screen.ts';
import type { Scene, SceneContext } from '../engine/scene.ts';
import type { Save } from '../engine/save.ts';
import { drawStar, STAR_W } from '../engine/ui.ts';
import { Dialogue } from './dialogue.ts';
import { MERK, type MerkWaarde, isSolved, missers, stars } from '../puzzles/dichtzetten/model.ts';
import { HOUT, volgende } from '../puzzles/dichtzetten/solver.ts';
import type { DichtLevel } from '../puzzles/dichtzetten/levels.ts';

const TOP_H = 16;
const BOTTOM_H = 30;

/**
 * The wall with the board about to go on, and the frame behind it worked out
 * from the numbers. A square filled in shows as timber; once the whole frame
 * is found the plasterboard goes over it.
 */
export class DichtScene implements Scene {
  private readonly level: DichtLevel;
  private readonly save: Save;
  private readonly tile: number;
  private readonly originX: number;
  private readonly originY: number;
  private readonly kolomHoogte: number;
  private readonly rijBreedte: number;

  private merken: MerkWaarde[];
  private fouten = 0;
  private time = 0;
  private won = false;
  private wonAt = 0;
  private uitleg: Dialogue | null;

  constructor(level: DichtLevel, save: Save) {
    this.level = level;
    this.save = save;
    this.merken = new Array(level.wand.hout.length).fill(MERK.ONBEKEND);
    this.uitleg = new Dialogue(level.uitleg);

    const w = level.wand;
    this.kolomHoogte = Math.max(...w.kolomHints.map((h) => h.length)) * 7 + 2;
    this.rijBreedte = Math.max(...w.rijHints.map((h) => h.length)) * 8 + 2;
    this.tile = Math.max(7, Math.min(
      Math.floor((HEIGHT - TOP_H - BOTTOM_H - this.kolomHoogte - 8) / w.height),
      Math.floor((WIDTH - this.rijBreedte - 12) / w.width),
    ));
    this.originX = this.rijBreedte + Math.round((WIDTH - this.rijBreedte - w.width * this.tile) / 2);
    this.originY = TOP_H + this.kolomHoogte
      + Math.round((HEIGHT - TOP_H - BOTTOM_H - this.kolomHoogte - w.height * this.tile) / 2);
  }

  private celAt(ctx: SceneContext): number {
    const w = this.level.wand;
    const x = Math.floor((ctx.input.mouseX - this.originX) / this.tile);
    const y = Math.floor((ctx.input.mouseY - this.originY) / this.tile);
    if (!ctx.input.mouseOver || x < 0 || y < 0 || x >= w.width || y >= w.height) return -1;
    return y * w.width + x;
  }

  update(dt: number, ctx: SceneContext): void {
    this.time += dt;
    if (this.uitleg) {
      if (this.uitleg.update(dt, ctx)) this.uitleg = null;
      return;
    }
    if (this.won) {
      if (this.time - this.wonAt > 0.5 && ctx.input.confirmed()) ctx.pop();
      return;
    }
    if (ctx.input.justPressed('Escape')) ctx.pop();
    if (ctx.input.justPressed('KeyU')) { this.uitleg = new Dialogue(this.level.uitleg); return; }
    if (ctx.input.justPressed('KeyR')) {
      this.merken = new Array(this.level.wand.hout.length).fill(MERK.ONBEKEND);
      this.fouten = 0;
      return;
    }
    if (ctx.input.justPressed('KeyH')) {
      const gedaan = this.merken.map((m) => (m === MERK.HOUT ? HOUT : m === MERK.LEEG ? 0 : -1));
      const i = volgende(this.level.wand, gedaan);
      if (i >= 0) this.merken[i] = MERK.HOUT;
      this.check();
      return;
    }

    const i = this.celAt(ctx);
    if (i >= 0 && ctx.input.mouseClicked) {
      const was = this.merken[i]!;
      const nu: MerkWaarde = was === MERK.ONBEKEND ? MERK.HOUT : was === MERK.HOUT ? MERK.LEEG : MERK.ONBEKEND;
      this.merken[i] = nu;
      // A screw into thin air: counted once, when it goes in.
      if (nu === MERK.HOUT && !this.level.wand.hout[i]) this.fouten++;
      this.check();
    }
  }

  private check(): void {
    if (this.won) return;
    if (isSolved(this.level.wand, this.merken)) {
      this.won = true;
      this.wonAt = this.time;
      this.save.record(this.level.id, this.fouten, stars(this.fouten));
    }
  }

  render(screen: Screen, ctx: SceneContext): void {
    screen.clear(C.ROET);
    this.drawHints(screen);
    this.drawWand(screen, ctx);
    this.drawTopBar(screen);
    this.drawBottomBar(screen);
    if (this.won) this.drawWon(screen);
    if (this.uitleg) this.uitleg.render(screen, this.time);
  }

  private drawHints(screen: Screen): void {
    const w = this.level.wand;
    w.kolomHints.forEach((reeks, x) => {
      const px = this.originX + x * this.tile + Math.floor(this.tile / 2) - 2;
      reeks.forEach((n, i) => {
        const py = this.originY - (reeks.length - i) * 7 - 1;
        screen.text(String(n), px, py, n === 0 ? C.STEEN : C.LICHTOKER);
      });
    });
    w.rijHints.forEach((reeks, y) => {
      const py = this.originY + y * this.tile + Math.floor(this.tile / 2) - 3;
      reeks.forEach((n, i) => {
        const px = this.originX - (reeks.length - i) * 8 - 2;
        screen.text(String(n), px, py, n === 0 ? C.STEEN : C.LICHTOKER);
      });
    });
  }

  private drawWand(screen: Screen, ctx: SceneContext): void {
    const w = this.level.wand;
    const over = this.celAt(ctx);
    for (let i = 0; i < w.hout.length; i++) {
      const x = i % w.width;
      const y = Math.floor(i / w.width);
      const px = this.originX + x * this.tile;
      const py = this.originY + y * this.tile;
      const merk = this.merken[i]!;

      if (this.won) {
        // Boarded over: the frame is behind it now.
        screen.fillRect(px, py, this.tile, this.tile, C.ZANDGRIJS);
        screen.ditherRect(px + 1, py + 1, this.tile - 2, this.tile - 2, C.ZANDGRIJS, C.KALK);
      } else if (merk === MERK.HOUT) {
        const mis = !w.hout[i];
        screen.fillRect(px, py, this.tile, this.tile, mis ? C.ROESTROOD : C.HOUT);
        screen.fillRect(px, py, this.tile, 1, mis ? C.DONKERROOD : C.LICHTHOUT);
        screen.fillRect(px, py + this.tile - 1, this.tile, 1, C.STEEN);
      } else if (merk === MERK.LEEG) {
        screen.fillRect(px, py, this.tile, this.tile, C.ZWART);
        screen.fillRect(px + 2, py + 2, this.tile - 4, 1, C.STEEN);
      } else {
        screen.fillRect(px, py, this.tile, this.tile, C.ROET);
        screen.ditherRect(px + 1, py + 1, this.tile - 2, this.tile - 2, C.ROET, C.STEEN);
      }
      // Every third line heavier, so counting along a row is possible.
      if (x % 3 === 0) screen.fillRect(px, py, 1, this.tile, C.ASGRIJS);
      if (y % 3 === 0) screen.fillRect(px, py, this.tile, 1, C.ASGRIJS);
      if (i === over && !this.won) screen.strokeRect(px, py, this.tile, this.tile, C.WIT);
    }
    screen.strokeRect(this.originX - 1, this.originY - 1,
      w.width * this.tile + 2, w.height * this.tile + 2, C.ASGRIJS);
  }

  private drawTopBar(screen: Screen): void {
    screen.fillRect(0, 0, WIDTH, TOP_H, C.ZWART);
    screen.fillRect(0, TOP_H - 1, WIDTH, 1, C.STEEN);
    screen.text(`${this.level.ruimte} - ${this.level.vlak}`, 6, 5, C.LICHTOKER);
    const gevonden = this.merken.filter((m, i) => m === MERK.HOUT && this.level.wand.hout[i]).length;
    const totaal = this.level.wand.hout.filter(Boolean).length;
    const label = `HOUT ${String(gevonden).padStart(2)}/${totaal}`;
    screen.text(label, WIDTH - 6 - label.length * 6, 5, gevonden === totaal ? C.SALIE : C.ASGRIJS);
  }

  private drawBottomBar(screen: Screen): void {
    const y = HEIGHT - BOTTOM_H;
    screen.fillRect(0, y, WIDTH, BOTTOM_H, C.ZWART);
    screen.fillRect(0, y, WIDTH, 1, C.STEEN);
    const mis = missers(this.level.wand, this.merken);
    screen.text(this.fouten > 0 ? `${this.fouten} MISGESCHROEFD` : 'GEEN MISSERS', 6, y + 7,
      this.fouten > 0 ? C.ROESTROOD : C.SALIE);
    if (mis > 0) screen.text(`${mis} STAAT NOG FOUT`, 110, y + 7, C.ROESTROOD);
    screen.text('U  H', WIDTH - 6 - 4 * 6, y + 7, C.STEEN);
    screen.text(this.level.praatje, 6, y + 20, C.ASGRIJS);
    screen.text('R = OPNIEUW', WIDTH - 6 - 11 * 6, y + 20, C.STEEN);
  }

  private drawWon(screen: Screen): void {
    const got = stars(this.fouten);
    const w = 220;
    const h = 76;
    const x = Math.round((WIDTH - w) / 2);
    const y = Math.round((HEIGHT - h) / 2);
    screen.fillRect(x, y, w, h, C.ZWART);
    screen.strokeRect(x, y, w, h, C.LICHTOKER);
    screen.textCentered('DICHTGEZET', WIDTH / 2, y + 9, C.LICHTOKER);
    const span = 3 * STAR_W * 2 + 2 * 8;
    for (let i = 0; i < 3; i++) {
      drawStar(screen, Math.round((WIDTH - span) / 2) + i * (STAR_W * 2 + 8), y + 22, i < got, 2);
    }
    screen.textCentered(this.fouten === 0 ? 'GEEN SCHROEF MIS' : `${this.fouten} SCHROEVEN MIS`,
      WIDTH / 2, y + 46, C.KALK);
    if (Math.floor(this.time * 2) % 2 === 0) {
      screen.textCentered('ENTER', WIDTH / 2, y + 60, C.SALIE);
    }
  }
}
