import { C, luma } from '../engine/palette.ts';
import { WIDTH, HEIGHT, type Screen } from '../engine/screen.ts';
import type { Scene, SceneContext } from '../engine/scene.ts';
import type { Save } from '../engine/save.ts';
import { drawStar, STAR_W } from '../engine/ui.ts';
import { Dialogue } from './dialogue.ts';
import { ROOM_NAMES, SURFACES, type Surface } from '../data/house.ts';
import { openingCells } from '../puzzles/sloop/generate.ts';
import {
  type Point, type Route,
  axisAt, axesCompatible, cableLength, endpointsFor, faults, groepVoor, groupLoads, groupOf, index,
  isSolved, isTerminal, isWissel, routable, samePoint, stars, tileAt,
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
  /** Pim explains the stage, once, before you start. */
  private uitleg: Dialogue | null;

  constructor(level: ElektraLevel, save: Save) {
    this.level = level;
    this.save = save;
    this.par = solve(level.board).par;
    this.routes = level.board.devices.map(() => []);

    const surface = SURFACES.find((s) => `elektra-${s.id}` === level.id);
    if (!surface) throw new Error(`no surface behind ${level.id}`);
    this.surface = surface;

    this.uitleg = new Dialogue(level.uitleg);
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
    if (this.uitleg) {
      if (this.uitleg.update(dt, ctx)) this.uitleg = null;
      return;
    }
    if (ctx.input.justPressed('KeyU')) {
      this.uitleg = new Dialogue([
      'ELK STOPCONTACT WIL EEN DRAAD NAAR DE METERKAST. SLEEP HEM ERHEEN.',
      'HET GETAL EROP IS WAT HIJ TREKT, IN AMPERE. EEN GROEP HOUDT ER 16. SAMEN MEER? DAN MOETEN ZE OVER TWEE GROEPEN.',
      'DRADEN MOGEN NAAST ELKAAR LOPEN, MAAR NOOIT OVER ELKAAR HEEN.',
    ]);
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
      const device = this.level.board.devices.findIndex((d) => samePoint(d.cel, cell));
      if (device >= 0) {
        this.drawing = device;
        this.routes[device] = [cell];
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
      const ends = endpointsFor(this.level.board, this.drawing);
      if (route.length < 2 || !ends.some((t) => samePoint(t, route[route.length - 1]!))) {
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
    // A run may end on its own target, but never pass through another device.
    const targets = endpointsFor(this.level.board, which);
    const isTarget = targets.some((t) => samePoint(t, cell));
    const otherDevice = this.level.board.devices.some(
      (d, i) => i !== which && samePoint(d.cel, cell));
    if (otherDevice && !isTarget) return;
    if (this.wouldCross(which, route, cell)) return;

    // Deliberately does not stop at the first terminal it touches: a cable may
    // pass behind the meterkast to reach the other groep, and which groep you
    // land on is the player's choice. The run ends where the mouse is let go.
    route.push(cell);
  }

  /** Refuse the step that would put a straight run across another one. */
  private wouldCross(which: number, route: Route, next: Point): boolean {
    const probe: Route = [...route, next];
    const i = probe.length - 2;
    const axis = axisAt(probe, i);
    if (axis === 'hoek') return false;
    const cell = probe[i]!;
    if (this.isJunction(cell)) return false;
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

  /** Terminals and devices are where runs legitimately meet. */
  private isJunction(p: Point): boolean {
    return isTerminal(this.level.board, p) ||
      this.level.board.devices.some((d) => samePoint(d.cel, p));
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
    this.drawBlokkade(screen);
    drawFloor(screen, this.room, 'ondervloer');
    drawProps(screen, this.room, this.surface.props,
      this.originX, this.originX + this.level.board.width * this.tile);

    // The meterkast backplate goes behind the cables and the breakers in
    // front, so a run stays visible all the way into the breaker it lands on.
    this.drawMeterkastBody(screen);
    this.drawCables(screen);
    this.drawBreakers(screen);
    this.drawDevices(screen);
    if (!this.won) this.drawCursorCell(screen, ctx);
    this.drawTopBar(screen);
    this.drawBottomBar(screen);
    if (this.won) this.drawWon(screen);
    if (this.uitleg) this.uitleg.render(screen, this.time);
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

  /** Waterleiding already chased into the wall: cable has to go around it. */
  private drawBlokkade(screen: Screen): void {
    for (const cel of this.level.blokkade) {
      const px = this.originX + cel.x * this.tile;
      const py = this.originY + cel.y * this.tile;
      const mid = Math.floor(this.tile / 2) - 2;
      const vertical = this.level.blokkade.some((o) => o.x === cel.x && Math.abs(o.y - cel.y) === 1);
      if (vertical) {
        screen.fillRect(px + mid, py, 5, this.tile, C.ASGRIJS);
        screen.fillRect(px + mid + 1, py, 1, this.tile, C.ZANDGRIJS);
      } else {
        screen.fillRect(px, py + mid, this.tile, 5, C.ASGRIJS);
        screen.fillRect(px, py + mid + 1, this.tile, 1, C.ZANDGRIJS);
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
    const wrongGroup = new Set<number>();
    for (const fault of faults(this.level.board, this.routes)) {
      if (fault.kind === 'kruising') bad.add(index(this.level.board, fault.at));
      if (fault.kind === 'verkeerdegroep') wrongGroup.add(fault.which);
    }
    for (let i = 0; i < this.routes.length; i++) {
      const route = this.routes[i]!;
      const groep = groepVoor(this.level.board, this.routes, i);
      const misplaced = wrongGroup.has(i);
      const colour = misplaced ? C.ROESTROOD
        : groep >= 0 ? DRAAD[groep % DRAAD.length]! : C.ASGRIJS;
      for (let s = 1; s < route.length; s++) {
        const a = this.centre(route[s - 1]!);
        const b = this.centre(route[s]!);
        const hit = bad.has(index(this.level.board, route[s]!));
        screen.line(a.x, a.y + 1, b.x, b.y + 1, C.ZWART);
        screen.line(a.x, a.y, b.x, b.y, hit ? C.ROESTROOD : colour);
      }
    }
  }

  /** The cabinet itself, drawn behind the wiring. */
  private drawMeterkastBody(screen: Screen): void {
    const cells = this.level.board.groepen.map((g) => this.centre(g.cel));
    const left = Math.min(...cells.map((c) => c.x)) - 10;
    const right = Math.max(...cells.map((c) => c.x)) + 10;
    const top = Math.min(...cells.map((c) => c.y)) - 10;
    const bottom = Math.max(...cells.map((c) => c.y)) + 10;
    screen.fillRect(left, top, right - left, bottom - top, C.ASGRIJS);
    screen.fillRect(left + 1, top + 1, right - left - 2, bottom - top - 2, C.ZANDGRIJS);
    screen.strokeRect(left, top, right - left, bottom - top, C.ROET);
  }

  /**
   * The breakers, drawn over the wiring but narrow enough that a cable is
   * still visible entering from any side. Each takes the colour of its own
   * group once it is carrying, with a pip per run landed on it — which is
   * how you tell at a glance that a wire went to the right one.
   */
  private drawBreakers(screen: Screen): void {
    const board = this.level.board;
    const loads = groupLoads(board, this.routes);

    for (let g = 0; g < board.groepen.length; g++) {
      const groep = board.groepen[g]!;
      const c = this.centre(groep.cel);
      const landed = this.routes.filter((r) => groupOf(board, r) === g).length;
      const over = loads[g]! > groep.maxAmp;
      const fill = over ? C.ROESTROOD : landed > 0 ? DRAAD[g % DRAAD.length]! : C.ZANDGRIJS;

      screen.fillRect(c.x - 5, c.y - 7, 11, 15, C.ROET);
      screen.fillRect(c.x - 4, c.y - 6, 9, 13, fill);
      const ink = luma(fill) > 128 ? C.ZWART : C.WIT;
      const kort = groep.soort === 'licht' ? 'L' : groep.naam.slice(-1);
      screen.text(kort, c.x - 2, c.y - 3, ink);
    }

    // A stub on the face, pointing the way the cable came in. Without this a
    // run passing behind the cabinet to a lower breaker looks like it ends at
    // the upper one.
    for (let i = 0; i < this.routes.length; i++) {
      const route = this.routes[i]!;
      const g = groupOf(board, route);
      if (g < 0 || route.length < 2) continue;
      const c = this.centre(board.groepen[g]!.cel);
      const from = route[route.length - 2]!;
      const to = route[route.length - 1]!;
      const dx = Math.sign(from.x - to.x);
      const dy = Math.sign(from.y - to.y);
      const colour = DRAAD[g % DRAAD.length]!;
      const ink = luma(colour) > 128 ? C.ZWART : C.WIT;
      // Drawn at the edge the cable came from, clear of the letter.
      if (dx !== 0) screen.fillRect(dx < 0 ? c.x - 4 : c.x + 2, c.y - 1, 3, 2, ink);
      else if (dy !== 0) screen.fillRect(c.x - 1, dy < 0 ? c.y - 6 : c.y + 4, 2, 3, ink);
    }
  }

  private drawDevices(screen: Screen): void {
    const board = this.level.board;
    for (let i = 0; i < board.devices.length; i++) {
      const device = board.devices[i]!;
      const at = this.centre(device.cel);
      const groep = groepVoor(board, this.routes, i);
      const colour = groep >= 0 ? DRAAD[groep % DRAAD.length]! : C.ASGRIJS;
      switch (device.kind) {
        case 'lamp': this.drawLamp(screen, at, colour, groep >= 0); break;
        case 'schakelaar':
          this.drawSchakelaar(screen, at, colour, isWissel(board, i));
          break;
        default: this.drawStopcontact(screen, at, colour, device.amp);
      }
    }
  }

  private drawStopcontact(screen: Screen, at: { x: number; y: number }, colour: number, amp: number): void {
    screen.fillRect(at.x - 6, at.y - 6, 13, 13, C.WIT);
    screen.strokeRect(at.x - 6, at.y - 6, 13, 13, colour);
    screen.fillRect(at.x - 3, at.y - 3, 2, 2, C.ROET);
    screen.fillRect(at.x + 2, at.y - 3, 2, 2, C.ROET);
    screen.text(`${amp}A`, at.x - 5, at.y + 1, C.ROET);
  }

  /** A bulb, lit once its switch has found a groep. */
  private drawLamp(screen: Screen, at: { x: number; y: number }, colour: number, live: boolean): void {
    screen.fillRect(at.x - 1, at.y - 8, 2, 3, C.ROET);
    screen.fillEllipse(at.x, at.y, 6, 6, live ? C.BOTERGEEL : C.ASGRIJS);
    screen.strokeEllipse(at.x, at.y, 6, 6, colour);
    screen.fillRect(at.x - 3, at.y - 5, 6, 2, live ? C.WIT : C.ZANDGRIJS);
    screen.fillRect(at.x - 3, at.y + 4, 7, 2, C.ROET);
    if (live) {
      // A little glow, so a working light reads at a glance.
      for (const [dx, dy] of [[-9, -6], [9, -6], [-10, 2], [10, 2], [0, -11]] as const) {
        screen.set(at.x + dx, at.y + dy, C.BOTERGEEL);
      }
    }
  }

  /** A rocker switch. A wisselschakelaar gets two rockers, so the pair reads. */
  private drawSchakelaar(
    screen: Screen, at: { x: number; y: number }, colour: number, wissel: boolean,
  ): void {
    screen.fillRect(at.x - 6, at.y - 6, 13, 13, C.WIT);
    screen.strokeRect(at.x - 6, at.y - 6, 13, 13, colour);
    if (wissel) {
      screen.fillRect(at.x - 4, at.y - 4, 4, 9, C.KALK);
      screen.fillRect(at.x - 4, at.y - 4, 4, 4, C.ZANDGRIJS);
      screen.fillRect(at.x + 1, at.y - 4, 4, 9, C.KALK);
      screen.fillRect(at.x + 1, at.y, 4, 5, C.ZANDGRIJS);
      screen.fillRect(at.x - 4, at.y, 4, 1, C.ROET);
      screen.fillRect(at.x + 1, at.y - 1, 4, 1, C.ROET);
    } else {
      screen.fillRect(at.x - 3, at.y - 4, 7, 9, C.KALK);
      screen.fillRect(at.x - 3, at.y - 4, 7, 4, C.ZANDGRIJS);
      screen.fillRect(at.x - 3, at.y, 7, 1, C.ROET);
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
    const board = this.level.board;
    const loads = groupLoads(board, this.routes);
    let x = 6;
    for (let g = 0; g < board.groepen.length; g++) {
      const groep = board.groepen[g]!;
      const over = loads[g]! > groep.maxAmp;
      const label = `${groep.naam} ${loads[g]}/${groep.maxAmp}`;
      screen.text(label, x, y + 7, over ? C.ROESTROOD : DRAAD[g % DRAAD.length]!);
      x += label.length * 6 + 8;
    }
    const done = this.routes.filter((r) => r.length > 1).length;
    screen.text(`${done}/${this.routes.length}`, x, y + 7, C.KALK);
    screen.text('U  H', WIDTH - 6 - 4 * 6, y + 7, C.STEEN);

    const wrong = faults(board, this.routes).find((f) => f.kind === 'verkeerdegroep');
    const message = wrong ? 'DAT IS DE VERKEERDE GROEP.' : this.level.praatje;
    screen.text(message, 6, y + 20, wrong ? C.ROESTROOD : C.ASGRIJS);
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
