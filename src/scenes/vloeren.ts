import { C } from '../engine/palette.ts';
import { WIDTH, HEIGHT, type Screen } from '../engine/screen.ts';
import type { Scene, SceneContext } from '../engine/scene.ts';
import type { Save } from '../engine/save.ts';
import { drawStar, STAR_W } from '../engine/ui.ts';
import { Dialogue } from './dialogue.ts';
import {
  type Legplan, type Vloer,
  breedte, faults, isSolved, naden, planken, restant, rijen, stars, totaalPlanken,
} from '../puzzles/vloeren/model.ts';
import { solve } from '../puzzles/vloeren/solver.ts';
import type { VloerLevel } from '../puzzles/vloeren/levels.ts';

const TOP_H = 16;
const BOTTOM_H = 30;

/** Everything a full plank, which breaks the joint rule at once. */
function volPlan(v: Vloer): Legplan {
  return v.vorm.map((r) => Math.min(v.plank, r.breedte));
}

/**
 * The floor from above, going down row by row. Click in a row to say where
 * its first plank ends; everything after that is full planks to the wall.
 * The off-cut travels to the next row and lights up when it is used, which is
 * the whole trick of laying a floor without a skip full of ends.
 *
 * The room is ragged, so each course sits on its own left wall and runs its
 * own width — the empty cells to either side are outside the room.
 */
export class VloerScene implements Scene {
  private readonly level: VloerLevel;
  private readonly save: Save;
  private readonly par: number;
  private readonly tile: number;
  private readonly originX: number;
  private readonly originY: number;

  private plan: Legplan;
  private time = 0;
  private won = false;
  private wonAt = 0;
  private uitleg: Dialogue | null;

  constructor(level: VloerLevel, save: Save) {
    this.level = level;
    this.save = save;
    this.par = solve(level.vloer).par;
    this.plan = volPlan(level.vloer);
    this.uitleg = new Dialogue(level.uitleg);

    const v = level.vloer;
    this.tile = Math.max(8, Math.min(
      Math.floor((HEIGHT - TOP_H - BOTTOM_H - 16) / rijen(v)),
      Math.floor((WIDTH - 40) / breedte(v)),
    ));
    this.originX = Math.round((WIDTH - breedte(v) * this.tile) / 2);
    this.originY = TOP_H + Math.round((HEIGHT - TOP_H - BOTTOM_H - rijen(v) * this.tile) / 2);
  }

  /** Which course the pointer is over, and the absolute floor cell under it. */
  private rijAt(ctx: SceneContext): { rij: number; ax: number } | null {
    const rij = Math.floor((ctx.input.mouseY - this.originY) / this.tile);
    if (!ctx.input.mouseOver || rij < 0 || rij >= rijen(this.level.vloer)) return null;
    const ax = Math.floor((ctx.input.mouseX - this.originX) / this.tile);
    return { rij, ax };
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
    if (ctx.input.justPressed('KeyR')) { this.plan = volPlan(this.level.vloer); return; }
    if (ctx.input.justPressed('KeyH')) {
      this.plan = solve(this.level.vloer).plan;
      this.check();
      return;
    }

    const hier = this.rijAt(ctx);
    if (hier && ctx.input.mouseClicked) {
      const rij = this.level.vloer.vorm[hier.rij]!;
      // A click outside this course's walls is in the empty corner: ignore it.
      if (hier.ax < rij.links || hier.ax >= rij.links + rij.breedte) return;
      // Clicking says where the first plank ends, measured from the left wall.
      const binnen = hier.ax - rij.links;
      this.plan[hier.rij] = Math.max(1, Math.min(this.level.vloer.plank, binnen + 1));
      this.check();
    }
  }

  private check(): void {
    if (this.won) return;
    if (isSolved(this.level.vloer, this.plan)) {
      this.won = true;
      this.wonAt = this.time;
      const gebruikt = totaalPlanken(this.level.vloer, this.plan);
      this.save.record(this.level.id, gebruikt, stars(gebruikt, this.par));
    }
  }

  render(screen: Screen, ctx: SceneContext): void {
    screen.clear(C.ROET);
    this.drawVloer(screen, ctx);
    this.drawTopBar(screen);
    this.drawBottomBar(screen);
    if (this.won) this.drawWon(screen);
    if (this.uitleg) this.uitleg.render(screen, this.time);
  }

  private drawVloer(screen: Screen, ctx: SceneContext): void {
    const v = this.level.vloer;
    const fouten = faults(v, this.plan);
    const slecht = new Set(fouten.filter((f) => f.kind === 'naad').map((f) => `${f.rij},${f.x}`));
    const over = this.rijAt(ctx);

    let aangereikt = 0;
    for (let r = 0; r < v.vorm.length; r++) {
      const rij = v.vorm[r]!;
      const eerste = this.plan[r] ?? Math.min(v.plank, rij.breedte);
      const hergebruikt = eerste === aangereikt && aangereikt > 0;
      const y = this.originY + r * this.tile;
      const lx = this.originX + rij.links * this.tile;

      // The boards themselves, alternating so the courses read apart.
      for (let x = 0; x < rij.breedte; x++) {
        const px = lx + x * this.tile;
        screen.fillRect(px, y, this.tile, this.tile, r % 2 === 0 ? C.MAHONIE : C.DONKERROOD);
        screen.fillRect(px, y, this.tile, 1, C.ROET);
      }
      // Grain, so it reads as wood rather than a grid.
      for (let x = 0; x < rij.breedte; x += 2) {
        screen.fillRect(lx + x * this.tile + 2, y + Math.floor(this.tile / 2), this.tile - 4, 1, C.ROET);
      }

      // The first plank, picked out, and lit when it came free from above.
      screen.fillRect(lx, y + 1, eerste * this.tile - 1, this.tile - 2, hergebruikt ? C.HOUT : C.MAHONIE);
      if (hergebruikt) {
        screen.ditherRect(lx, y + 1, eerste * this.tile - 1, this.tile - 2, C.HOUT, C.LICHTHOUT);
      }

      for (const naad of naden(v, r, eerste)) {
        const px = this.originX + naad * this.tile;
        const fout = slecht.has(`${r},${naad}`);
        screen.fillRect(px - 1, y + 1, 2, this.tile - 2, fout ? C.ROESTROOD : C.LICHTHOUT);
      }

      if (over && over.rij === r) {
        screen.strokeRect(lx, y, rij.breedte * this.tile, this.tile, C.WIT);
      }

      // What this row leaves for the next one, shown just past its right wall.
      const rest = restant(v, r, eerste);
      if (rest > 0 && r + 1 < v.vorm.length) {
        screen.fillRect(lx + rij.breedte * this.tile + 2, y + 2, rest * 2, this.tile - 4, C.LICHTHOUT);
      }
      screen.text(String(planken(v, r, eerste, aangereikt)),
        lx - 12, y + Math.floor(this.tile / 2) - 3, C.ASGRIJS);

      aangereikt = rest;
    }
  }

  private drawTopBar(screen: Screen): void {
    screen.fillRect(0, 0, WIDTH, TOP_H, C.ZWART);
    screen.fillRect(0, TOP_H - 1, WIDTH, 1, C.STEEN);
    screen.text(this.level.titel, 6, 5, C.LICHTOKER);
    const gebruikt = totaalPlanken(this.level.vloer, this.plan);
    const label = `PLANKEN ${String(gebruikt).padStart(2)}   PAR ${String(this.par).padStart(2)}`;
    screen.text(label, WIDTH - 6 - label.length * 6, 5, gebruikt > this.par ? C.ROESTROOD : C.SALIE);
  }

  private drawBottomBar(screen: Screen): void {
    const y = HEIGHT - BOTTOM_H;
    screen.fillRect(0, y, WIDTH, BOTTOM_H, C.ZWART);
    screen.fillRect(0, y, WIDTH, 1, C.STEEN);
    const slechteNaden = faults(this.level.vloer, this.plan).filter((f) => f.kind === 'naad').length;
    screen.text(slechteNaden > 0 ? `${slechteNaden} NADEN TE DICHT` : 'NADEN GOED', 6, y + 7,
      slechteNaden > 0 ? C.ROESTROOD : C.SALIE);
    screen.text('U  H', WIDTH - 6 - 4 * 6, y + 7, C.STEEN);
    screen.text(this.level.praatje, 6, y + 20, C.ASGRIJS);
    screen.text('R = OPNIEUW', WIDTH - 6 - 11 * 6, y + 20, C.STEEN);
  }

  private drawWon(screen: Screen): void {
    const gebruikt = totaalPlanken(this.level.vloer, this.plan);
    const got = stars(gebruikt, this.par);
    const w = 220;
    const h = 76;
    const x = Math.round((WIDTH - w) / 2);
    const y = Math.round((HEIGHT - h) / 2);
    screen.fillRect(x, y, w, h, C.ZWART);
    screen.strokeRect(x, y, w, h, C.LICHTOKER);
    screen.textCentered('VLOER LIGT', WIDTH / 2, y + 9, C.LICHTOKER);
    const span = 3 * STAR_W * 2 + 2 * 8;
    for (let i = 0; i < 3; i++) {
      drawStar(screen, Math.round((WIDTH - span) / 2) + i * (STAR_W * 2 + 8), y + 22, i < got, 2);
    }
    screen.textCentered(`${gebruikt} PLANKEN   PAR ${this.par}`, WIDTH / 2, y + 46, C.KALK);
    if (Math.floor(this.time * 2) % 2 === 0) {
      screen.textCentered('ENTER', WIDTH / 2, y + 60, C.SALIE);
    }
  }
}
