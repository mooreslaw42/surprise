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

const CARD_W = 112;
const CARD_H = 66;
const CARD_Y = 36;
const GAP = 8;
const PER_ROW = 3;

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

  /** Laid out in rows of three, because six no longer fit across. */
  private cardPos(i: number): { x: number; y: number } {
    const n = this.entries().length;
    const row = Math.floor(i / PER_ROW);
    const inRow = Math.min(PER_ROW, n - row * PER_ROW);
    const total = inRow * CARD_W + (inRow - 1) * GAP;
    return {
      x: Math.round((WIDTH - total) / 2) + (i % PER_ROW) * (CARD_W + GAP),
      y: CARD_Y + row * (CARD_H + GAP),
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
        ctx.input.mouseY >= y && ctx.input.mouseY < y + CARD_H;
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
    if (STAGES[this.stage]!.kind === 'sloop') {
      const level = SLOOP_LEVELS.find((l) => l.id === entry.id);
      if (level) ctx.push(new LevelScene(level, this.save));
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
    screen.text(`FASE ${stage.nummer} - ${stage.naam}`, 6, 7, C.LICHTOKER);

    const entries = this.entries();
    const done = entries.filter((e) => this.save.isDone(e.id)).length;
    const label = `${done} / ${entries.length} RUIMTES`;
    screen.text(label, WIDTH - 6 - label.length * 6, 7, done === entries.length ? C.SALIE : C.ASGRIJS);

    for (let i = 0; i < entries.length; i++) this.drawCard(screen, i);

    const gated = done < entries.length;
    const next = STAGES[this.stage + 1];
    screen.fillRect(0, HEIGHT - 26, WIDTH, 26, C.ZWART);
    screen.fillRect(0, HEIGHT - 26, WIDTH, 1, C.STEEN);
    const footer = next
      ? (gated ? `FASE ${next.nummer} - ${next.naam}: EERST ALLE RUIMTES` : `FASE ${next.nummer} - ${next.naam} IS OPEN. TAB.`)
      : 'LAATSTE FASE';
    screen.textCentered(footer, WIDTH / 2, HEIGHT - 19, gated ? C.STEEN : C.SALIE);
    screen.textCentered('PIJLTJES = KIEZEN   ENTER = AAN DE SLAG', WIDTH / 2, HEIGHT - 9, C.ASGRIJS);
  }

  private drawCard(screen: Screen, i: number): void {
    const level = this.entries()[i]!;
    const { x, y } = this.cardPos(i);
    const active = i === this.selected;
    const record = this.save.get(level.id);

    screen.fillRect(x, y, CARD_W, CARD_H, C.ZWART);
    screen.strokeRect(x, y, CARD_W, CARD_H, active ? C.LICHTOKER : C.STEEN);
    if (active) screen.strokeRect(x + 1, y + 1, CARD_W - 2, CARD_H - 2, C.DONKEROKER);

    screen.textCentered(ROOM_NAMES[level.ruimte], x + CARD_W / 2, y + 4, active ? C.WIT : C.KALK);
    screen.textCentered(level.vlak, x + CARD_W / 2, y + 13, C.ASGRIJS);

    // A thumbnail of the wall, straight from the level data.
    const rows = level.rows ?? SLOOP_LEVELS.find((l) => l.ruimte === level.ruimte)?.rows ?? [];
    const cols = rows[0]?.length ?? 0;
    const cell = Math.max(2, Math.min(3, Math.floor(76 / Math.max(1, cols))));
    const gx = x + Math.round((CARD_W - cols * cell) / 2);
    const gy = y + 24;
    for (let ry = 0; ry < rows.length; ry++) {
      for (let rx = 0; rx < cols; rx++) {
        const ch = rows[ry]![rx]!;
        const color = ch === '#' ? C.KALK : ch === 'B' ? C.HOUT
          : ch === 'L' ? C.ASGRIJS : ch === 'K' ? C.LICHTOKER : C.ROET;
        screen.fillRect(gx + rx * cell, gy + ry * cell, cell - 1, cell - 1, color);
      }
    }

    if (record) {
      const span = 3 * STAR_W + 2 * 4;
      for (let s = 0; s < 3; s++) {
        drawStar(screen, x + Math.round((CARD_W - span) / 2) + s * (STAR_W + 4),
          y + CARD_H - 10, s < record.stars);
      }
    } else if (active && Math.floor(this.time * 2) % 2 === 0) {
      screen.textCentered('AAN DE SLAG', x + CARD_W / 2, y + CARD_H - 9, C.ROESTROOD);
    }
  }
}
