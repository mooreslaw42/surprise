import { C } from '../engine/palette.ts';
import { WIDTH, HEIGHT, type Screen } from '../engine/screen.ts';
import type { Scene, SceneContext } from '../engine/scene.ts';
import type { Save } from '../engine/save.ts';
import { drawStar, STAR_W } from '../engine/ui.ts';
import { ROOM_NAMES, SURFACES, type Surface } from '../data/house.ts';
import { openingCells } from '../puzzles/sloop/generate.ts';
import {
  type Point, type Route,
  axisAt, axesCompatible, cableLength, faults, index, isSolved, routable, samePoint, stars, tileAt,
} from '../puzzles/elektra/model.ts';
import { solve } from '../puzzles/elektra/solver.ts';
import type { ElektraLevel } from '../puzzles/elektra/levels.ts';
import {
  layout, wallGeometry, drawCeiling, drawFloor, drawWallGround, drawWindow, drawProps, type RoomLayout,
} from './room.ts';

const TOP_H = 16;
const BOTTOM_H = 30;

const DRAAD = [C.LICHTOKER, C.MAGENTA, C.SALIE, C.ROESTROOD] as const;

export class ElektraScene implements Scene {
  private readonly level: ElektraLevel;
  private readonly save: Save;
  private readonly surface: Surface;
  private readonly room: RoomLayout;
  private readonly par: number;
  private readonly tile: number;
  private readonly originX: number;
  private readonly originY: number;

  private routes: Route[];
  private drawing: number | null = null;
  private time = 0;
  private won = false;
  private wonAt = 0;

  constructor(level: ElektraLevel, save: Save) {
    this.level = level;
    this.save = save;
    this.par = solve(level.board).par;
    this.routes = level.board.stopcontacten.map(() => []);

    const surface = SURFACES.find((s) => `elektra-${s.id}` === level.id);
    if (!surface) throw new Error(`no surface behind ${level.id}`);
    this.surface = surface;

    this.room = layout(TOP_H, BOTTOM_H, HEIGHT);
    const geometry = wallGeometry(level.board.width, level.board.height, WIDTH, HEIGHT);
    this.tile = geometry.tile;
    this.originX = geometry.originX;
    this.originY = geometry.originY;
  }

  private cellAt(ctx: SceneContext): Point | null {
    const x = Math.floor((ctx.input.mouseX - this.originX) / this.tile);
    const y = Math.floor((ctx.input.mouseY - this.originY) / this.tile);
    const p = { x, y };
    if (!ctx.input.mouseOver || tileAt(this.level.board, p) === undefined) return null;
    return p;
  }

  update(dt: number, ctx: SceneContext): void {
    this.time += dt;
    if (this.won) {
      if (this.time - this.wonAt > 0.5 && ctx.input.confirmed()) ctx.pop();
      return;
    }
    if (ctx.input.justPressed('Escape')) ctx.pop();
    if (ctx.input.justPressed('KeyH')) {
      this.routes = solve(this.level.board).routes;
      this.check();
      return;
    }
    if (ctx.input.justPressed('KeyR')) this.routes = this.routes.map(() => []);

    const cell = this.cellAt(ctx);

    if (ctx.input.mouseClicked && cell) {
      const socket = this.level.board.stopcontacten.findIndex((s) => samePoint(s, cell));
      if (socket >= 0) {
        this.drawing = socket;
        this.routes[socket] = [cell];
      } else {
        // Clicking a laid cable takes it out again.
        const owner = this.routes.findIndex((r) => r.some((p) => samePoint(p, cell)));
        if (owner >= 0) this.routes[owner] = [];
      }
    }

    if (this.drawing !== null && cell) this.extend(this.drawing, cell);

    if (!ctx.input.mouseDown && this.drawing !== null) {
      const route = this.routes[this.drawing]!;
      // Only a run that actually reaches the meterkast counts.
      if (route.length < 2 || !samePoint(route[route.length - 1]!, this.level.board.meterkast)) {
        this.routes[this.drawing] = [];
      }
      this.drawing = null;
    }

    // Checked once a frame rather than on any one path. A route that reached
    // the meterkast used to clear `drawing` itself, which skipped the
    // mouse-up branch below and with it the only call to check() — so a
    // correctly wired wall never recorded as finished.
    this.check();
  }

  /** Follow the mouse one cell at a time, and let it retrace to undo. */
  private extend(which: number, cell: Point): void {
    const route = this.routes[which]!;
    const head = route[route.length - 1];
    if (!head || samePoint(head, cell)) return;
    if (Math.abs(head.x - cell.x) + Math.abs(head.y - cell.y) !== 1) return;
    if (!routable(this.level.board, cell)) return;

    const back = route.length >= 2 && samePoint(route[route.length - 2]!, cell);
    if (back) {
      route.pop();
      return;
    }
    if (route.some((p) => samePoint(p, cell))) return;
    // Another socket is a device, not a junction box.
    const otherSocket = this.level.board.stopcontacten.some(
      (s, i) => i !== which && samePoint(s, cell));
    if (otherSocket) return;
    if (this.wouldCross(which, route, cell)) return;

    route.push(cell);
    if (samePoint(cell, this.level.board.meterkast)) this.drawing = null;
  }

  /** Refuse the step that would put a straight run across another one. */
  private wouldCross(which: number, route: Route, next: Point): boolean {
    const probe: Route = [...route, next];
    const i = probe.length - 2;
    const axis = axisAt(probe, i);
    if (axis === 'hoek') return false;
    const cell = probe[i]!;
    if (samePoint(cell, this.level.board.meterkast)) return false;
    for (let other = 0; other < this.routes.length; other++) {
      if (other === which) continue;
      const theirs = this.routes[other]!;
      for (let s = 0; s < theirs.length; s++) {
        if (!samePoint(theirs[s]!, cell)) continue;
        if (!axesCompatible(axisAt(theirs, s), axis)) return true;
      }
    }
    return false;
  }

  private check(): void {
    if (this.won) return;
    if (isSolved(this.level.board, this.routes)) {
      this.won = true;
      this.wonAt = this.time;
      const length = cableLength(this.routes);
      this.save.record(this.level.id, length, stars(length, this.par));
    }
  }

  render(screen: Screen, ctx: SceneContext): void {
    screen.clear(C.ZWART);
    drawCeiling(screen, this.room);
    drawWallGround(screen, this.room, this.surface.afwerking);
    this.drawWall(screen);
    this.drawOpenings(screen);
    drawFloor(screen, this.room, 'ondervloer');
    drawProps(screen, this.room, this.surface.props,
      this.originX, this.originX + this.level.board.width * this.tile);

    this.drawCables(screen);
    this.drawTerminals(screen);
    if (!this.won) this.drawCursorCell(screen, ctx);
    this.drawTopBar(screen);
    this.drawBottomBar(screen);
    if (this.won) this.drawWon(screen);
  }

  /** The wall at this stage is stripped back to studs and wool. */
  private drawWall(screen: Screen): void {
    const board = this.level.board;
    for (let y = 0; y < board.height; y++) {
      for (let x = 0; x < board.width; x++) {
        if (!routable(board, { x, y })) continue;
        const px = this.originX + x * this.tile;
        const py = this.originY + y * this.tile;
        screen.ditherRect(px, py, this.tile, this.tile, C.BOTERGEEL, C.LICHTOKER);
        if (x % 2 === 0) {
          screen.fillRect(px, py, 2, this.tile, C.HOUT);
          screen.fillRect(px, py, 1, this.tile, C.LICHTHOUT);
        }
      }
    }
  }

  private drawOpenings(screen: Screen): void {
    const band = {
      x: this.originX, y: this.originY,
      w: this.level.board.width * this.tile, h: this.level.board.height * this.tile,
    };
    for (const opening of this.surface.openings) {
      const cells = openingCells(this.surface, opening);
      if (!cells) continue;
      drawWindow(screen,
        this.originX + cells.c0 * this.tile, this.originY + cells.r0 * this.tile,
        (cells.c1 - cells.c0 + 1) * this.tile, (cells.r1 - cells.r0 + 1) * this.tile,
        opening.kind, band);
    }
  }

  private centre(p: Point): { x: number; y: number } {
    return {
      x: this.originX + p.x * this.tile + Math.floor(this.tile / 2),
      y: this.originY + p.y * this.tile + Math.floor(this.tile / 2),
    };
  }

  private drawCables(screen: Screen): void {
    const bad = new Set<number>();
    for (const fault of faults(this.level.board, this.routes)) {
      if (fault.kind === 'kruising') bad.add(index(this.level.board, fault.at));
    }
    for (let i = 0; i < this.routes.length; i++) {
      const route = this.routes[i]!;
      const colour = DRAAD[i % DRAAD.length]!;
      for (let s = 1; s < route.length; s++) {
        const a = this.centre(route[s - 1]!);
        const b = this.centre(route[s]!);
        const hit = bad.has(index(this.level.board, route[s]!));
        screen.line(a.x, a.y + 1, b.x, b.y + 1, C.ZWART);
        screen.line(a.x, a.y, b.x, b.y, hit ? C.ROESTROOD : colour);
      }
    }
  }

  private drawTerminals(screen: Screen): void {
    const board = this.level.board;
    const m = this.centre(board.meterkast);
    screen.fillRect(m.x - 7, m.y - 9, 15, 19, C.ASGRIJS);
    screen.fillRect(m.x - 6, m.y - 8, 13, 17, C.ZANDGRIJS);
    screen.fillRect(m.x - 4, m.y - 6, 9, 5, C.ROET);
    for (let i = 0; i < 3; i++) screen.fillRect(m.x - 4 + i * 3, m.y - 5, 2, 3, C.LICHTOKER);
    screen.strokeRect(m.x - 7, m.y - 9, 15, 19, C.ROET);

    for (let i = 0; i < board.stopcontacten.length; i++) {
      const s = this.centre(board.stopcontacten[i]!);
      const done = this.routes[i]!.length > 1;
      screen.fillRect(s.x - 5, s.y - 5, 11, 11, C.WIT);
      screen.strokeRect(s.x - 5, s.y - 5, 11, 11, done ? DRAAD[i % DRAAD.length]! : C.ASGRIJS);
      screen.fillRect(s.x - 2, s.y - 2, 2, 2, C.ROET);
      screen.fillRect(s.x + 1, s.y - 2, 2, 2, C.ROET);
      screen.text(String(board.belasting[i] ?? 0), s.x - 2, s.y + 1, C.ASGRIJS);
    }
  }

  private drawCursorCell(screen: Screen, ctx: SceneContext): void {
    const cell = this.cellAt(ctx);
    if (!cell) return;
    const px = this.originX + cell.x * this.tile;
    const py = this.originY + cell.y * this.tile;
    screen.strokeRect(px, py, this.tile, this.tile,
      routable(this.level.board, cell) ? C.WIT : C.ROESTROOD);
  }

  private drawTopBar(screen: Screen): void {
    screen.fillRect(0, 0, WIDTH, TOP_H, C.ZWART);
    screen.fillRect(0, TOP_H - 1, WIDTH, 1, C.STEEN);
    screen.text(`${ROOM_NAMES[this.level.ruimte]} - ${this.level.vlak}`, 6, 5, C.LICHTOKER);
    const used = cableLength(this.routes);
    const label = `DRAAD ${String(used).padStart(3)}   PAR ${String(this.par).padStart(3)}`;
    screen.text(label, WIDTH - 6 - label.length * 6, 5, used > this.par ? C.ROESTROOD : C.SALIE);
  }

  private drawBottomBar(screen: Screen): void {
    const y = HEIGHT - BOTTOM_H;
    screen.fillRect(0, y, WIDTH, BOTTOM_H, C.ZWART);
    screen.fillRect(0, y, WIDTH, 1, C.STEEN);
    const done = this.routes.filter((r) => r.length > 1).length;
    screen.text(`AANGESLOTEN ${done} / ${this.routes.length}`, 6, y + 7, C.KALK);
    screen.text('H = HINT', WIDTH - 6 - 8 * 6, y + 7, C.STEEN);
    screen.text(this.level.praatje, 6, y + 20, C.ASGRIJS);
    screen.text('R = OPNIEUW', WIDTH - 6 - 11 * 6, y + 20, C.STEEN);
  }

  private drawWon(screen: Screen): void {
    const length = cableLength(this.routes);
    const got = stars(length, this.par);
    const w = 200;
    const h = 72;
    const x = Math.round((WIDTH - w) / 2);
    const y = Math.round((HEIGHT - h) / 2);
    screen.fillRect(x, y, w, h, C.ZWART);
    screen.strokeRect(x, y, w, h, C.LICHTOKER);
    screen.textCentered('SPANNING EROP', WIDTH / 2, y + 10, C.LICHTOKER);
    const span = 3 * STAR_W * 2 + 2 * 8;
    for (let i = 0; i < 3; i++) {
      drawStar(screen, Math.round((WIDTH - span) / 2) + i * (STAR_W * 2 + 8), y + 24, i < got, 2);
    }
    screen.textCentered(`${length} DRAAD   PAR ${this.par}`, WIDTH / 2, y + 46, C.KALK);
    if (Math.floor(this.time * 2) % 2 === 0) screen.textCentered('ENTER', WIDTH / 2, y + 58, C.SALIE);
  }
}
