import { C } from '../engine/palette.ts';
import { WIDTH, HEIGHT, type Screen } from '../engine/screen.ts';
import type { Scene, SceneContext } from '../engine/scene.ts';
import type { Save } from '../engine/save.ts';
import { drawStar, STAR_W } from '../engine/ui.ts';
import { Dialogue } from './dialogue.ts';
import { dicht, draaiKraan, heeftKraan, isSolved, raakt, stars } from '../puzzles/verdeler/model.ts';
import { solve } from '../puzzles/verdeler/solver.ts';
import type { VerdelerLevel } from '../puzzles/verdeler/levels.ts';

const TOP_H = 16;
const BOTTOM_H = 30;

/**
 * The manifold, loop by loop. Each loop is a flow meter with a valve under
 * it; turning one sends its neighbours the other way, and the whole lot has
 * to be flowing at once.
 */
export class VerdelerScene implements Scene {
  private readonly level: VerdelerLevel;
  private readonly save: Save;
  private readonly par: number;
  private readonly tile: number;
  private readonly originX: number;
  private readonly originY: number;

  private open: boolean[];
  private zetten = 0;
  private time = 0;
  private won = false;
  private wonAt = 0;
  private uitleg: Dialogue | null;
  /** Loops that just changed, so the knock-on is visible. */
  private schok: { cellen: number[]; tot: number } | null = null;

  constructor(level: VerdelerLevel, save: Save) {
    this.level = level;
    this.save = save;
    this.open = [...level.verdeler.open];
    this.par = solve(level.verdeler).par;
    this.uitleg = new Dialogue(level.uitleg);

    const v = level.verdeler;
    this.tile = Math.max(14, Math.min(
      Math.floor((HEIGHT - TOP_H - BOTTOM_H - 16) / v.height),
      Math.floor((WIDTH - 40) / v.width),
    ));
    this.originX = Math.round((WIDTH - v.width * this.tile) / 2);
    this.originY = TOP_H + Math.round((HEIGHT - TOP_H - BOTTOM_H - v.height * this.tile) / 2);
  }

  private celAt(ctx: SceneContext): number {
    const v = this.level.verdeler;
    const x = Math.floor((ctx.input.mouseX - this.originX) / this.tile);
    const y = Math.floor((ctx.input.mouseY - this.originY) / this.tile);
    if (!ctx.input.mouseOver || x < 0 || y < 0 || x >= v.width || y >= v.height) return -1;
    return y * v.width + x;
  }

  update(dt: number, ctx: SceneContext): void {
    this.time += dt;
    if (this.schok && this.time > this.schok.tot) this.schok = null;
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
      this.open = [...this.level.verdeler.open];
      this.zetten = 0;
      return;
    }
    if (ctx.input.justPressed('KeyH')) {
      const { kranen } = solve({ ...this.level.verdeler, open: this.open });
      if (kranen[0] !== undefined) this.draai(kranen[0]);
      return;
    }

    const i = this.celAt(ctx);
    if (i >= 0 && ctx.input.mouseClicked && heeftKraan(this.level.verdeler, i)) this.draai(i);
  }

  private draai(i: number): void {
    this.open = draaiKraan(this.level.verdeler, this.open, i);
    this.zetten++;
    this.schok = { cellen: raakt(this.level.verdeler, i), tot: this.time + 0.22 };
    if (isSolved(this.open)) {
      this.won = true;
      this.wonAt = this.time;
      this.save.record(this.level.id, this.zetten, stars(this.zetten, this.par));
    }
  }

  render(screen: Screen, ctx: SceneContext): void {
    screen.clear(C.ROET);
    this.drawManifold(screen);
    this.drawLussen(screen, ctx);
    this.drawTopBar(screen);
    this.drawBottomBar(screen);
    if (this.won) this.drawWon(screen);
    if (this.uitleg) this.uitleg.render(screen, this.time);
  }

  /** The bar the loops all hang off, with supply and return. */
  private drawManifold(screen: Screen): void {
    const v = this.level.verdeler;
    const w = v.width * this.tile;
    const h = v.height * this.tile;
    screen.fillRect(this.originX - 10, this.originY - 8, w + 20, h + 16, C.ROET);
    screen.strokeRect(this.originX - 10, this.originY - 8, w + 20, h + 16, C.STEEN);
    // Supply down the left, return down the right.
    screen.fillRect(this.originX - 8, this.originY - 6, 5, h + 12, C.ROESTROOD);
    screen.fillRect(this.originX - 8, this.originY - 6, 2, h + 12, C.TERRACOTTA);
    screen.fillRect(this.originX + w + 3, this.originY - 6, 5, h + 12, C.LUCHTBLAUW);
    screen.fillRect(this.originX + w + 3, this.originY - 6, 2, h + 12, C.DIEPBLAUW);
  }

  private drawLussen(screen: Screen, ctx: SceneContext): void {
    const v = this.level.verdeler;
    const over = this.celAt(ctx);
    for (let i = 0; i < this.open.length; i++) {
      const x = this.originX + (i % v.width) * this.tile;
      const y = this.originY + Math.floor(i / v.width) * this.tile;
      const t = this.tile;
      const aan = this.open[i]!;
      const kraan = heeftKraan(v, i);
      const geraakt = this.schok?.cellen.includes(i) ?? false;

      screen.fillRect(x + 1, y + 1, t - 2, t - 2, C.ZWART);
      screen.strokeRect(x + 1, y + 1, t - 2, t - 2, geraakt ? C.WIT : C.STEEN);

      // The flow meter: a tube with the float high when the loop is running.
      const tubeX = x + Math.floor(t / 2) - 3;
      const tubeTop = y + 4;
      const tubeH = t - 14;
      screen.fillRect(tubeX, tubeTop, 7, tubeH, C.STEEN);
      if (aan) {
        screen.fillRect(tubeX + 1, tubeTop + 1, 5, tubeH - 2, C.SALIE);
        screen.fillRect(tubeX + 1, tubeTop + 1, 5, 3, C.LICHTSALIE);
      } else {
        screen.fillRect(tubeX + 1, tubeTop + tubeH - 5, 5, 4, C.ASGRIJS);
      }

      // The valve: a knob, or a blank where there is none.
      const knopY = y + t - 8;
      if (kraan) {
        screen.fillEllipse(x + Math.floor(t / 2), knopY, 4, 3, aan ? C.LICHTOKER : C.ASGRIJS);
        screen.fillRect(x + Math.floor(t / 2) - 5, knopY - 1, 11, 2, aan ? C.OKER : C.STEEN);
      } else {
        screen.fillRect(x + Math.floor(t / 2) - 4, knopY - 1, 9, 3, C.STEEN);
        screen.ditherRect(x + Math.floor(t / 2) - 4, knopY - 1, 9, 3, C.STEEN, C.ROET);
      }

      if (i === over && kraan && !this.won) {
        // Show which loops this valve would disturb.
        for (const j of raakt(v, i)) {
          const jx = this.originX + (j % v.width) * this.tile;
          const jy = this.originY + Math.floor(j / v.width) * this.tile;
          screen.strokeRect(jx + 1, jy + 1, t - 2, t - 2, j === i ? C.WIT : C.LICHTOKER);
        }
      }
    }
  }

  private drawTopBar(screen: Screen): void {
    screen.fillRect(0, 0, WIDTH, TOP_H, C.ZWART);
    screen.fillRect(0, TOP_H - 1, WIDTH, 1, C.STEEN);
    screen.text(this.level.titel, 6, 5, C.LICHTOKER);
    const label = `KRANEN ${String(this.zetten).padStart(2, '0')}   PAR ${String(this.par).padStart(2, '0')}`;
    screen.text(label, WIDTH - 6 - label.length * 6, 5, this.zetten > this.par ? C.ROESTROOD : C.SALIE);
  }

  private drawBottomBar(screen: Screen): void {
    const y = HEIGHT - BOTTOM_H;
    screen.fillRect(0, y, WIDTH, BOTTOM_H, C.ZWART);
    screen.fillRect(0, y, WIDTH, 1, C.STEEN);
    const uit = dicht(this.open);
    screen.text(uit > 0 ? `${uit} LUSSEN DICHT` : 'ALLES OPEN', 6, y + 7,
      uit > 0 ? C.ROESTROOD : C.SALIE);
    screen.text('U  H', WIDTH - 6 - 4 * 6, y + 7, C.STEEN);
    screen.text(this.level.praatje, 6, y + 20, C.ASGRIJS);
    screen.text('R = OPNIEUW', WIDTH - 6 - 11 * 6, y + 20, C.STEEN);
  }

  private drawWon(screen: Screen): void {
    const got = stars(this.zetten, this.par);
    const w = 220;
    const h = 76;
    const x = Math.round((WIDTH - w) / 2);
    const y = Math.round((HEIGHT - h) / 2);
    screen.fillRect(x, y, w, h, C.ZWART);
    screen.strokeRect(x, y, w, h, C.LICHTOKER);
    screen.textCentered('INGEREGELD', WIDTH / 2, y + 9, C.LICHTOKER);
    const span = 3 * STAR_W * 2 + 2 * 8;
    for (let i = 0; i < 3; i++) {
      drawStar(screen, Math.round((WIDTH - span) / 2) + i * (STAR_W * 2 + 8), y + 22, i < got, 2);
    }
    screen.textCentered(`${this.zetten} KRANEN   PAR ${this.par}`, WIDTH / 2, y + 46, C.KALK);
    if (Math.floor(this.time * 2) % 2 === 0) {
      screen.textCentered('ENTER', WIDTH / 2, y + 60, C.SALIE);
    }
  }
}
