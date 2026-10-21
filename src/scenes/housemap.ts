import { C } from '../engine/palette.ts';
import { WIDTH, HEIGHT, type Screen } from '../engine/screen.ts';
import type { Scene, SceneContext } from '../engine/scene.ts';
import type { Save } from '../engine/save.ts';
import { ROOM_NAMES } from '../data/house.ts';
import { drawStar, STAR_W } from '../engine/ui.ts';
import { SLOOP_LEVELS } from '../puzzles/sloop/levels.ts';
import { ELEKTRA_LEVELS } from '../puzzles/elektra/levels.ts';
import { STAGES } from '../data/stages.ts';
import { LevelScene } from './level.ts';
import { ElektraScene } from './elektra.ts';
import { SchuifScene } from './schuifwerk.ts';
import { SCHUIF_LEVELS } from '../puzzles/schuifwerk/levels.ts';
import { KanalenScene } from './kanalen.ts';
import { IsolatieScene } from './isolatie.ts';
import { ISOLATIE_LEVELS } from '../puzzles/isolatie/levels.ts';
import { VloerScene } from './vloeren.ts';
import { VLOER_LEVELS } from '../puzzles/vloeren/levels.ts';
import { SchilderScene } from './schilderen.ts';
import { SCHILDER_LEVELS } from '../puzzles/schilderen/levels.ts';
import { KANAAL_LEVELS } from '../puzzles/kanalen/levels.ts';

const CARD_W = 112;
const CARD_Y = 34;
const GAP = 7;
const PER_ROW = 3;
const FOOTER = 26;
const MAX_CARD_H = 66;

/**
 * Pick a room. Free order within a stage; the stage itself is gated, which is
 * the whole joke, so the next one stays shut until all three are done.
 */
export class HouseMapScene implements Scene {
  private readonly save: Save;
  private selected = 0;
  private stage = 0;
  private time = 0;

  constructor(save: Save) {
    this.save = save;
    // Drop the player at the furthest stage they have opened.
    while (this.stage + 1 < STAGES.length && this.stageDone(this.stage)) this.stage++;
  }

  private entries() {
    return STAGES[this.stage]!.entries;
  }

  private stageDone(stage: number): boolean {
    return STAGES[stage]!.entries.every((e) => this.save.isDone(e.id));
  }

  /**
   * Rows of three, with the cards shrinking to fit however many rows that
   * takes. Nine walls no longer fit at a fixed height.
   */
  private cardHeight(): number {
    const rows = Math.ceil(this.entries().length / PER_ROW);
    const room = HEIGHT - CARD_Y - FOOTER - (rows - 1) * GAP;
    return Math.min(MAX_CARD_H, Math.floor(room / rows));
  }

  private cardPos(i: number): { x: number; y: number } {
    const n = this.entries().length;
    const row = Math.floor(i / PER_ROW);
    const inRow = Math.min(PER_ROW, n - row * PER_ROW);
    const total = inRow * CARD_W + (inRow - 1) * GAP;
    return {
      x: Math.round((WIDTH - total) / 2) + (i % PER_ROW) * (CARD_W + GAP),
      y: CARD_Y + row * (this.cardHeight() + GAP),
    };
  }

  update(dt: number, ctx: SceneContext): void {
    this.time += dt;
    const n = this.entries().length;
    if (ctx.input.justPressed('Tab')) {
      // Only ever forward into a stage that has actually been unlocked.
      if (this.stage + 1 < STAGES.length && this.stageDone(this.stage)) this.stage++;
      else if (this.stage > 0) this.stage--;
      this.selected = 0;
      return;
    }
    if (ctx.input.justPressed('ArrowLeft')) this.selected = (this.selected + n - 1) % n;
    if (ctx.input.justPressed('ArrowRight')) this.selected = (this.selected + 1) % n;
    if (ctx.input.justPressed('ArrowUp')) this.selected = (this.selected + n - PER_ROW) % n;
    if (ctx.input.justPressed('ArrowDown')) this.selected = (this.selected + PER_ROW) % n;
    if (ctx.input.justPressed('Escape')) ctx.pop();

    for (let i = 0; i < n; i++) {
      const { x, y } = this.cardPos(i);
      const inside = ctx.input.mouseOver &&
        ctx.input.mouseX >= x && ctx.input.mouseX < x + CARD_W &&
        ctx.input.mouseY >= y && ctx.input.mouseY < y + this.cardHeight();
      if (inside) {
        this.selected = i;
        if (ctx.input.mouseClicked) this.open(ctx, i);
      }
    }
    if (ctx.input.confirmed()) this.open(ctx, this.selected);
  }

  private open(ctx: SceneContext, index: number): void {
    const entry = this.entries()[index];
    if (!entry) return;
    const kind = STAGES[this.stage]!.kind;
    if (kind === 'sloop') {
      const level = SLOOP_LEVELS.find((l) => l.id === entry.id);
      if (level) ctx.push(new LevelScene(level, this.save));
    } else if (kind === 'leeghalen') {
      const level = SCHUIF_LEVELS.find((l) => l.id === entry.id);
      if (level) ctx.push(new SchuifScene(level, this.save));
    } else if (kind === 'isolatie') {
      const level = ISOLATIE_LEVELS.find((l) => l.id === entry.id);
      if (level) ctx.push(new IsolatieScene(level, this.save));
    } else if (kind === 'vloeren') {
      const level = VLOER_LEVELS.find((l) => l.id === entry.id);
      if (level) ctx.push(new VloerScene(level, this.save));
    } else if (kind === 'schilderen') {
      const level = SCHILDER_LEVELS.find((l) => l.id === entry.id);
      if (level) ctx.push(new SchilderScene(level, this.save));
    } else if (kind === 'kanalen') {
      const level = KANAAL_LEVELS.find((l) => l.id === entry.id);
      if (level) ctx.push(new KanalenScene(level, this.save));
    } else {
      const level = ELEKTRA_LEVELS.find((l) => l.id === entry.id);
      if (level) ctx.push(new ElektraScene(level, this.save));
    }
  }

  render(screen: Screen, _ctx: SceneContext): void {
    screen.clear(C.ROET);
    screen.ditherRect(0, 0, WIDTH, HEIGHT, C.ROET, C.ZWART);

    screen.fillRect(0, 0, WIDTH, 20, C.ZWART);
    screen.fillRect(0, 19, WIDTH, 1, C.STEEN);
    const stage = STAGES[this.stage]!;
    screen.text(
      stage.tussendoor ? `TUSSENDOOR - ${stage.naam} ${stage.nummer}` : `FASE ${stage.nummer} - ${stage.naam}`,
      6, 7, stage.tussendoor ? C.MAGENTA : C.LICHTOKER,
    );

    const entries = this.entries();
    const done = entries.filter((e) => this.save.isDone(e.id)).length;
    const label = `${done} / ${entries.length} RUIMTES`;
    screen.text(label, WIDTH - 6 - label.length * 6, 7, done === entries.length ? C.SALIE : C.ASGRIJS);

    for (let i = 0; i < entries.length; i++) this.drawCard(screen, i);

    const gated = done < entries.length;
    const next = STAGES[this.stage + 1];
    screen.fillRect(0, HEIGHT - 26, WIDTH, 26, C.ZWART);
    screen.fillRect(0, HEIGHT - 26, WIDTH, 1, C.STEEN);
    const volgende = next
      ? (next.tussendoor ? `${next.naam} ${next.nummer}` : `FASE ${next.nummer} - ${next.naam}`)
      : '';
    const footer = next
      ? (gated ? `${volgende}: EERST ALLES HIER` : `${volgende} IS OPEN. TAB.`)
      : 'LAATSTE FASE';
    screen.textCentered(footer, WIDTH / 2, HEIGHT - 19, gated ? C.STEEN : C.SALIE);
    screen.textCentered('PIJLTJES = KIEZEN   ENTER = AAN DE SLAG', WIDTH / 2, HEIGHT - 9, C.ASGRIJS);
  }

  private drawCard(screen: Screen, i: number): void {
    const level = this.entries()[i]!;
    const { x, y } = this.cardPos(i);
    const cardH = this.cardHeight();
    const active = i === this.selected;
    const record = this.save.get(level.id);

    screen.fillRect(x, y, CARD_W, cardH, C.ZWART);
    screen.strokeRect(x, y, CARD_W, cardH, active ? C.LICHTOKER : C.STEEN);
    if (active) screen.strokeRect(x + 1, y + 1, CARD_W - 2, cardH - 2, C.DONKEROKER);

    screen.textCentered(ROOM_NAMES[level.ruimte], x + CARD_W / 2, y + 4, active ? C.WIT : C.KALK);
    screen.textCentered(level.vlak, x + CARD_W / 2, y + 13, C.ASGRIJS);

    // A thumbnail of the wall when there is room for one, otherwise a line
    // saying what the job is. At nine cards the art collapses to single
    // pixels and tells you nothing.
    const rows = level.rows ?? [];
    const cols = rows[0]?.length ?? 0;
    const art = cardH - 34;
    const cell = cols === 0 ? 0 : Math.min(3, Math.min(
      Math.floor(76 / cols),
      Math.floor(art / Math.max(1, rows.length)),
    ));
    if (cell >= 2) {
      const gx = x + Math.round((CARD_W - cols * cell) / 2);
      const gy = y + 22;
      for (let ry = 0; ry < rows.length; ry++) {
        for (let rx = 0; rx < cols; rx++) {
          const ch = rows[ry]![rx]!;
          const color = ch === '#' ? C.KALK : ch === 'B' ? C.HOUT
            : ch === 'L' ? C.ASGRIJS : ch === 'K' ? C.LICHTOKER : C.ROET;
          screen.fillRect(gx + rx * cell, gy + ry * cell, cell - 1, cell - 1, color);
        }
      }
    } else if (level.samenvatting) {
      // Clamped so a long summary can never bleed into the next card.
      const fits = Math.floor((CARD_W - 8) / 6);
      screen.textCentered(level.samenvatting.slice(0, fits), x + CARD_W / 2, y + 24,
        active ? C.SALIE : C.STEEN);
    }

    if (record) {
      const span = 3 * STAR_W + 2 * 4;
      for (let s = 0; s < 3; s++) {
        drawStar(screen, x + Math.round((CARD_W - span) / 2) + s * (STAR_W + 4),
          y + cardH - 10, s < record.stars);
      }
    } else if (active && Math.floor(this.time * 2) % 2 === 0) {
      screen.textCentered('AAN DE SLAG', x + CARD_W / 2, y + cardH - 9, C.ROESTROOD);
    }
  }
}
