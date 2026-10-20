import { C } from '../engine/palette.ts';
import { WIDTH, HEIGHT, type Screen } from '../engine/screen.ts';
import type { Scene, SceneContext } from '../engine/scene.ts';
import { ROOM_NAMES } from '../data/house.ts';
import type { Save } from '../engine/save.ts';
import { drawStar, STAR_W } from '../engine/ui.ts';
import {
  CELL, TOOLS, type CellValue, type Grid, type Tool,
  at, cloneGrid, isLegal, isSolved, rubbleCount, stars, swing, footprint,
} from '../puzzles/sloop/model.ts';
import { solve, type Swing } from '../puzzles/sloop/solver.ts';
import { gridFor, type SloopLevel } from '../puzzles/sloop/levels.ts';
import { openingCells } from '../puzzles/sloop/generate.ts';
import { SURFACES, type Surface } from '../data/house.ts';
import {
  layout, drawCeiling, drawFloor, drawWallGround, drawWindow, drawOutsideSlice, drawProps,
  type RoomLayout,
} from './room.ts';

const TOP_H = 16;
const BOTTOM_H = 30;

type Dust = { x: number; y: number; vx: number; vy: number; life: number; color: number };

export class LevelScene implements Scene {
  private readonly level: SloopLevel;
  private readonly save: Save;
  private readonly par: number;
  private grid: Grid;
  private tool: Tool = TOOLS[2]!;
  private swings = 0;
  private dust: Dust[] = [];
  private shake = 0;
  private won = false;
  private wonAt = 0;
  private time = 0;
  private hint: Swing | null = null;
  private refused = 0;

  private readonly surface: Surface;
  private readonly room: RoomLayout;
  private readonly tile: number;
  private originX = 0;
  private originY = 0;
  /** The wall as it started, so a window can be told from a hole. */
  private readonly original: Grid;

  constructor(level: SloopLevel, save: Save) {
    this.level = level;
    this.save = save;
    this.grid = gridFor(level);
    this.original = cloneGrid(this.grid);
    this.par = solve(cloneGrid(this.grid)).par;

    const surface = SURFACES.find((s) => `sloop-${s.id}` === level.id);
    if (!surface) throw new Error(`no surface behind ${level.id}`);
    this.surface = surface;

    this.room = layout(TOP_H, BOTTOM_H, HEIGHT);
    // The wall fills the room exactly, so the puzzle is the wall rather than a
    // board floating in front of one.
    this.tile = Math.max(6, Math.min(
      Math.floor(this.room.wallH / this.grid.height),
      Math.floor((WIDTH - 24) / this.grid.width),
    ));
    this.originX = Math.round((WIDTH - this.grid.width * this.tile) / 2);
    this.originY = this.room.floorY - this.grid.height * this.tile;
  }

  update(dt: number, ctx: SceneContext): void {
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt * 6);
    this.refused = Math.max(0, this.refused - dt * 3);
    for (const d of this.dust) {
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vy += 320 * dt;
      d.life -= dt;
    }
    this.dust = this.dust.filter((d) => d.life > 0);

    if (this.won) {
      if (this.time - this.wonAt > 0.6 && ctx.input.confirmed()) ctx.pop();
      return;
    }

    if (ctx.input.justPressed('Escape')) ctx.pop();
    for (let i = 0; i < TOOLS.length; i++) {
      if (ctx.input.justPressed(`Digit${i + 1}`)) {
        this.tool = TOOLS[i]!;
        this.hint = null;
      }
    }
    if (ctx.input.justPressed('KeyH')) {
      // The solver already knows the best line; lending one move is cheap.
      this.hint = solve(cloneGrid(this.grid)).moves[0] ?? null;
    }

    const cell = this.cellUnderMouse(ctx);
    if (cell && ctx.input.mouseClicked) this.trySwing(cell.x, cell.y);
  }

  private cellUnderMouse(ctx: SceneContext): { x: number; y: number } | null {
    const x = Math.floor((ctx.input.mouseX - this.originX) / this.tile);
    const y = Math.floor((ctx.input.mouseY - this.originY) / this.tile);
    if (!ctx.input.mouseOver || at(this.grid, x, y) === undefined) return null;
    return { x, y };
  }

  private trySwing(x: number, y: number): void {
    if (!isLegal(this.grid, this.tool, x, y)) {
      this.refused = 1;
      return;
    }
    const before = rubbleCount(this.grid);
    swing(this.grid, this.tool, x, y);
    const cleared = before - rubbleCount(this.grid);
    this.swings++;
    this.hint = null;
    this.shake = cleared > 0 ? 1 : 0.4;

    for (const i of footprint(this.grid, this.tool, x, y)) {
      const cx = this.originX + (i % this.grid.width) * this.tile + this.tile / 2;
      const cy = this.originY + Math.floor(i / this.grid.width) * this.tile + this.tile / 2;
      for (let n = 0; n < 5; n++) {
        this.dust.push({
          x: cx, y: cy,
          vx: (Math.random() - 0.5) * 110,
          vy: -Math.random() * 110 - 20,
          life: 0.4 + Math.random() * 0.5,
          color: [C.KALK, C.ZANDGRIJS, C.WIT, C.STEEN][n % 4]!,
        });
      }
    }

    if (isSolved(this.grid)) {
      this.won = true;
      this.wonAt = this.time;
      this.save.record(this.level.id, this.swings, stars(this.swings, this.par));
    }
  }

  render(screen: Screen, ctx: SceneContext): void {
    const shakeX = this.shake > 0 ? Math.round(Math.sin(this.time * 70) * this.shake * 2) : 0;
    const shakeY = this.shake > 0 ? Math.round(Math.cos(this.time * 61) * this.shake * 2) : 0;

    // The room, back to front: outside, ceiling, wall, openings, floor, props.
    screen.clear(C.ZWART);
    drawCeiling(screen, this.room);
    drawWallGround(screen, this.room, this.surface.afwerking);
    this.drawWall(screen, shakeX, shakeY);
    this.drawOpenings(screen, shakeX, shakeY);
    drawFloor(screen, this.room, 'marmer');
    drawProps(screen, this.room, this.surface.props,
      this.originX, this.originX + this.grid.width * this.tile);

    if (!this.won) this.drawPreview(screen, ctx, shakeX, shakeY);
    for (const d of this.dust) screen.set(Math.round(d.x), Math.round(d.y), d.color);

    this.drawTopBar(screen);
    this.drawBottomBar(screen);
    if (this.won) this.drawWon(screen);
  }

  /** Only the cells that are still wall, or have been knocked through. */
  private drawWall(screen: Screen, sx: number, sy: number): void {
    for (let y = 0; y < this.grid.height; y++) {
      for (let x = 0; x < this.grid.width; x++) {
        const cell = at(this.grid, x, y)!;
        // Openings are drawn as whole windows afterwards, not tile by tile.
        if (at(this.original, x, y) === CELL.LEEG) continue;
        this.drawCell(screen, x, y, cell,
          this.originX + x * this.tile + sx, this.originY + y * this.tile + sy);
      }
    }
  }

  private drawCell(screen: Screen, gx: number, gy: number, cell: CellValue, px: number, py: number): void {
    const tile = this.tile;
    switch (cell) {
      case CELL.PUIN: {
        // Plaster over brick, courses offset every other row.
        screen.fillRect(px, py, tile, tile, C.KALK);
        screen.ditherRect(px, py, tile, 3, C.ZANDGRIJS, C.KALK);
        const offset = (gy % 2) * Math.round(tile / 2);
        screen.fillRect(px, py + Math.round(tile / 2), tile, 1, C.ZANDGRIJS);
        screen.fillRect(px + ((offset + 4) % tile), py, 1, Math.round(tile / 2), C.ZANDGRIJS);
        screen.fillRect(px + ((offset + 12) % tile), py + Math.round(tile / 2) + 1, 1, tile, C.ZANDGRIJS);
        screen.fillRect(px, py, tile, 1, C.WIT);
        screen.fillRect(px, py + tile - 1, tile, 1, C.STEEN);
        break;
      }
      case CELL.LEEG:
        // Knocked through: you are looking at the garden.
        this.drawHole(screen, px, py);
        break;
      case CELL.BALK:
        screen.fillRect(px, py, tile, tile, C.HOUT);
        screen.fillRect(px, py, tile, 2, C.LICHTHOUT);
        screen.fillRect(px, py + tile - 2, tile, 2, C.STEEN);
        screen.fillRect(px + 3, py + 6, tile - 7, 1, C.STEEN);
        screen.fillRect(px + 5, py + 11, tile - 9, 1, C.STEEN);
        break;
      case CELL.LEIDING:
        this.drawHole(screen, px, py);
        this.drawRun(screen, gx, gy, px, py, CELL.LEIDING, C.ASGRIJS, C.ZANDGRIJS);
        break;
      case CELL.KABEL:
        this.drawHole(screen, px, py);
        this.drawRun(screen, gx, gy, px, py, CELL.KABEL, C.DONKERROOD, C.LICHTOKER);
        break;
    }
  }

  /**
   * A hole you made. On an outside wall that shows the garden — the same
   * garden the windows look at, drawn as a slice of one backdrop so a hole
   * next to a window lines up with it.
   */
  private drawHole(screen: Screen, px: number, py: number): void {
    if (this.level.achtergrond === 'binnen') {
      screen.fillRect(px, py, this.tile, this.tile, C.ZWART);
      screen.ditherRect(px + 2, py + 2, this.tile - 4, this.tile - 4, C.ROET, C.ZWART);
      return;
    }
    drawOutsideSlice(screen, px, py, this.tile, this.tile, this.band().x, this.band().y, this.band().w, this.band().h);
  }

  /** The strip of outside that sits behind the whole wall. */
  private band(): { x: number; y: number; w: number; h: number } {
    return {
      x: this.originX,
      y: this.originY,
      w: this.grid.width * this.tile,
      h: this.grid.height * this.tile,
    };
  }

  /** Pipes and cables join up with their neighbours instead of sitting as tiles. */
  private drawRun(screen: Screen, gx: number, gy: number, px: number, py: number,
                  kind: CellValue, body: number, shine: number): void {
    const mid = Math.floor(this.tile / 2) - 2;
    const thick = 5;
    const horizontal = at(this.grid, gx - 1, gy) === kind || at(this.grid, gx + 1, gy) === kind;
    const vertical = at(this.grid, gx, gy - 1) === kind || at(this.grid, gx, gy + 1) === kind;
    if (horizontal || (!horizontal && !vertical)) {
      screen.fillRect(px, py + mid, this.tile, thick, body);
      screen.fillRect(px, py + mid + 1, this.tile, 1, shine);
    }
    if (vertical) {
      screen.fillRect(px + mid, py, thick, this.tile, body);
      screen.fillRect(px + mid + 1, py, 1, this.tile, shine);
    }
  }

  /** The windows and doors, drawn whole. */
  private drawOpenings(screen: Screen, sx: number, sy: number): void {
    for (const opening of this.surface.openings) {
      const cells = openingCells(this.surface, opening);
      if (!cells) continue;
      drawWindow(
        screen,
        this.originX + cells.c0 * this.tile + sx,
        this.originY + cells.r0 * this.tile + sy,
        (cells.c1 - cells.c0 + 1) * this.tile,
        (cells.r1 - cells.r0 + 1) * this.tile,
        opening.kind,
        this.band(),
      );
    }
  }

  private drawPreview(screen: Screen, ctx: SceneContext, sx: number, sy: number): void {
    const cell = this.cellUnderMouse(ctx);
    const target = cell ?? (this.hint ? { x: this.hint.x, y: this.hint.y } : null);
    if (!target) return;
    const tool = cell ? this.tool : this.hint!.tool;
    const legal = isLegal(this.grid, tool, target.x, target.y);
    // An illegal swing pulses rather than blinking out: feedback should never
    // be absent at the moment you are deciding.
    const pulse = Math.floor(this.time * 8) % 2 === 0;
    const color = legal ? C.SALIE : pulse ? C.ROESTROOD : C.DONKERROOD;
    for (const i of footprint(this.grid, tool, target.x, target.y)) {
      const px = this.originX + (i % this.grid.width) * this.tile + sx;
      const py = this.originY + Math.floor(i / this.grid.width) * this.tile + sy;
      screen.strokeRect(px, py, this.tile, this.tile, color);
      if (!legal) screen.strokeRect(px + 1, py + 1, this.tile - 2, this.tile - 2, color);
    }
  }

  private drawTopBar(screen: Screen): void {
    screen.fillRect(0, 0, WIDTH, TOP_H, C.ZWART);
    screen.fillRect(0, TOP_H - 1, WIDTH, 1, C.STEEN);
    screen.text(`${ROOM_NAMES[this.level.ruimte]} - ${this.level.vlak}`, 6, 5, C.LICHTOKER);

    const label = `SLAGEN ${String(this.swings).padStart(2, '0')}   PAR ${String(this.par).padStart(2, '0')}`;
    const over = this.swings > this.par;
    screen.text(label, WIDTH - 6 - label.length * 6, 5, over ? C.ROESTROOD : C.SALIE);
  }

  private drawBottomBar(screen: Screen): void {
    const y = HEIGHT - BOTTOM_H;
    screen.fillRect(0, y, WIDTH, BOTTOM_H, C.ZWART);
    screen.fillRect(0, y, WIDTH, 1, C.STEEN);

    for (let i = 0; i < TOOLS.length; i++) {
      const tool = TOOLS[i]!;
      const bx = 6 + i * 86;
      const active = tool === this.tool;
      screen.fillRect(bx, y + 4, 82, 12, active ? C.DONKEROKER : C.ROET);
      screen.strokeRect(bx, y + 4, 82, 12, active ? C.LICHTOKER : C.STEEN);
      screen.text(`${i + 1} ${tool.naam}`, bx + 4, y + 7, active ? C.WIT : C.ASGRIJS);
    }

    screen.text('H = HINT', WIDTH - 6 - 8 * 6, y + 7, C.STEEN);
    const message = this.refused > 0 ? 'DAAR ZIT IETS ACHTER. NIET DOEN.' : this.level.praatje;
    screen.text(message, 6, y + 20, this.refused > 0 ? C.ROESTROOD : C.ASGRIJS);
    screen.text('ESC = TERUG', WIDTH - 6 - 11 * 6, y + 20, C.STEEN);
  }

  private drawWon(screen: Screen): void {
    const got = stars(this.swings, this.par);
    const w = 200;
    const h = 72;
    const x = Math.round((WIDTH - w) / 2);
    const y = Math.round((HEIGHT - h) / 2);
    screen.fillRect(x, y, w, h, C.ZWART);
    screen.strokeRect(x, y, w, h, C.LICHTOKER);
    screen.strokeRect(x + 2, y + 2, w - 4, h - 4, C.DONKEROKER);

    screen.textCentered('OPGELEVERD', WIDTH / 2, y + 10, C.LICHTOKER);
    const span = 3 * STAR_W * 2 + 2 * 8;
    for (let i = 0; i < 3; i++) {
      drawStar(screen, Math.round((WIDTH - span) / 2) + i * (STAR_W * 2 + 8), y + 24, i < got, 2);
    }
    screen.textCentered(`${this.swings} SLAGEN   PAR ${this.par}`, WIDTH / 2, y + 46, C.KALK);
    if (Math.floor(this.time * 2) % 2 === 0) {
      screen.textCentered('ENTER', WIDTH / 2, y + 58, C.SALIE);
    }
  }
}
