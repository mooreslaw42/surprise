import { C } from '../engine/palette.ts';
import { WIDTH, HEIGHT, type Screen } from '../engine/screen.ts';
import type { Scene, SceneContext } from '../engine/scene.ts';
import type { Save } from '../engine/save.ts';
import { drawStar, STAR_W } from '../engine/ui.ts';
import { Dialogue } from './dialogue.ts';
import {
  type Streek,
  buren, faults, isSolved, overlap, stars, teVerven, xy,
} from '../puzzles/schilderen/model.ts';
import { solve } from '../puzzles/schilderen/solver.ts';
import type { SchilderLevel } from '../puzzles/schilderen/levels.ts';
import { openingCells } from '../puzzles/sloop/generate.ts';
import {
  layout, wallGeometry, drawCeiling, drawFloor, drawWallGround, drawWindow, drawProps,
  type RoomLayout,
} from './room.ts';

const TOP_H = 16;
const BOTTOM_H = 30;

/**
 * The room, with one wall still to do. Drag the roller and the wall goes
 * from old to new behind it, which is the whole reward: you can see how far
 * you have got and exactly which corner you have left bare.
 */
export class SchilderScene implements Scene {
  private readonly level: SchilderLevel;
  private readonly save: Save;
  private readonly par: number;
  private readonly room: RoomLayout;
  private readonly tile: number;
  private readonly originX: number;
  private readonly originY: number;

  private streek: Streek;
  private rolt = false;
  private time = 0;
  private won = false;
  private wonAt = 0;
  private uitleg: Dialogue | null;

  constructor(level: SchilderLevel, save: Save) {
    this.level = level;
    this.save = save;
    this.par = solve(level.muur).par;
    this.streek = [level.muur.start];
    this.uitleg = new Dialogue(level.uitleg);

    this.room = layout(TOP_H, BOTTOM_H, HEIGHT);
    const geometry = wallGeometry(level.muur.width, level.muur.height, WIDTH, HEIGHT);
    this.tile = geometry.tile;
    this.originX = geometry.originX;
    this.originY = geometry.originY;
  }

  private celAt(ctx: SceneContext): number {
    const m = this.level.muur;
    const x = Math.floor((ctx.input.mouseX - this.originX) / this.tile);
    const y = Math.floor((ctx.input.mouseY - this.originY) / this.tile);
    if (!ctx.input.mouseOver || x < 0 || y < 0 || x >= m.width || y >= m.height) return -1;
    return y * m.width + x;
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
    if (ctx.input.justPressed('KeyR')) { this.streek = [this.level.muur.start]; return; }
    if (ctx.input.justPressed('KeyH')) {
      this.streek = solve(this.level.muur).streek;
      this.check();
      return;
    }

    if (ctx.input.mouseClicked) this.rolt = true;
    if (!ctx.input.mouseDown) this.rolt = false;
    if (!this.rolt) return;

    const cel = this.celAt(ctx);
    if (cel < 0 || !this.level.muur.verfbaar[cel]) return;
    const kop = this.streek[this.streek.length - 1]!;
    if (cel === kop) return;
    // Dragging back one square lifts the roller again.
    if (this.streek.length >= 2 && this.streek[this.streek.length - 2] === cel) {
      this.streek.pop();
      return;
    }
    if (!buren(this.level.muur, kop).includes(cel)) return;
    this.streek.push(cel);
    this.check();
  }

  private check(): void {
    if (this.won) return;
    if (isSolved(this.level.muur, this.streek)) {
      this.won = true;
      this.wonAt = this.time;
      this.save.record(this.level.id, this.streek.length, stars(this.streek.length, this.par));
    }
  }

  render(screen: Screen, ctx: SceneContext): void {
    screen.clear(C.ZWART);
    drawCeiling(screen, this.room);
    drawWallGround(screen, this.room, this.level.surface.afwerking);
    this.drawMuur(screen);
    this.drawOpeningen(screen);
    drawFloor(screen, this.room, 'mahonie');
    drawProps(screen, this.room, this.level.surface.props,
      this.originX, this.originX + this.level.muur.width * this.tile);
    this.drawRol(screen);
    this.drawTopBar(screen);
    this.drawBottomBar(screen);
    if (this.won) this.drawWon(screen);
    if (this.uitleg) this.uitleg.render(screen, this.time);
  }

  /** Old finish where the roller has not been, fresh oker where it has. */
  private drawMuur(screen: Screen): void {
    const m = this.level.muur;
    const telling = new Map<number, number>();
    for (const cel of this.streek) telling.set(cel, (telling.get(cel) ?? 0) + 1);

    for (let i = 0; i < m.verfbaar.length; i++) {
      if (!m.verfbaar[i]) continue;
      const { x, y } = xy(m, i);
      const px = this.originX + x * this.tile;
      const py = this.originY + y * this.tile;
      const lagen = telling.get(i) ?? 0;
      if (lagen === 0) {
        screen.fillRect(px, py, this.tile, this.tile, C.KALK);
        screen.ditherRect(px, py, this.tile, this.tile, C.KALK, C.ZANDGRIJS);
      } else {
        screen.fillRect(px, py, this.tile, this.tile, C.OKER);
        screen.ditherRect(px + 1, py + 1, this.tile - 2, this.tile - 2, C.OKER, C.LICHTOKER);
        // Twice over shows as a darker lap mark, which is the whole point.
        if (lagen > 1) screen.ditherRect(px, py, this.tile, this.tile, C.DONKEROKER, C.OKER);
      }
    }
    // The wet edge, where the roller is now.
    const kop = this.streek[this.streek.length - 1]!;
    const { x, y } = xy(m, kop);
    screen.strokeRect(this.originX + x * this.tile, this.originY + y * this.tile,
      this.tile, this.tile, C.WIT);
  }

  private drawOpeningen(screen: Screen): void {
    const band = {
      x: this.originX, y: this.originY,
      w: this.level.muur.width * this.tile, h: this.level.muur.height * this.tile,
    };
    for (const opening of this.level.surface.openings) {
      const cells = openingCells(this.level.surface, opening);
      if (!cells) continue;
      drawWindow(screen,
        this.originX + cells.c0 * this.tile, this.originY + cells.r0 * this.tile,
        (cells.c1 - cells.c0 + 1) * this.tile, (cells.r1 - cells.r0 + 1) * this.tile,
        opening.kind, band);
    }
  }

  /** The roller itself, on its pole, sitting on the wet edge. */
  private drawRol(screen: Screen): void {
    if (this.won) return;
    const kop = this.streek[this.streek.length - 1]!;
    const { x, y } = xy(this.level.muur, kop);
    const px = this.originX + x * this.tile + Math.floor(this.tile / 2);
    const py = this.originY + y * this.tile + Math.floor(this.tile / 2);
    screen.fillRect(px - 7, py - 3, 15, 7, C.LICHTOKER);
    screen.fillRect(px - 7, py - 3, 15, 2, C.WIT);
    screen.fillRect(px - 7, py + 2, 15, 2, C.DONKEROKER);
    screen.fillRect(px + 7, py - 1, 8, 2, C.ASGRIJS);
    screen.fillRect(px + 13, py - 1, 10, 2, C.HOUT);
  }

  private drawTopBar(screen: Screen): void {
    screen.fillRect(0, 0, WIDTH, TOP_H, C.ZWART);
    screen.fillRect(0, TOP_H - 1, WIDTH, 1, C.STEEN);
    screen.text(`${this.level.ruimte} - ${this.level.vlak}`, 6, 5, C.LICHTOKER);
    const label = `ROL ${String(this.streek.length).padStart(3)}   PAR ${String(this.par).padStart(3)}`;
    screen.text(label, WIDTH - 6 - label.length * 6, 5,
      this.streek.length > this.par ? C.ROESTROOD : C.SALIE);
  }

  private drawBottomBar(screen: Screen): void {
    const y = HEIGHT - BOTTOM_H;
    screen.fillRect(0, y, WIDTH, BOTTOM_H, C.ZWART);
    screen.fillRect(0, y, WIDTH, 1, C.STEEN);
    const kaal = faults(this.level.muur, this.streek).filter((f) => f.kind === 'kaal').length;
    screen.text(`KAAL ${kaal}/${teVerven(this.level.muur)}`, 6, y + 7, kaal > 0 ? C.KALK : C.SALIE);
    const dubbel = overlap(this.streek);
    if (dubbel > 0) screen.text(`${dubbel} DUBBEL`, 74, y + 7, C.ROESTROOD);
    screen.text('U  H', WIDTH - 6 - 4 * 6, y + 7, C.STEEN);
    screen.text(this.level.praatje, 6, y + 20, C.ASGRIJS);
    screen.text('R = OPNIEUW', WIDTH - 6 - 11 * 6, y + 20, C.STEEN);
  }

  private drawWon(screen: Screen): void {
    const got = stars(this.streek.length, this.par);
    const w = 220;
    const h = 76;
    const x = Math.round((WIDTH - w) / 2);
    const y = Math.round((HEIGHT - h) / 2);
    screen.fillRect(x, y, w, h, C.ZWART);
    screen.strokeRect(x, y, w, h, C.LICHTOKER);
    screen.textCentered('IN DE VERF', WIDTH / 2, y + 9, C.LICHTOKER);
    const span = 3 * STAR_W * 2 + 2 * 8;
    for (let i = 0; i < 3; i++) {
      drawStar(screen, Math.round((WIDTH - span) / 2) + i * (STAR_W * 2 + 8), y + 22, i < got, 2);
    }
    screen.textCentered(`${this.streek.length} ROL   PAR ${this.par}`, WIDTH / 2, y + 46, C.KALK);
    if (Math.floor(this.time * 2) % 2 === 0) {
      screen.textCentered('ENTER', WIDTH / 2, y + 60, C.SALIE);
    }
  }
}
