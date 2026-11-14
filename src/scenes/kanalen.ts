import { BAAS, thema } from '../data/liedjes.ts';
import type { Muziekkeuze } from '../engine/muziek.ts';
import { C } from '../engine/palette.ts';
import { WIDTH, HEIGHT, type Screen } from '../engine/screen.ts';
import type { Scene, SceneContext } from '../engine/scene.ts';
import type { Save } from '../engine/save.ts';
import { drawStar, STAR_W } from '../engine/ui.ts';
import { Dialogue } from './dialogue.ts';
import {
  AF, LEEG, RICHTINGEN, TOE,
  afstand, draai, faults, isSolved, lucht, periode, stars,
} from '../puzzles/kanalen/model.ts';
import { solve } from '../puzzles/kanalen/solver.ts';
import type { KanaalLevel } from '../puzzles/kanalen/levels.ts';
import { PLATTEGROND, binnenshuis } from '../data/plattegrond.ts';

const TOP_H = 16;
const BOTTOM_H = 30;

/**
 * The ventilation drawing, on blueprint paper, every piece turned the wrong
 * way. Click to turn a quarter. Duct that is actually joined back to the WTW
 * lights up, so the system fills in as it comes right — which is the point of
 * doing the whole thing in one go at the end.
 */
export class KanalenScene implements Scene {
  /** The boss is the one that finally arrived, so it gets its own record. */
  readonly muziek: Muziekkeuze;

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
    this.muziek = level.baas ? BAAS : thema('kanalen');
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
        // Whichever way round is shorter, as the player would.
        const om = afstand(this.masks[i]!, oplossing[i]!);
        this.masks[i] = draai(this.masks[i]!, om * 2 > periode(this.masks[i]!) ? 3 : 1);
        this.draaien++;
      }
      this.check();
      return;
    }

    const i = this.cellAt(ctx);
    const vast = (this.level.bord.kruisingen ?? []).includes(i);
    if (i >= 0 && this.masks[i] !== LEEG && !vast && ctx.input.mouseClicked) {
      // The explanation has always promised this; now the mouse delivers.
      this.masks[i] = draai(this.masks[i]!, ctx.input.mouseRechts ? 3 : 1);
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
    this.drawNamen(screen);
    if (!this.won && !this.uitleg) this.drawHover(screen, ctx);
    this.drawTopBar(screen);
    this.drawBottomBar(screen);
    if (this.won) this.drawWon(screen);
    if (this.uitleg) this.uitleg.render(screen, this.time);
  }

  /**
   * Blueprint paper with the house drawn on it: the real footprint from the
   * scan, walled, with the rooms named. The duct then sits on the plan rather
   * than on an abstract grid, so a rooster is in a room rather than at a
   * coordinate.
   */
  private drawPaper(screen: Screen): void {
    const bord = this.level.bord;
    const w = bord.width * this.tile;
    const h = bord.height * this.tile;
    screen.fillRect(this.originX - 6, this.originY - 6, w + 12, h + 12, C.DIEPBLAUW);
    screen.strokeRect(this.originX - 6, this.originY - 6, w + 12, h + 12, C.LUCHTBLAUW);

    // Faint squared paper, only inside the house.
    for (let y = 0; y < bord.height; y++) {
      for (let x = 0; x < bord.width; x++) {
        if (!binnenshuis(x, y)) continue;
        const px = this.originX + x * this.tile;
        const py = this.originY + y * this.tile;
        screen.fillRect(px, py, this.tile, this.tile, C.DIEPBLAUW);
        screen.fillRect(px, py, this.tile, 1, C.ASGRIJS);
        screen.fillRect(px, py, 1, this.tile, C.ASGRIJS);
      }
    }

    // The outside walls: wherever inside meets outside, or the paper's edge.
    for (let y = 0; y < bord.height; y++) {
      for (let x = 0; x < bord.width; x++) {
        if (!binnenshuis(x, y)) continue;
        const px = this.originX + x * this.tile;
        const py = this.originY + y * this.tile;
        if (!binnenshuis(x, y - 1)) screen.fillRect(px, py - 1, this.tile, 2, C.WIT);
        if (!binnenshuis(x, y + 1)) screen.fillRect(px, py + this.tile - 1, this.tile, 2, C.WIT);
        if (!binnenshuis(x - 1, y)) screen.fillRect(px - 1, py, 2, this.tile, C.WIT);
        if (!binnenshuis(x + 1, y)) screen.fillRect(px + this.tile - 1, py, 2, this.tile, C.WIT);
      }
    }

    // Room divisions. The names go on last, over the duct.
    for (const ruimte of PLATTEGROND.ruimtes) {
      screen.strokeRect(
        this.originX + ruimte.x * this.tile, this.originY + ruimte.y * this.tile,
        ruimte.w * this.tile, ruimte.h * this.tile, C.LUCHTBLAUW,
      );
    }
  }

  /** Room names, drawn over everything on a strip so they stay readable. */
  private drawNamen(screen: Screen): void {
    for (const ruimte of PLATTEGROND.ruimtes) {
      const w = ruimte.naam.length * 6 + 3;
      const x = this.originX + ruimte.x * this.tile + 2;
      // Along the bottom of the room, where there is least duct.
      const y = this.originY + (ruimte.y + ruimte.h) * this.tile - 10;
      screen.fillRect(x - 1, y - 1, w, 9, C.ZWART);
      screen.text(ruimte.naam, x, y, C.LUCHTBLAUW);
    }
  }

  /** Body and edge colour for a length of duct, by what air is in it. */
  private kleurVan(merk: number): { kleur: number; rand: number } {
    if (merk === TOE) return { kleur: C.SALIE, rand: C.DONKERSALIE };
    if (merk === AF) return { kleur: C.ROESTROOD, rand: C.DONKERROOD };
    if (merk === (TOE | AF)) {
      // Both at once: the one thing that must not happen, so it shouts.
      return Math.floor(this.time * 4) % 2 === 0
        ? { kleur: C.MAGENTA, rand: C.WIT } : { kleur: C.WIT, rand: C.MAGENTA };
    }
    return { kleur: C.ZANDGRIJS, rand: C.ASGRIJS };
  }

  /**
   * Green where the fresh air reaches, red where the stale air is drawn
   * off, pale where neither does. A kruising is drawn as what it is: one
   * duct lying across another, with a gap either side to show it is over.
   */
  private drawDuct(screen: Screen): void {
    const bord = this.level.bord;
    const { h, v } = lucht(bord, this.masks);
    const lek = new Set<number>();
    const fout = new Set<number>();
    for (const f of faults(bord, this.masks)) {
      if (f.kind === 'lek') lek.add(f.at);
      if (f.kind === 'verkeerd') fout.add(f.at);
    }
    const kruis = new Set(bord.kruisingen ?? []);
    const af = new Set(bord.afRoosters ?? []);
    const mid = Math.floor(this.tile / 2);
    const thick = Math.max(3, Math.floor(this.tile / 4));
    const off = mid - Math.floor(thick / 2);

    for (let i = 0; i < this.masks.length; i++) {
      const mask = this.masks[i]!;
      if (mask === LEEG) continue;
      const x = this.originX + (i % bord.width) * this.tile;
      const y = this.originY + Math.floor(i / bord.width) * this.tile;

      if (kruis.has(i)) {
        const onder = this.kleurVan(v[i]!);
        const boven = this.kleurVan(h[i]!);
        screen.fillRect(x + off, y, thick, this.tile, onder.kleur);
        screen.fillRect(x + off, y, 1, this.tile, onder.rand);
        screen.fillRect(x, y + off - 2, this.tile, thick + 4, C.DIEPBLAUW);
        screen.fillRect(x, y + off, this.tile, thick, boven.kleur);
        screen.fillRect(x, y + off, this.tile, 1, boven.rand);
        // Bolted down: four dots, so nobody tries to turn it.
        for (const [dx, dy] of [[2, 2], [this.tile - 3, 2], [2, this.tile - 3], [this.tile - 3, this.tile - 3]] as const) {
          screen.set(x + dx, y + dy, C.ZANDGRIJS);
        }
        continue;
      }

      const { kleur, rand } = this.kleurVan(h[i]!);
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

      if (i === bord.wtw || i === bord.afvoer) {
        const isAf = i === bord.afvoer;
        screen.fillRect(x + 2, y + 2, this.tile - 4, this.tile - 4, C.ASGRIJS);
        screen.strokeRect(x + 2, y + 2, this.tile - 4, this.tile - 4,
          bord.afvoer === undefined ? C.WIT : isAf ? C.ROESTROOD : C.SALIE);
        const spin = Math.floor(this.time * 6) % 2 === 0;
        screen.fillRect(x + mid - 4, y + mid - (spin ? 0 : 1), 9, 2, C.ROET);
        screen.fillRect(x + mid - (spin ? 1 : 0), y + mid - 4, 2, 9, C.ROET);
      } else if (bord.roosters.includes(i)) {
        // The frame says which air it wants, lit or not; the inside lights
        // only when that is the air it is getting.
        const wil = af.has(i) ? AF : TOE;
        const goed = h[i] === wil;
        const kader = bord.afvoer === undefined ? C.ROET : wil === AF ? C.ROESTROOD : C.SALIE;
        screen.fillRect(x + mid - 5, y + mid - 5, 11, 11, kader);
        screen.fillRect(x + mid - 4, y + mid - 4, 9, 9, goed ? C.BOTERGEEL : C.ZANDGRIJS);
        if (wil === AF) {
          // Extract: a round grille. Supply: slats.
          screen.strokeEllipse(x + mid, y + mid, 3, 3, C.ROET);
          screen.set(x + mid, y + mid, C.ROET);
        } else {
          for (let g = -2; g <= 2; g += 2) screen.fillRect(x + mid - 3, y + mid + g, 7, 1, C.ROET);
        }
        if (fout.has(i)) {
          screen.line(x + mid - 4, y + mid - 4, x + mid + 4, y + mid + 4, C.MAGENTA);
          screen.line(x + mid + 4, y + mid - 4, x + mid - 4, y + mid + 4, C.MAGENTA);
        }
      }

      if (lek.has(i)) screen.fillRect(x + 1, y + 1, 2, 2, C.ROESTROOD);
    }
  }

  private drawHover(screen: Screen, ctx: SceneContext): void {
    const i = this.cellAt(ctx);
    if (i < 0 || this.masks[i] === LEEG || (this.level.bord.kruisingen ?? []).includes(i)) return;
    const x = this.originX + (i % this.level.bord.width) * this.tile;
    const y = this.originY + Math.floor(i / this.level.bord.width) * this.tile;
    screen.strokeRect(x, y, this.tile, this.tile, C.WIT);
  }

  private drawTopBar(screen: Screen): void {
    screen.fillRect(0, 0, WIDTH, TOP_H, C.ZWART);
    screen.fillRect(0, TOP_H - 1, WIDTH, 1, C.STEEN);
    screen.text(this.level.titel, 6, 5, this.level.baas ? C.MAGENTA : C.LICHTOKER);
    // The boss's title already says it covers everything.
    if (!this.level.baas) {
      screen.text(this.level.dekking, 6 + (this.level.titel.length + 2) * 6, 5, C.ASGRIJS);
    }
    const label = `DRAAIEN ${String(this.draaien).padStart(2, '0')}   PAR ${String(this.par).padStart(2, '0')}`;
    screen.text(label, WIDTH - 6 - label.length * 6, 5, this.draaien > this.par ? C.ROESTROOD : C.SALIE);
  }

  private drawBottomBar(screen: Screen): void {
    const y = HEIGHT - BOTTOM_H;
    const bord = this.level.bord;
    screen.fillRect(0, y, WIDTH, BOTTOM_H, C.ZWART);
    screen.fillRect(0, y, WIDTH, 1, C.STEEN);
    const { h } = lucht(bord, this.masks);
    const af = new Set(bord.afRoosters ?? []);
    const aan = bord.roosters.filter((i) => h[i] === (af.has(i) ? AF : TOE)).length;
    screen.text(`ROOSTERS ${aan}/${bord.roosters.length}`, 6, y + 7, C.KALK);
    if (bord.afvoer !== undefined) {
      // Which colour is which, where it is always in view.
      screen.fillRect(112, y + 7, 7, 7, C.SALIE);
      screen.text('TOEVOER', 122, y + 7, C.SALIE);
      screen.fillRect(176, y + 7, 7, 7, C.ROESTROOD);
      screen.text('AFVOER', 186, y + 7, C.ROESTROOD);
    }
    screen.text('U  H', WIDTH - 6 - 4 * 6, y + 7, C.STEEN);
    const mis = faults(bord, this.masks);
    const lekken = mis.filter((f) => f.kind === 'lek').length;
    const gemengd = mis.some((f) => f.kind === 'gemengd');
    const verkeerd = mis.filter((f) => f.kind === 'verkeerd').length;
    const regel = gemengd ? 'TOEVOER EN AFVOER ZITTEN AAN ELKAAR'
      : verkeerd > 0 ? `${verkeerd} ROOSTERS AAN DE VERKEERDE LUCHT`
        : lekken > 0 ? `${lekken} OPEN EINDEN` : this.level.praatje;
    screen.text(regel, 6, y + 20, gemengd || verkeerd > 0 || lekken > 0 ? C.ROESTROOD : C.ASGRIJS);
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
