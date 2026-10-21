import { C } from '../engine/palette.ts';
import { WIDTH, HEIGHT, type Screen } from '../engine/screen.ts';
import type { Scene, SceneContext } from '../engine/scene.ts';
import type { Save } from '../engine/save.ts';
import { drawStar, STAR_W } from '../engine/ui.ts';
import { Dialogue } from './dialogue.ts';
import {
  VAK, type Pad,
  faults, isSolved, pijpLengte, stars, stroom, vakAt, vrij,
} from '../puzzles/afvoer/model.ts';
import { solve } from '../puzzles/afvoer/solver.ts';
import type { AfvoerLevel } from '../puzzles/afvoer/levels.ts';

const TOP_H = 16;
const BOTTOM_H = 30;

/**
 * A section through the floor, appliances along the top and the stack at the
 * far end. The water is drawn running: it only ever goes right and down, and
 * it stops where the fall runs out, so the two rules show themselves instead
 * of being explained.
 */
export class AfvoerScene implements Scene {
  private readonly level: AfvoerLevel;
  private readonly save: Save;
  private readonly par: number;
  private readonly tile: number;
  private readonly originX: number;
  private readonly originY: number;

  private paden: Pad[];
  private tekent: number | null = null;
  private time = 0;
  private won = false;
  private wonAt = 0;
  private uitleg: Dialogue | null;

  constructor(level: AfvoerLevel, save: Save) {
    this.level = level;
    this.save = save;
    this.par = solve(level.doorsnede).par;
    this.paden = level.doorsnede.apparaten.map((a) => [{ x: a.x, y: a.y }]);
    this.uitleg = new Dialogue(level.uitleg);

    const d = level.doorsnede;
    // Room above the section for the appliances and their names.
    this.tile = Math.max(8, Math.min(
      Math.floor((HEIGHT - TOP_H - BOTTOM_H - 34) / d.height),
      Math.floor((WIDTH - 24) / d.width),
    ));
    this.originX = Math.round((WIDTH - d.width * this.tile) / 2);
    this.originY = TOP_H + 26;
  }

  private celAt(ctx: SceneContext): { x: number; y: number } | null {
    const d = this.level.doorsnede;
    const x = Math.floor((ctx.input.mouseX - this.originX) / this.tile);
    const y = Math.floor((ctx.input.mouseY - this.originY) / this.tile);
    if (!ctx.input.mouseOver || x < 0 || y < 0 || x >= d.width || y >= d.height) return null;
    return { x, y };
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
      this.paden = this.level.doorsnede.apparaten.map((a) => [{ x: a.x, y: a.y }]);
      return;
    }
    if (ctx.input.justPressed('KeyH')) {
      this.paden = solve(this.level.doorsnede).paden;
      this.check();
      return;
    }

    const cel = this.celAt(ctx);
    if (ctx.input.mouseClicked && cel) {
      const bij = this.level.doorsnede.apparaten.findIndex((a) => a.x === cel.x && a.y === cel.y);
      if (bij >= 0) {
        this.tekent = bij;
        this.paden[bij] = [{ x: cel.x, y: cel.y }];
      } else {
        const eigenaar = this.paden.findIndex((p) => p.some((q) => q.x === cel.x && q.y === cel.y));
        if (eigenaar >= 0) this.paden[eigenaar] = [{ ...this.level.doorsnede.apparaten[eigenaar]! }];
      }
    }
    if (this.tekent !== null && cel) this.verleng(this.tekent, cel);
    if (this.tekent !== null && !ctx.input.mouseDown) {
      this.tekent = null;
      this.check();
    }
  }

  /** Follows the mouse, but only ever right and down. */
  private verleng(which: number, cel: { x: number; y: number }): void {
    const d = this.level.doorsnede;
    const pad = this.paden[which]!;
    const kop = pad[pad.length - 1]!;
    if (kop.x === cel.x && kop.y === cel.y) return;
    if (Math.abs(kop.x - cel.x) + Math.abs(kop.y - cel.y) !== 1) return;
    if (pad.length >= 2) {
      const vorige = pad[pad.length - 2]!;
      if (vorige.x === cel.x && vorige.y === cel.y) { pad.pop(); return; }
    }
    if (cel.x < kop.x || cel.y < kop.y) return;        // never uphill
    if (!vrij(d, cel.x, cel.y)) return;
    if (pad.some((p) => p.x === cel.x && p.y === cel.y)) return;
    pad.push({ x: cel.x, y: cel.y });
  }

  private check(): void {
    if (this.won) return;
    if (isSolved(this.level.doorsnede, this.paden)) {
      this.won = true;
      this.wonAt = this.time;
      const lengte = pijpLengte(this.level.doorsnede, this.paden);
      this.save.record(this.level.id, lengte, stars(lengte, this.par));
    }
  }

  render(screen: Screen, ctx: SceneContext): void {
    screen.clear(C.ROET);
    this.drawVloer(screen);
    this.drawBuizen(screen);
    this.drawApparaten(screen);
    if (!this.won && !this.uitleg) this.drawCursor(screen, ctx);
    this.drawTopBar(screen);
    this.drawBottomBar(screen);
    if (this.won) this.drawWon(screen);
    if (this.uitleg) this.uitleg.render(screen, this.time);
  }

  /** The floor build-up in section: screed, joists, and the stack at the end. */
  private drawVloer(screen: Screen): void {
    const d = this.level.doorsnede;
    const w = d.width * this.tile;
    const h = d.height * this.tile;
    screen.fillRect(this.originX, this.originY, w, h, C.STEEN);
    screen.ditherRect(this.originX, this.originY, w, h, C.STEEN, C.ROET);
    // The floor you stand on, above the section.
    screen.fillRect(this.originX, this.originY - 4, w, 4, C.LICHTHOUT);
    screen.fillRect(this.originX, this.originY - 4, w, 1, C.WIT);

    for (let y = 0; y < d.height; y++) {
      for (let x = 0; x < d.width; x++) {
        const px = this.originX + x * this.tile;
        const py = this.originY + y * this.tile;
        const vak = vakAt(d, x, y);
        if (vak === VAK.BALK) {
          screen.fillRect(px, py, this.tile, this.tile, C.HOUT);
          screen.fillRect(px, py, this.tile, 1, C.LICHTHOUT);
          screen.fillRect(px, py + this.tile - 1, this.tile, 1, C.ROET);
          screen.fillRect(px + 2, py + 3, this.tile - 4, 1, C.DONKEROKER);
        } else {
          screen.fillRect(px, py, 1, 1, C.ASGRIJS);
        }
      }
    }

    // The standleiding, running off down out of the section.
    const sx = this.originX + d.stand.x * this.tile;
    const sy = this.originY + d.stand.y * this.tile;
    screen.fillRect(sx + 1, sy, this.tile - 2, this.tile + 6, C.ASGRIJS);
    screen.fillRect(sx + 2, sy, this.tile - 4, this.tile + 6, C.ZANDGRIJS);
    screen.fillRect(sx + 1, sy, this.tile - 2, 2, C.STEEN);
    screen.text('S', sx + Math.floor(this.tile / 2) - 2, sy + this.tile + 7, C.LICHTOKER);
  }

  private midden(p: { x: number; y: number }): { x: number; y: number } {
    return {
      x: this.originX + p.x * this.tile + Math.floor(this.tile / 2),
      y: this.originY + p.y * this.tile + Math.floor(this.tile / 2),
    };
  }

  /** Pipe, with the water drawn as far as it actually gets. */
  private drawBuizen(screen: Screen): void {
    const d = this.level.doorsnede;
    for (let i = 0; i < this.paden.length; i++) {
      const pad = this.paden[i]!;
      const { tot } = stroom(d, pad);
      for (let s = 1; s < pad.length; s++) {
        const a = this.midden(pad[s - 1]!);
        const b = this.midden(pad[s]!);
        const nat = s <= tot;
        // Drawn three deep so a run reads as pipe rather than a hairline.
        for (const off of [-1, 0, 1]) {
          const zij = Math.abs(a.x - b.x) > 0 ? 0 : off;
          const op = Math.abs(a.y - b.y) > 0 ? 0 : off;
          screen.line(a.x + zij, a.y + op, b.x + zij, b.y + op, C.ASGRIJS);
        }
        screen.line(a.x, a.y, b.x, b.y, C.ZANDGRIJS);
        if (nat) {
          // Water, shuffling along so it reads as running.
          const faseA = (s + Math.floor(this.time * 6)) % 3;
          screen.line(a.x, a.y, b.x, b.y, faseA === 0 ? C.LICHTSALIE : C.LUCHTBLAUW);
        }
      }
      // Where it stops, if it does.
      if (tot < pad.length - 1 && pad.length > 1) {
        const stop = this.midden(pad[Math.min(tot, pad.length - 1)]!);
        if (Math.floor(this.time * 4) % 2 === 0) {
          screen.fillRect(stop.x - 2, stop.y - 2, 5, 5, C.ROESTROOD);
        }
      }
    }
  }

  private drawApparaten(screen: Screen): void {
    const d = this.level.doorsnede;
    d.apparaten.forEach((a, i) => {
      const px = this.originX + a.x * this.tile;
      const py = this.originY + a.y * this.tile;
      const klaar = faults(d, this.paden).every((f) => f.which !== i);
      screen.fillRect(px, py - 12, this.tile, 12, C.WIT);
      screen.strokeRect(px, py - 12, this.tile, 12, klaar ? C.SALIE : C.ASGRIJS);
      screen.fillRect(px + 2, py - 9, this.tile - 4, 3, C.LUCHTBLAUW);
      screen.fillRect(px + Math.floor(this.tile / 2) - 1, py - 4, 3, 4, C.ASGRIJS);
      // Names alternate height so neighbouring ones do not collide.
      const naam = a.naam.slice(0, 8);
      const nx = Math.max(2, Math.min(WIDTH - 2 - naam.length * 6, px - 6));
      screen.text(naam, nx, py - (i % 2 === 0 ? 22 : 15), klaar ? C.SALIE : C.ASGRIJS);
    });
  }

  private drawCursor(screen: Screen, ctx: SceneContext): void {
    const cel = this.celAt(ctx);
    if (!cel) return;
    screen.strokeRect(this.originX + cel.x * this.tile, this.originY + cel.y * this.tile,
      this.tile, this.tile, vrij(this.level.doorsnede, cel.x, cel.y) ? C.WIT : C.ROESTROOD);
  }

  private drawTopBar(screen: Screen): void {
    screen.fillRect(0, 0, WIDTH, TOP_H, C.ZWART);
    screen.fillRect(0, TOP_H - 1, WIDTH, 1, C.STEEN);
    screen.text(this.level.titel, 6, 5, C.LICHTOKER);
    const lengte = pijpLengte(this.level.doorsnede, this.paden);
    const label = `BUIS ${String(lengte).padStart(2)}   PAR ${String(this.par).padStart(2)}`;
    screen.text(label, WIDTH - 6 - label.length * 6, 5, lengte > this.par ? C.ROESTROOD : C.SALIE);
  }

  private drawBottomBar(screen: Screen): void {
    const y = HEIGHT - BOTTOM_H;
    const d = this.level.doorsnede;
    screen.fillRect(0, y, WIDTH, BOTTOM_H, C.ZWART);
    screen.fillRect(0, y, WIDTH, 1, C.STEEN);
    const fouten = faults(d, this.paden);
    const af = d.apparaten.length - new Set(fouten.map((f) => f.which)).size;
    screen.text(`AFGEVOERD ${af}/${d.apparaten.length}`, 6, y + 7, af === d.apparaten.length ? C.SALIE : C.KALK);
    screen.text('U  H', WIDTH - 6 - 4 * 6, y + 7, C.STEEN);

    const vlak = fouten.find((f) => f.kind === 'vlak');
    const balk = fouten.find((f) => f.kind === 'doorbalk');
    const bericht = vlak ? 'TE LANG VLAK. HIJ MOET WEER ZAKKEN.'
      : balk ? 'DAAR LIGT EEN BALK.'
        : this.level.praatje;
    screen.text(bericht, 6, y + 20, vlak || balk ? C.ROESTROOD : C.ASGRIJS);
    screen.text('R = OPNIEUW', WIDTH - 6 - 11 * 6, y + 20, C.STEEN);
  }

  private drawWon(screen: Screen): void {
    const lengte = pijpLengte(this.level.doorsnede, this.paden);
    const got = stars(lengte, this.par);
    const w = 220;
    const h = 76;
    const x = Math.round((WIDTH - w) / 2);
    const y = Math.round((HEIGHT - h) / 2);
    screen.fillRect(x, y, w, h, C.ZWART);
    screen.strokeRect(x, y, w, h, C.LICHTOKER);
    screen.textCentered('HET LOOPT', WIDTH / 2, y + 9, C.LICHTOKER);
    const span = 3 * STAR_W * 2 + 2 * 8;
    for (let i = 0; i < 3; i++) {
      drawStar(screen, Math.round((WIDTH - span) / 2) + i * (STAR_W * 2 + 8), y + 22, i < got, 2);
    }
    screen.textCentered(`${lengte} BUIS   PAR ${this.par}`, WIDTH / 2, y + 46, C.KALK);
    if (Math.floor(this.time * 2) % 2 === 0) {
      screen.textCentered('ENTER', WIDTH / 2, y + 60, C.SALIE);
    }
  }
}
