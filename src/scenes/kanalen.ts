import { C } from '../engine/palette.ts';
import { WIDTH, HEIGHT, type Screen } from '../engine/screen.ts';
import type { Scene, SceneContext } from '../engine/scene.ts';
import type { Save } from '../engine/save.ts';
import { drawStar, STAR_W } from '../engine/ui.ts';
import { Dialogue } from './dialogue.ts';
import {
  LEEG, RICHTINGEN,
  draai, faults, isSolved, stars, verbonden,
} from '../puzzles/kanalen/model.ts';
import { solve } from '../puzzles/kanalen/solver.ts';
import type { KanaalLevel } from '../puzzles/kanalen/levels.ts';

const TOP_H = 16;
const BOTTOM_H = 30;

/**
 * The ventilation drawing, on blueprint paper, every piece turned the wrong
 * way. Click to turn a quarter. Duct that is actually joined back to the WTW
 * lights up, so the system fills in as it comes right — which is the point of
 * doing the whole thing in one go at the end.
 */
export class KanalenScene implements Scene {
  private readonly level: KanaalLevel;
  private readonly save: Save;
  private readonly par: number;
  private readonly tile: number;
  private readonly originX: number;
  private readonly originY: number;

  private masks: number[];
  private draaien = 0;
  private time = 0;
  private won = false;
  private wonAt = 0;
  private uitleg: Dialogue | null;

  constructor(level: KanaalLevel, save: Save) {
    this.level = level;
    this.save = save;
    this.masks = [...level.bord.masks];
    this.par = solve(level.bord, level.bord.masks).par;
    this.uitleg = new Dialogue(level.uitleg);

    const bord = level.bord;
    this.tile = Math.max(10, Math.min(
      Math.floor((HEIGHT - TOP_H - BOTTOM_H - 10) / bord.height),
      Math.floor((WIDTH - 24) / bord.width),
    ));
    this.originX = Math.round((WIDTH - bord.width * this.tile) / 2);
    this.originY = TOP_H + Math.round((HEIGHT - TOP_H - BOTTOM_H - bord.height * this.tile) / 2);
  }

  private cellAt(ctx: SceneContext): number {
    const x = Math.floor((ctx.input.mouseX - this.originX) / this.tile);
    const y = Math.floor((ctx.input.mouseY - this.originY) / this.tile);
    if (!ctx.input.mouseOver) return -1;
    if (x < 0 || y < 0 || x >= this.level.bord.width || y >= this.level.bord.height) return -1;
    return y * this.level.bord.width + x;
  }

  update(dt: number, ctx: SceneContext): void {
    this.time += dt;
    if (this.uitleg) {
      if (this.uitleg.update(dt, ctx)) this.uitleg = null;
      return;
    }
    if (this.won) {
      if (this.time - this.wonAt > 0.6 && ctx.input.confirmed()) ctx.pop();
      return;
    }
    if (ctx.input.justPressed('Escape')) ctx.pop();
    if (ctx.input.justPressed('KeyU')) { this.uitleg = new Dialogue(this.level.uitleg); return; }
    if (ctx.input.justPressed('KeyR')) {
      this.masks = [...this.level.bord.masks];
      this.draaien = 0;
      return;
    }
    if (ctx.input.justPressed('KeyH')) {
      // Turn one piece that is still wrong, towards the cheapest answer.
      const { oplossing } = solve(this.level.bord, this.masks);
      const i = this.masks.findIndex((m, k) => m !== oplossing[k]);
      if (i >= 0) {
        this.masks[i] = draai(this.masks[i]!, 1);
        this.draaien++;
      }
      this.check();
      return;
    }

    const i = this.cellAt(ctx);
    if (i >= 0 && this.masks[i] !== LEEG && ctx.input.mouseClicked) {
      this.masks[i] = draai(this.masks[i]!, 1);
      this.draaien++;
      this.check();
    }
  }

  private check(): void {
    if (this.won) return;
    if (isSolved(this.level.bord, this.masks)) {
      this.won = true;
      this.wonAt = this.time;
      this.save.record(this.level.id, this.draaien, stars(this.draaien, this.par));
    }
  }

  render(screen: Screen, ctx: SceneContext): void {
    screen.clear(C.ZWART);
    this.drawPaper(screen);
    this.drawDuct(screen);
    if (!this.won && !this.uitleg) this.drawHover(screen, ctx);
    this.drawTopBar(screen);
    this.drawBottomBar(screen);
    if (this.won) this.drawWon(screen);
    if (this.uitleg) this.uitleg.render(screen, this.time);
  }

  private drawPaper(screen: Screen): void {
    const bord = this.level.bord;
    const w = bord.width * this.tile;
    const h = bord.height * this.tile;
    screen.fillRect(this.originX - 5, this.originY - 5, w + 10, h + 10, C.DIEPBLAUW);
    screen.strokeRect(this.originX - 5, this.originY - 5, w + 10, h + 10, C.LUCHTBLAUW);
    for (let x = 0; x <= bord.width; x++) {
      screen.fillRect(this.originX + x * this.tile, this.originY, 1, h, C.ASGRIJS);
    }
    for (let y = 0; y <= bord.height; y++) {
      screen.fillRect(this.originX, this.originY + y * this.tile, w, 1, C.ASGRIJS);
    }
  }

  /** Lit where the air actually reaches, pale where it does not. */
  private drawDuct(screen: Screen): void {
    const bord = this.level.bord;
    const live = verbonden(bord, this.masks);
    const lek = new Set<number>();
    for (const f of faults(bord, this.masks)) if (f.kind === 'lek') lek.add(f.at);

    for (let i = 0; i < this.masks.length; i++) {
      const mask = this.masks[i]!;
      if (mask === LEEG) continue;
      const x = this.originX + (i % bord.width) * this.tile;
      const y = this.originY + Math.floor(i / bord.width) * this.tile;
      const mid = Math.floor(this.tile / 2);
      const thick = Math.max(3, Math.floor(this.tile / 4));
      const off = mid - Math.floor(thick / 2);
      const kleur = live[i] ? C.SALIE : C.ZANDGRIJS;
      const rand = live[i] ? C.DONKERSALIE : C.ASGRIJS;

      for (const r of RICHTINGEN) {
        if (!(mask & r.bit)) continue;
        if (r.dx === 0) {
          const top = r.dy < 0 ? y : y + mid;
          screen.fillRect(x + off, top, thick, mid + 1, kleur);
          screen.fillRect(x + off, top, 1, mid + 1, rand);
        } else {
          const left = r.dx < 0 ? x : x + mid;
          screen.fillRect(left, y + off, mid + 1, thick, kleur);
          screen.fillRect(left, y + off, mid + 1, 1, rand);
        }
      }
      // A collar at the junction so bends read as bends.
      screen.fillRect(x + off - 1, y + off - 1, thick + 2, thick + 2, kleur);
      screen.strokeRect(x + off - 1, y + off - 1, thick + 2, thick + 2, rand);

      if (i === bord.wtw) {
        screen.fillRect(x + 2, y + 2, this.tile - 4, this.tile - 4, C.ASGRIJS);
        screen.strokeRect(x + 2, y + 2, this.tile - 4, this.tile - 4, C.WIT);
        const spin = Math.floor(this.time * 6) % 2 === 0;
        screen.fillRect(x + mid - 4, y + mid - (spin ? 0 : 1), 9, 2, C.ROET);
        screen.fillRect(x + mid - (spin ? 1 : 0), y + mid - 4, 2, 9, C.ROET);
      } else if (bord.roosters.includes(i)) {
        screen.fillRect(x + mid - 4, y + mid - 4, 9, 9, live[i] ? C.BOTERGEEL : C.ZANDGRIJS);
        screen.strokeRect(x + mid - 4, y + mid - 4, 9, 9, C.ROET);
        for (let g = -2; g <= 2; g += 2) screen.fillRect(x + mid - 3, y + mid + g, 7, 1, C.ROET);
      }

      if (lek.has(i)) screen.fillRect(x + 1, y + 1, 2, 2, C.ROESTROOD);
    }
  }

  private drawHover(screen: Screen, ctx: SceneContext): void {
    const i = this.cellAt(ctx);
    if (i < 0 || this.masks[i] === LEEG) return;
    const x = this.originX + (i % this.level.bord.width) * this.tile;
    const y = this.originY + Math.floor(i / this.level.bord.width) * this.tile;
    screen.strokeRect(x, y, this.tile, this.tile, C.WIT);
  }

  private drawTopBar(screen: Screen): void {
    screen.fillRect(0, 0, WIDTH, TOP_H, C.ZWART);
    screen.fillRect(0, TOP_H - 1, WIDTH, 1, C.STEEN);
    screen.text(this.level.titel, 6, 5, this.level.baas ? C.MAGENTA : C.LICHTOKER);
    const label = `DRAAIEN ${String(this.draaien).padStart(2, '0')}   PAR ${String(this.par).padStart(2, '0')}`;
    screen.text(label, WIDTH - 6 - label.length * 6, 5, this.draaien > this.par ? C.ROESTROOD : C.SALIE);
  }

  private drawBottomBar(screen: Screen): void {
    const y = HEIGHT - BOTTOM_H;
    const bord = this.level.bord;
    screen.fillRect(0, y, WIDTH, BOTTOM_H, C.ZWART);
    screen.fillRect(0, y, WIDTH, 1, C.STEEN);
    const live = verbonden(bord, this.masks);
    const aan = bord.roosters.filter((i) => live[i]).length;
    screen.text(`ROOSTERS ${aan}/${bord.roosters.length}`, 6, y + 7, C.KALK);
    screen.text('U  H', WIDTH - 6 - 4 * 6, y + 7, C.STEEN);
    const lekken = faults(bord, this.masks).filter((f) => f.kind === 'lek').length;
    screen.text(lekken > 0 ? `${lekken} OPEN EINDEN` : this.level.praatje, 6, y + 20,
      lekken > 0 ? C.ROESTROOD : C.ASGRIJS);
    screen.text('R = OPNIEUW', WIDTH - 6 - 11 * 6, y + 20, C.STEEN);
  }

  private drawWon(screen: Screen): void {
    const got = stars(this.draaien, this.par);
    const w = 250;
    const h = 90;
    const x = Math.round((WIDTH - w) / 2);
    const y = Math.round((HEIGHT - h) / 2);
    screen.fillRect(x, y, w, h, C.ZWART);
    screen.strokeRect(x, y, w, h, C.MAGENTA);
    screen.textCentered(this.level.baas ? 'HET WERKT' : 'PLAN GOEDGEKEURD', WIDTH / 2, y + 9,
      this.level.baas ? C.BOTERGEEL : C.LICHTOKER);
    const span = 3 * STAR_W * 2 + 2 * 8;
    for (let i = 0; i < 3; i++) {
      drawStar(screen, Math.round((WIDTH - span) / 2) + i * (STAR_W * 2 + 8), y + 22, i < got, 2);
    }
    screen.textCentered(`${this.draaien} DRAAIEN   PAR ${this.par}`, WIDTH / 2, y + 44, C.KALK);
    screen.fillRect(x + 8, y + 56, w - 16, 11, this.level.baas ? C.DONKERSALIE : C.DONKERROOD);
    screen.textCentered(this.level.levering, WIDTH / 2, y + 58, C.WIT);
    if (Math.floor(this.time * 2) % 2 === 0) {
      screen.textCentered('ENTER', WIDTH / 2, y + 73, C.SALIE);
    }
  }
}
