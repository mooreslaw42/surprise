import { C } from '../engine/palette.ts';
import { WIDTH, HEIGHT, type Screen } from '../engine/screen.ts';
import type { Scene, SceneContext } from '../engine/scene.ts';
import type { Save } from '../engine/save.ts';
import { drawStar, STAR_W } from '../engine/ui.ts';
import { Dialogue } from './dialogue.ts';
import {
  type Stuk,
  cellsOf, isSolved, kanSchuiven, schuif, stars,
} from '../puzzles/schuifwerk/model.ts';
import { solve } from '../puzzles/schuifwerk/solver.ts';
import type { SchuifLevel } from '../puzzles/schuifwerk/levels.ts';

const TOP_H = 16;
const BOTTOM_H = 30;

/**
 * The room from above, with everything still in it. Slide the furniture until
 * the one marked piece can get out of the door. Nothing else can start until
 * the room is empty.
 */
export class SchuifScene implements Scene {
  private readonly level: SchuifLevel;
  private readonly save: Save;
  private readonly par: number;
  private readonly tile: number;
  private readonly originX: number;
  private readonly originY: number;

  private stukken: Stuk[];
  private zetten = 0;
  private time = 0;
  private won = false;
  private wonAt = 0;
  private uitleg: Dialogue | null;

  /** What is being dragged, and where it stood when the drag began. */
  private sleept: { index: number; grepen: { x: number; y: number }; begon: Stuk } | null = null;

  constructor(level: SchuifLevel, save: Save) {
    this.level = level;
    this.save = save;
    this.par = solve(level.plan).par;
    this.stukken = level.plan.stukken.map((s) => ({ ...s }));
    this.uitleg = new Dialogue(level.uitleg);

    const plan = level.plan;
    this.tile = Math.max(8, Math.min(
      Math.floor((HEIGHT - TOP_H - BOTTOM_H - 10) / plan.height),
      Math.floor((WIDTH - 60) / (plan.width + 1)),
    ));
    this.originX = Math.round((WIDTH - (plan.width + 1) * this.tile) / 2);
    this.originY = TOP_H + Math.round((HEIGHT - TOP_H - BOTTOM_H - plan.height * this.tile) / 2);
  }

  private cellAt(ctx: SceneContext): { x: number; y: number } {
    return {
      x: Math.floor((ctx.input.mouseX - this.originX) / this.tile),
      y: Math.floor((ctx.input.mouseY - this.originY) / this.tile),
    };
  }

  private stukOp(cell: { x: number; y: number }): number {
    return this.stukken.findIndex((s) => cellsOf(s).some((c) => c.x === cell.x && c.y === cell.y));
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
      this.stukken = this.level.plan.stukken.map((s) => ({ ...s }));
      this.zetten = 0;
      return;
    }
    if (ctx.input.justPressed('KeyH')) {
      const next = solve({ ...this.level.plan, stukken: this.stukken }).zetten[0];
      if (next) {
        const i = this.stukken.findIndex((s) => s.id === next.id);
        if (i >= 0) {
          this.stukken = schuif(this.level.plan, this.stukken, i, next.stap);
          this.zetten++;
        }
      }
      this.check();
      return;
    }

    const cell = this.cellAt(ctx);
    if (ctx.input.mouseClicked && ctx.input.mouseOver) {
      const i = this.stukOp(cell);
      if (i >= 0) this.sleept = { index: i, grepen: cell, begon: { ...this.stukken[i]! } };
    }

    if (this.sleept && ctx.input.mouseDown) {
      const { index, grepen, begon } = this.sleept;
      const stuk = this.stukken[index]!;
      // How far the mouse has travelled along the piece's own axis.
      const wens = stuk.orientatie === 'horizontaal'
        ? cell.x - grepen.x - (stuk.x - begon.x)
        : cell.y - grepen.y - (stuk.y - begon.y);
      if (wens !== 0) {
        const stap = Math.sign(wens);
        // One cell at a time, so the piece stops against whatever is in the way.
        for (let n = 0; n < Math.abs(wens); n++) {
          if (!kanSchuiven(this.level.plan, this.stukken, index, stap)) break;
          this.stukken = schuif(this.level.plan, this.stukken, index, stap);
        }
      }
    }

    if (this.sleept && !ctx.input.mouseDown) {
      // A drag of any distance is one move, as it is on the table.
      const now = this.stukken[this.sleept.index]!;
      if (now.x !== this.sleept.begon.x || now.y !== this.sleept.begon.y) this.zetten++;
      this.sleept = null;
      this.check();
    }
  }

  private check(): void {
    if (this.won) return;
    if (isSolved(this.level.plan, this.stukken)) {
      this.won = true;
      this.wonAt = this.time;
      this.save.record(this.level.id, this.zetten, stars(this.zetten, this.par));
    }
  }

  render(screen: Screen, ctx: SceneContext): void {
    screen.clear(C.ROET);
    this.drawRoof(screen);
    this.drawPieces(screen);
    if (!this.won && !this.uitleg) this.drawHover(screen, ctx);
    this.drawTopBar(screen);
    this.drawBottomBar(screen);
    if (this.won) this.drawWon(screen);
    if (this.uitleg) this.uitleg.render(screen, this.time);
  }

  /** The floor, with the doorway on the right. */
  private drawRoof(screen: Screen): void {
    const plan = this.level.plan;
    const w = plan.width * this.tile;
    const h = plan.height * this.tile;
    screen.fillRect(this.originX - 3, this.originY - 3, w + 6, h + 6, C.STEEN);
    screen.strokeRect(this.originX - 3, this.originY - 3, w + 6, h + 6, C.ROET);

    for (let y = 0; y < plan.height; y++) {
      for (let x = 0; x < plan.width; x++) {
        const px = this.originX + x * this.tile;
        const py = this.originY + y * this.tile;
        screen.fillRect(px, py, this.tile, this.tile, (x + y) % 2 === 0 ? C.HOUT : C.DONKEROKER);
        screen.fillRect(px, py, this.tile, 1, C.STEEN);
        screen.fillRect(px, py, 1, this.tile, C.STEEN);
      }
    }
    for (const v of plan.vast) {
      const px = this.originX + v.x * this.tile;
      const py = this.originY + v.y * this.tile;
      screen.fillRect(px, py, this.tile, this.tile, C.ROET);
      screen.ditherRect(px + 2, py + 2, this.tile - 4, this.tile - 4, C.STEEN, C.ROET);
    }

    // The aansluiting: a slot in the right-hand wall with the unit beyond it.
    const ax = this.originX + plan.width * this.tile;
    const ay = this.originY + plan.aansluiting.y * this.tile;
    screen.fillRect(ax - 2, ay, this.tile + 6, this.tile, C.ZWART);
    screen.fillRect(ax + 2, ay + 2, this.tile, this.tile - 4, C.ASGRIJS);
    screen.fillEllipse(ax + 2 + Math.floor(this.tile / 2), ay + Math.floor(this.tile / 2), 4, 4, C.ZANDGRIJS);
    const spin = Math.floor(this.time * 6) % 2 === 0;
    screen.fillRect(ax + 2 + Math.floor(this.tile / 2) - 3, ay + Math.floor(this.tile / 2) - (spin ? 0 : 1), 7, 2, C.ROET);
    screen.text('DEUR', ax - 2, ay + this.tile + 2, C.LICHTOKER);
  }

  /** Furniture from above: the piece that has to leave in yellow. */
  private drawPieces(screen: Screen): void {
    for (const stuk of this.stukken) {
      const px = this.originX + stuk.x * this.tile + 2;
      const py = this.originY + stuk.y * this.tile + 2;
      const w = (stuk.orientatie === 'horizontaal' ? stuk.lengte : 1) * this.tile - 4;
      const h = (stuk.orientatie === 'verticaal' ? stuk.lengte : 1) * this.tile - 4;
      const body = stuk.hoofd ? C.BOTERGEEL : C.ZANDGRIJS;
      const edge = stuk.hoofd ? C.OKER : C.ASGRIJS;

      screen.fillRect(px, py, w, h, edge);
      screen.fillRect(px + 1, py + 1, w - 2, h - 2, body);
      // Ribs along the length, the way spiro duct is made.
      if (stuk.orientatie === 'horizontaal') {
        for (let x = px + 4; x < px + w - 2; x += 5) screen.fillRect(x, py + 1, 1, h - 2, edge);
        screen.fillRect(px + 1, py + 1, w - 2, 1, C.WIT);
      } else {
        for (let y = py + 4; y < py + h - 2; y += 5) screen.fillRect(px + 1, y, w - 2, 1, edge);
        screen.fillRect(px + 1, py + 1, 1, h - 2, C.WIT);
      }
      if (stuk.hoofd) {
        screen.text('H', px + Math.floor(w / 2) - 2, py + Math.floor(h / 2) - 3, C.ROET);
      }
    }
  }

  private drawHover(screen: Screen, ctx: SceneContext): void {
    if (!ctx.input.mouseOver) return;
    const i = this.sleept ? this.sleept.index : this.stukOp(this.cellAt(ctx));
    if (i < 0) return;
    const stuk = this.stukken[i]!;
    const px = this.originX + stuk.x * this.tile;
    const py = this.originY + stuk.y * this.tile;
    const w = (stuk.orientatie === 'horizontaal' ? stuk.lengte : 1) * this.tile;
    const h = (stuk.orientatie === 'verticaal' ? stuk.lengte : 1) * this.tile;
    screen.strokeRect(px, py, w, h, C.WIT);
    // Which way it can go.
    const pijl = stuk.orientatie === 'horizontaal' ? '< >' : 'V';
    screen.text(pijl, px + Math.floor(w / 2) - 8, py - 9, C.WIT);
  }

  private drawTopBar(screen: Screen): void {
    screen.fillRect(0, 0, WIDTH, TOP_H, C.ZWART);
    screen.fillRect(0, TOP_H - 1, WIDTH, 1, C.STEEN);
    screen.text(this.level.titel, 6, 5, C.LICHTOKER);
    const label = `ZETTEN ${String(this.zetten).padStart(2, '0')}   PAR ${String(this.par).padStart(2, '0')}`;
    screen.text(label, WIDTH - 6 - label.length * 6, 5, this.zetten > this.par ? C.ROESTROOD : C.SALIE);
  }

  private drawBottomBar(screen: Screen): void {
    const y = HEIGHT - BOTTOM_H;
    screen.fillRect(0, y, WIDTH, BOTTOM_H, C.ZWART);
    screen.fillRect(0, y, WIDTH, 1, C.STEEN);
    screen.text('SLEEP EEN MEUBEL IN ZIJN EIGEN RICHTING', 6, y + 7, C.KALK);
    screen.text('U  H', WIDTH - 6 - 4 * 6, y + 7, C.STEEN);
    screen.text(this.level.praatje, 6, y + 20, C.ASGRIJS);
    screen.text('R = OPNIEUW', WIDTH - 6 - 11 * 6, y + 20, C.STEEN);
  }

  /** Approved, costed, and not delivered. */
  private drawWon(screen: Screen): void {
    const got = stars(this.zetten, this.par);
    const w = 240;
    const h = 76;
    const x = Math.round((WIDTH - w) / 2);
    const y = Math.round((HEIGHT - h) / 2);
    screen.fillRect(x, y, w, h, C.ZWART);
    screen.strokeRect(x, y, w, h, C.MAGENTA);
    screen.textCentered('KAMER LEEG', WIDTH / 2, y + 9, C.LICHTOKER);
    const span = 3 * STAR_W * 2 + 2 * 8;
    for (let i = 0; i < 3; i++) {
      drawStar(screen, Math.round((WIDTH - span) / 2) + i * (STAR_W * 2 + 8), y + 22, i < got, 2);
    }
    screen.textCentered(`${this.zetten} ZETTEN   PAR ${this.par}`, WIDTH / 2, y + 44, C.KALK);
    if (Math.floor(this.time * 2) % 2 === 0) {
      screen.textCentered('ENTER', WIDTH / 2, y + 62, C.SALIE);
    }
  }
}
