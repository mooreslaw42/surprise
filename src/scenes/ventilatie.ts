import { C } from '../engine/palette.ts';
import { WIDTH, HEIGHT, type Screen } from '../engine/screen.ts';
import type { Scene, SceneContext } from '../engine/scene.ts';
import type { Save } from '../engine/save.ts';
import { drawStar, STAR_W } from '../engine/ui.ts';
import { Dialogue } from './dialogue.ts';
import {
  CEL, type Point, type Route,
  begaanbaar, celAt, debietPerCel, faults, isSolved, kanaalLengte, samePoint, stars,
} from '../puzzles/ventilatie/model.ts';
import { solve } from '../puzzles/ventilatie/solver.ts';
import type { VentilatieLevel } from '../puzzles/ventilatie/levels.ts';

const TOP_H = 16;
const BOTTOM_H = 30;

/**
 * The ventilation plan, seen from above. A drawing rather than a job, which
 * is the point: it gets approved and then it does not arrive.
 */
export class VentilatieScene implements Scene {
  private readonly level: VentilatieLevel;
  private readonly save: Save;
  private readonly par: number;
  private readonly tile: number;
  private readonly originX: number;
  private readonly originY: number;

  private routes: Route[];
  private drawing: number | null = null;
  private time = 0;
  private won = false;
  private wonAt = 0;
  private uitleg: Dialogue | null;

  constructor(level: VentilatieLevel, save: Save) {
    this.level = level;
    this.save = save;
    this.par = solve(level.plan).par;
    this.routes = level.plan.roosters.map(() => []);
    this.uitleg = new Dialogue(level.uitleg);

    const plan = level.plan;
    this.tile = Math.max(6, Math.min(
      Math.floor((HEIGHT - TOP_H - BOTTOM_H - 8) / plan.height),
      Math.floor((WIDTH - 24) / plan.width),
    ));
    this.originX = Math.round((WIDTH - plan.width * this.tile) / 2);
    this.originY = TOP_H + Math.round((HEIGHT - TOP_H - BOTTOM_H - plan.height * this.tile) / 2);
  }

  private cellAt(ctx: SceneContext): Point | null {
    const p = {
      x: Math.floor((ctx.input.mouseX - this.originX) / this.tile),
      y: Math.floor((ctx.input.mouseY - this.originY) / this.tile),
    };
    if (!ctx.input.mouseOver || celAt(this.level.plan, p) === undefined) return null;
    return p;
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
    if (ctx.input.justPressed('KeyR')) this.routes = this.routes.map(() => []);
    if (ctx.input.justPressed('KeyH')) this.routes = solve(this.level.plan).routes;

    const cell = this.cellAt(ctx);
    if (ctx.input.mouseClicked && cell) {
      const rooster = this.level.plan.roosters.findIndex((r) => samePoint(r.cel, cell));
      if (rooster >= 0) {
        this.drawing = rooster;
        this.routes[rooster] = [cell];
      } else {
        const owner = this.routes.findIndex((r) => r.some((p) => samePoint(p, cell)));
        if (owner >= 0) this.routes[owner] = [];
      }
    }
    if (this.drawing !== null && cell) this.extend(this.drawing, cell);
    if (!ctx.input.mouseDown && this.drawing !== null) {
      const route = this.routes[this.drawing]!;
      if (route.length < 2 || !samePoint(route[route.length - 1]!, this.level.plan.wtw)) {
        this.routes[this.drawing] = [];
      }
      this.drawing = null;
    }
    this.check();
  }

  private extend(which: number, cell: Point): void {
    const route = this.routes[which]!;
    const head = route[route.length - 1];
    if (!head || samePoint(head, cell)) return;
    if (Math.abs(head.x - cell.x) + Math.abs(head.y - cell.y) !== 1) return;
    if (!begaanbaar(this.level.plan, cell)) return;
    if (route.length >= 2 && samePoint(route[route.length - 2]!, cell)) {
      route.pop();
      return;
    }
    if (route.some((p) => samePoint(p, cell))) return;
    // Another room's grille is a terminal, not a junction.
    if (this.level.plan.roosters.some((r, i) => i !== which && samePoint(r.cel, cell))) return;
    route.push(cell);
  }

  private check(): void {
    if (this.won) return;
    if (isSolved(this.level.plan, this.routes)) {
      this.won = true;
      this.wonAt = this.time;
      const lengte = kanaalLengte(this.level.plan, this.routes);
      this.save.record(this.level.id, lengte, stars(lengte, this.par));
    }
  }

  render(screen: Screen, ctx: SceneContext): void {
    screen.clear(C.ROET);
    this.drawPlan(screen);
    this.drawDucts(screen);
    this.drawFixtures(screen);
    if (!this.won && !this.uitleg) this.drawCursor(screen, ctx);
    this.drawTopBar(screen);
    this.drawBottomBar(screen);
    if (this.won) this.drawWon(screen);
    if (this.uitleg) this.uitleg.render(screen, this.time);
  }

  /** Graph paper: floor light, walls dark, as a drawing would be. */
  private drawPlan(screen: Screen): void {
    const plan = this.level.plan;
    screen.fillRect(this.originX - 4, this.originY - 4,
      plan.width * this.tile + 8, plan.height * this.tile + 8, C.DIEPBLAUW);
    for (let y = 0; y < plan.height; y++) {
      for (let x = 0; x < plan.width; x++) {
        const px = this.originX + x * this.tile;
        const py = this.originY + y * this.tile;
        if (celAt(plan, { x, y }) === CEL.MUUR) {
          screen.fillRect(px, py, this.tile, this.tile, C.DIEPBLAUW);
        } else {
          screen.fillRect(px, py, this.tile, this.tile, C.KALK);
          screen.fillRect(px, py, this.tile, 1, C.ZANDGRIJS);
          screen.fillRect(px, py, 1, this.tile, C.ZANDGRIJS);
        }
      }
    }
  }

  /** Duct, drawn thicker the more air it carries. */
  private drawDucts(screen: Screen): void {
    const plan = this.level.plan;
    const flow = debietPerCel(plan, this.routes);
    for (const [key, debiet] of flow) {
      const x = key % plan.width;
      const y = Math.floor(key / plan.width);
      const px = this.originX + x * this.tile;
      const py = this.originY + y * this.tile;
      const share = Math.min(1, debiet / plan.capaciteit);
      const thick = Math.max(3, Math.round(this.tile * (0.3 + 0.45 * share)));
      const off = Math.floor((this.tile - thick) / 2);
      const over = debiet > plan.capaciteit;
      screen.fillRect(px, py + off, this.tile, thick, over ? C.ROESTROOD : C.SALIE);
      screen.fillRect(px + off, py, thick, this.tile, over ? C.ROESTROOD : C.SALIE);
      screen.fillRect(px, py + off, this.tile, 1, over ? C.DONKERROOD : C.DONKERSALIE);
      screen.fillRect(px + off, py, 1, this.tile, over ? C.DONKERROOD : C.DONKERSALIE);
    }
  }

  private centre(p: Point): { x: number; y: number } {
    return {
      x: this.originX + p.x * this.tile + Math.floor(this.tile / 2),
      y: this.originY + p.y * this.tile + Math.floor(this.tile / 2),
    };
  }

  private drawFixtures(screen: Screen): void {
    const plan = this.level.plan;
    const w = this.centre(plan.wtw);
    screen.fillRect(w.x - 8, w.y - 7, 17, 15, C.ROET);
    screen.fillRect(w.x - 7, w.y - 6, 15, 13, C.ASGRIJS);
    screen.fillEllipse(w.x, w.y, 5, 5, C.ZANDGRIJS);
    // The fan, turning, which is the only part that ever worked.
    const spin = Math.floor(this.time * 6) % 2 === 0;
    screen.fillRect(w.x - 4, w.y - (spin ? 0 : 1), 9, 2, C.ROET);
    screen.fillRect(w.x - (spin ? 1 : 0), w.y - 4, 2, 9, C.ROET);
    screen.text('WTW', w.x - 8, w.y + 9, C.LICHTOKER);

    for (let i = 0; i < plan.roosters.length; i++) {
      const rooster = plan.roosters[i]!;
      const at = this.centre(rooster.cel);
      const done = this.routes[i]!.length > 1;
      screen.fillRect(at.x - 7, at.y - 6, 15, 13, C.ROET);
      screen.fillRect(at.x - 6, at.y - 5, 13, 11, done ? C.SALIE : C.ZANDGRIJS);
      for (let g = -3; g <= 3; g += 2) screen.fillRect(at.x - 5, at.y + g, 11, 1, C.ROET);
      screen.textCentered(`${rooster.debiet}`, at.x + 1, at.y + 8, C.WIT);
    }
  }

  private drawCursor(screen: Screen, ctx: SceneContext): void {
    const cell = this.cellAt(ctx);
    if (!cell) return;
    screen.strokeRect(this.originX + cell.x * this.tile, this.originY + cell.y * this.tile,
      this.tile, this.tile, begaanbaar(this.level.plan, cell) ? C.WIT : C.ROESTROOD);
  }

  private drawTopBar(screen: Screen): void {
    screen.fillRect(0, 0, WIDTH, TOP_H, C.ZWART);
    screen.fillRect(0, TOP_H - 1, WIDTH, 1, C.STEEN);
    screen.text(this.level.titel, 6, 5, C.LICHTOKER);
    const used = kanaalLengte(this.level.plan, this.routes);
    const label = `KANAAL ${String(used).padStart(3)}   PAR ${String(this.par).padStart(3)}`;
    screen.text(label, WIDTH - 6 - label.length * 6, 5, used > this.par ? C.ROESTROOD : C.SALIE);
  }

  private drawBottomBar(screen: Screen): void {
    const y = HEIGHT - BOTTOM_H;
    const plan = this.level.plan;
    screen.fillRect(0, y, WIDTH, BOTTOM_H, C.ZWART);
    screen.fillRect(0, y, WIDTH, 1, C.STEEN);
    const done = this.routes.filter((r) => r.length > 1).length;
    screen.text(`KANAAL MAX ${plan.capaciteit}   ${done}/${plan.roosters.length}`, 6, y + 7, C.KALK);
    screen.text('U  H', WIDTH - 6 - 4 * 6, y + 7, C.STEEN);

    const burst = faults(plan, this.routes).find((f) => f.kind === 'overbelast');
    const message = burst ? `TE VEEL LUCHT DOOR EEN KANAAL: ${burst.debiet}` : this.level.praatje;
    screen.text(message, 6, y + 20, burst ? C.ROESTROOD : C.ASGRIJS);
    screen.text('R = OPNIEUW', WIDTH - 6 - 11 * 6, y + 20, C.STEEN);
  }

  /** Approved, costed, and not delivered. */
  private drawWon(screen: Screen): void {
    const lengte = kanaalLengte(this.level.plan, this.routes);
    const got = stars(lengte, this.par);
    const w = 240;
    const h = 86;
    const x = Math.round((WIDTH - w) / 2);
    const y = Math.round((HEIGHT - h) / 2);
    screen.fillRect(x, y, w, h, C.ZWART);
    screen.strokeRect(x, y, w, h, C.MAGENTA);
    screen.textCentered('PLAN GOEDGEKEURD', WIDTH / 2, y + 9, C.LICHTOKER);
    const span = 3 * STAR_W * 2 + 2 * 8;
    for (let i = 0; i < 3; i++) {
      drawStar(screen, Math.round((WIDTH - span) / 2) + i * (STAR_W * 2 + 8), y + 22, i < got, 2);
    }
    screen.textCentered(`${lengte} METER KANAAL   PAR ${this.par}`, WIDTH / 2, y + 44, C.KALK);
    screen.fillRect(x + 8, y + 54, w - 16, 11, C.DONKERROOD);
    screen.textCentered(this.level.levering, WIDTH / 2, y + 56, C.WIT);
    if (Math.floor(this.time * 2) % 2 === 0) {
      screen.textCentered('ENTER', WIDTH / 2, y + 70, C.SALIE);
    }
  }
}
