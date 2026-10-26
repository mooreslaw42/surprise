import { C } from '../engine/palette.ts';
import { WIDTH, HEIGHT, type Screen } from '../engine/screen.ts';
import type { Scene, SceneContext } from '../engine/scene.ts';
import type { Save } from '../engine/save.ts';
import { drawStar, STAR_W } from '../engine/ui.ts';
import { Dialogue } from './dialogue.ts';
import {
  type Plaatsing, type Vorm,
  draaiVorm, faults, isSolved, periode, stars, totaalRc,
} from '../puzzles/isolatie/model.ts';
import { solve } from '../puzzles/isolatie/solver.ts';
import type { IsolatieLevel } from '../puzzles/isolatie/levels.ts';

const TOP_H = 16;
const BOTTOM_H = 30;
const TRAY_H = 34;

/**
 * The stud cavity, and the stack of wool beside it. Pick a batt up, turn it,
 * drop it in. Full means full: a gap is a koudebrug and the wall does not
 * pass until there is not one left.
 */
export class IsolatieScene implements Scene {
  private readonly level: IsolatieLevel;
  private readonly save: Save;
  private readonly par: number;
  private readonly tile: number;
  private readonly originX: number;
  private readonly originY: number;

  private plaatsingen: Plaatsing[] = [];
  /** The batt in hand, if any, and how far it has been turned. */
  private vast: { deken: number; draai: number } | null = null;
  private time = 0;
  private won = false;
  private wonAt = 0;
  private uitleg: Dialogue | null;

  constructor(level: IsolatieLevel, save: Save) {
    this.level = level;
    this.save = save;
    this.par = solve(level.muur).par;
    this.uitleg = new Dialogue(level.uitleg);

    const muur = level.muur;
    const ruimte = HEIGHT - TOP_H - BOTTOM_H - TRAY_H - 8;
    this.tile = Math.max(8, Math.min(
      Math.floor(ruimte / muur.height),
      Math.floor((WIDTH - 40) / muur.width),
    ));
    this.originX = Math.round((WIDTH - muur.width * this.tile) / 2);
    this.originY = TOP_H + Math.round((ruimte - muur.height * this.tile) / 2) + 4;
  }

  private get trayY(): number {
    return HEIGHT - BOTTOM_H - TRAY_H;
  }

  /** Which batt in the stack the pointer is over, or -1. */
  private trayAt(ctx: SceneContext): number {
    if (ctx.input.mouseY < this.trayY || ctx.input.mouseY > this.trayY + TRAY_H) return -1;
    const slot = Math.floor((ctx.input.mouseX - 4) / 30);
    const vrij = this.vrijeDekens();
    return slot >= 0 && slot < vrij.length ? vrij[slot]! : -1;
  }

  private vrijeDekens(): number[] {
    const gebruikt = new Set(this.plaatsingen.map((p) => p.deken));
    return this.level.muur.dekens.map((_, i) => i).filter((i) => !gebruikt.has(i));
  }

  private celAt(ctx: SceneContext): { x: number; y: number } | null {
    const x = Math.floor((ctx.input.mouseX - this.originX) / this.tile);
    const y = Math.floor((ctx.input.mouseY - this.originY) / this.tile);
    if (x < 0 || y < 0 || x >= this.level.muur.width || y >= this.level.muur.height) return null;
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
      if (this.vast) {
        const vorm = this.level.muur.dekens[this.vast.deken]!.vorm;
        this.vast = { ...this.vast, draai: (this.vast.draai + 1) % periode(vorm) };
      } else {
        this.plaatsingen = [];
      }
      return;
    }
    if (ctx.input.justPressed('KeyH')) {
      this.plaatsingen = solve(this.level.muur).plaatsingen;
      this.vast = null;
      this.check();
      return;
    }

    if (!ctx.input.mouseClicked) return;

    // Taking one out of the wall puts it back in hand.
    const cel = this.celAt(ctx);
    if (cel) {
      const index = cel.y * this.level.muur.width + cel.x;
      const zit = this.plaatsingen.findIndex((p) => this.cellen(p).includes(index));
      if (zit >= 0 && !this.vast) {
        const uit = this.plaatsingen[zit]!;
        this.plaatsingen.splice(zit, 1);
        this.vast = { deken: uit.deken, draai: uit.draai };
        return;
      }
      if (this.vast) {
        const poging: Plaatsing = { deken: this.vast.deken, draai: this.vast.draai, x: cel.x, y: cel.y };
        if (this.past(poging)) {
          this.plaatsingen.push(poging);
          this.vast = null;
          this.check();
        }
        return;
      }
    }

    const uitStapel = this.trayAt(ctx);
    if (uitStapel >= 0) this.vast = { deken: uitStapel, draai: 0 };
    else if (this.vast && !cel) this.vast = null;      // dropped outside: put it back
  }

  private cellen(p: Plaatsing): number[] {
    const deken = this.level.muur.dekens[p.deken]!;
    return draaiVorm(deken.vorm, p.draai)
      .map(([dx, dy]) => (p.y + dy) * this.level.muur.width + (p.x + dx));
  }

  /** A batt only goes in if every cell of it is bare cavity. */
  private past(p: Plaatsing): boolean {
    const muur = this.level.muur;
    const vorm = draaiVorm(muur.dekens[p.deken]!.vorm, p.draai);
    const bezet = new Set(this.plaatsingen.flatMap((q) => this.cellen(q)));
    return vorm.every(([dx, dy]) => {
      const x = p.x + dx;
      const y = p.y + dy;
      if (x < 0 || y < 0 || x >= muur.width || y >= muur.height) return false;
      const cel = y * muur.width + x;
      return muur.doel[cel] && !bezet.has(cel);
    });
  }

  private check(): void {
    if (this.won) return;
    if (isSolved(this.level.muur, this.plaatsingen)) {
      this.won = true;
      this.wonAt = this.time;
      const rc = totaalRc(this.level.muur, this.plaatsingen);
      this.save.record(this.level.id, rc, stars(rc, this.par));
    }
  }

  render(screen: Screen, ctx: SceneContext): void {
    screen.clear(C.ROET);
    this.drawCavity(screen);
    this.drawGeplaatst(screen);
    this.drawTray(screen, ctx);
    if (!this.won && !this.uitleg) this.drawInHand(screen, ctx);
    this.drawTopBar(screen);
    this.drawBottomBar(screen);
    if (this.won) this.drawWon(screen);
    if (this.uitleg) this.uitleg.render(screen, this.time);
  }

  /** Studs either side, the bare cavity between them. */
  private drawCavity(screen: Screen): void {
    const muur = this.level.muur;
    for (let y = 0; y < muur.height; y++) {
      for (let x = 0; x < muur.width; x++) {
        const px = this.originX + x * this.tile;
        const py = this.originY + y * this.tile;
        if (muur.doel[y * muur.width + x]) {
          screen.fillRect(px, py, this.tile, this.tile, C.ROET);
          screen.ditherRect(px + 1, py + 1, this.tile - 2, this.tile - 2, C.STEEN, C.ROET);
        } else {
          screen.fillRect(px, py, this.tile, this.tile, C.HOUT);
          screen.fillRect(px, py, this.tile, 1, C.LICHTHOUT);
          screen.fillRect(px, py + this.tile - 1, this.tile, 1, C.STEEN);
        }
      }
    }
    screen.strokeRect(this.originX - 1, this.originY - 1,
      muur.width * this.tile + 2, muur.height * this.tile + 2, C.LICHTHOUT);
  }

  private woolColour(i: number): { body: number; edge: number; schaduw: number } {
    // Richer wool for the batts worth more Rc, so value reads off the wall.
    // The edge is kept well darker than the body: at a glance a run of batts
    // in the same wool otherwise reads as one lump.
    const rc = this.level.muur.dekens[i]!.rc / Math.max(1, this.level.muur.dekens[i]!.vorm.length);
    if (rc >= 14) return { body: C.LICHTOKER, edge: C.DONKEROKER, schaduw: C.OKER };
    if (rc >= 11) return { body: C.BOTERGEEL, edge: C.DONKEROKER, schaduw: C.OKER };
    return { body: C.ZANDGRIJS, edge: C.STEEN, schaduw: C.ASGRIJS };
  }

  private drawVorm(screen: Screen, vorm: Vorm, px: number, py: number, tile: number, i: number): void {
    const { body, edge, schaduw } = this.woolColour(i);
    const cells = new Set(vorm.map(([x, y]) => `${x},${y}`));
    for (const [dx, dy] of vorm) {
      const x = px + dx * tile;
      const y = py + dy * tile;
      screen.fillRect(x, y, tile, tile, body);
      screen.ditherRect(x + 1, y + 1, tile - 2, tile - 2, body, schaduw);
      // Outline only where the batt actually ends.
      if (!cells.has(`${dx},${dy - 1}`)) screen.fillRect(x, y, tile, 1, edge);
      if (!cells.has(`${dx},${dy + 1}`)) screen.fillRect(x, y + tile - 1, tile, 1, edge);
      if (!cells.has(`${dx - 1},${dy}`)) screen.fillRect(x, y, 1, tile, edge);
      if (!cells.has(`${dx + 1},${dy}`)) screen.fillRect(x + tile - 1, y, 1, tile, edge);
    }
  }

  private drawGeplaatst(screen: Screen): void {
    for (const p of this.plaatsingen) {
      const vorm = draaiVorm(this.level.muur.dekens[p.deken]!.vorm, p.draai);
      this.drawVorm(screen, vorm, this.originX + p.x * this.tile,
        this.originY + p.y * this.tile, this.tile, p.deken);
    }
  }

  private drawTray(screen: Screen, ctx: SceneContext): void {
    const y = this.trayY;
    screen.fillRect(0, y, WIDTH, TRAY_H, C.ZWART);
    screen.fillRect(0, y, WIDTH, 1, C.STEEN);
    const vrij = this.vrijeDekens();
    const over = this.trayAt(ctx);
    vrij.forEach((i, slot) => {
      const x = 4 + slot * 30;
      if (x + 28 > WIDTH) return;
      const deken = this.level.muur.dekens[i]!;
      if (i === over) screen.fillRect(x - 1, y + 2, 29, TRAY_H - 4, C.STEEN);
      this.drawVorm(screen, draaiVorm(deken.vorm, 0), x + 2, y + 4, 5, i);
      screen.text(String(Math.round(deken.rc / 10)), x + 2, y + TRAY_H - 10, C.KALK);
    });
  }

  private drawInHand(screen: Screen, ctx: SceneContext): void {
    if (!this.vast) return;
    const deken = this.level.muur.dekens[this.vast.deken]!;
    const vorm = draaiVorm(deken.vorm, this.vast.draai);
    const cel = this.celAt(ctx);
    if (cel) {
      const poging: Plaatsing = { deken: this.vast.deken, draai: this.vast.draai, x: cel.x, y: cel.y };
      const px = this.originX + cel.x * this.tile;
      const py = this.originY + cel.y * this.tile;
      this.drawVorm(screen, vorm, px, py, this.tile, this.vast.deken);
      if (!this.past(poging)) {
        for (const [dx, dy] of vorm) {
          screen.strokeRect(px + dx * this.tile, py + dy * this.tile, this.tile, this.tile, C.ROESTROOD);
        }
      }
    } else {
      this.drawVorm(screen, vorm, ctx.input.mouseX - 4, ctx.input.mouseY - 4, 6, this.vast.deken);
    }
  }

  private drawTopBar(screen: Screen): void {
    screen.fillRect(0, 0, WIDTH, TOP_H, C.ZWART);
    screen.fillRect(0, TOP_H - 1, WIDTH, 1, C.STEEN);
    screen.text(`${this.level.ruimte} - ${this.level.vlak}`, 6, 5, C.LICHTOKER);
    const rc = totaalRc(this.level.muur, this.plaatsingen);
    const label = `RC ${(rc / 10).toFixed(1)}   DOEL ${(this.level.muur.doelRc / 10).toFixed(1)}`;
    screen.text(label, WIDTH - 6 - label.length * 6,
      5, rc >= this.level.muur.doelRc ? C.SALIE : C.ASGRIJS);
  }

  private drawBottomBar(screen: Screen): void {
    const y = HEIGHT - BOTTOM_H;
    screen.fillRect(0, y, WIDTH, BOTTOM_H, C.ZWART);
    screen.fillRect(0, y, WIDTH, 1, C.STEEN);
    const gaten = faults(this.level.muur, this.plaatsingen).filter((f) => f.kind === 'gat').length;
    screen.text(gaten > 0 ? `${gaten} OPEN` : 'VOL', 6, y + 7, gaten > 0 ? C.ROESTROOD : C.SALIE);
    screen.text(`BESTE RC ${(this.par / 10).toFixed(1)}`, 52, y + 7, C.STEEN);
    screen.text('U  H', WIDTH - 6 - 4 * 6, y + 7, C.STEEN);
    screen.text(this.level.praatje, 6, y + 20, C.ASGRIJS);
    screen.text(this.vast ? 'R = DRAAIEN' : 'R = LEEGHALEN', WIDTH - 6 - 13 * 6, y + 20, C.STEEN);
  }

  private drawWon(screen: Screen): void {
    const rc = totaalRc(this.level.muur, this.plaatsingen);
    const got = stars(rc, this.par);
    const w = 220;
    const h = 76;
    const x = Math.round((WIDTH - w) / 2);
    const y = Math.round((HEIGHT - h) / 2);
    screen.fillRect(x, y, w, h, C.ZWART);
    screen.strokeRect(x, y, w, h, C.LICHTOKER);
    screen.textCentered('DICHT', WIDTH / 2, y + 9, C.LICHTOKER);
    const span = 3 * STAR_W * 2 + 2 * 8;
    for (let i = 0; i < 3; i++) {
      drawStar(screen, Math.round((WIDTH - span) / 2) + i * (STAR_W * 2 + 8), y + 22, i < got, 2);
    }
    screen.textCentered(`RC ${(rc / 10).toFixed(1)}   BESTE ${(this.par / 10).toFixed(1)}`,
      WIDTH / 2, y + 46, C.KALK);
    if (Math.floor(this.time * 2) % 2 === 0) {
      screen.textCentered('ENTER', WIDTH / 2, y + 60, C.SALIE);
    }
  }
}
