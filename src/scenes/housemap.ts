import { C } from '../engine/palette.ts';
import { WIDTH, HEIGHT, type Screen } from '../engine/screen.ts';
import type { Scene, SceneContext } from '../engine/scene.ts';
import type { Save } from '../engine/save.ts';
import { ROOM_NAMES } from '../data/house.ts';
import { drawStar, STAR_W } from '../engine/ui.ts';
import { SLOOP_LEVELS } from '../puzzles/sloop/levels.ts';
import { LevelScene } from './level.ts';

const CARD_W = 108;
const CARD_H = 92;
const CARD_Y = 54;

/**
 * Pick a room. Free order within a stage; the stage itself is gated, which is
 * the whole joke, so the next one stays shut until all three are done.
 */
export class HouseMapScene implements Scene {
  private readonly save: Save;
  private selected = 0;
  private time = 0;

  constructor(save: Save) {
    this.save = save;
  }

  private cardX(i: number): number {
    const gap = 12;
    const total = SLOOP_LEVELS.length * CARD_W + (SLOOP_LEVELS.length - 1) * gap;
    return Math.round((WIDTH - total) / 2) + i * (CARD_W + gap);
  }

  update(dt: number, ctx: SceneContext): void {
    this.time += dt;
    const n = SLOOP_LEVELS.length;
    if (ctx.input.justPressed('ArrowLeft')) this.selected = (this.selected + n - 1) % n;
    if (ctx.input.justPressed('ArrowRight')) this.selected = (this.selected + 1) % n;
    if (ctx.input.justPressed('Escape')) ctx.pop();

    for (let i = 0; i < n; i++) {
      const x = this.cardX(i);
      const inside = ctx.input.mouseOver &&
        ctx.input.mouseX >= x && ctx.input.mouseX < x + CARD_W &&
        ctx.input.mouseY >= CARD_Y && ctx.input.mouseY < CARD_Y + CARD_H;
      if (inside) {
        this.selected = i;
        if (ctx.input.mouseClicked) this.open(ctx, i);
      }
    }
    if (ctx.input.confirmed()) this.open(ctx, this.selected);
  }

  private open(ctx: SceneContext, index: number): void {
    ctx.push(new LevelScene(SLOOP_LEVELS[index]!, this.save));
  }

  render(screen: Screen, _ctx: SceneContext): void {
    screen.clear(C.ROET);
    screen.ditherRect(0, 0, WIDTH, HEIGHT, C.ROET, C.ZWART);

    screen.fillRect(0, 0, WIDTH, 20, C.ZWART);
    screen.fillRect(0, 19, WIDTH, 1, C.STEEN);
    screen.text('FASE 1 - SLOOP', 6, 7, C.LICHTOKER);

    const done = SLOOP_LEVELS.filter((l) => this.save.isDone(l.id)).length;
    const label = `${done} / ${SLOOP_LEVELS.length} RUIMTES`;
    screen.text(label, WIDTH - 6 - label.length * 6, 7, done === SLOOP_LEVELS.length ? C.SALIE : C.ASGRIJS);

    screen.textCentered('KIES EEN RUIMTE', WIDTH / 2, 32, C.ASGRIJS);

    for (let i = 0; i < SLOOP_LEVELS.length; i++) this.drawCard(screen, i);

    const gated = done < SLOOP_LEVELS.length;
    screen.fillRect(0, HEIGHT - 26, WIDTH, 26, C.ZWART);
    screen.fillRect(0, HEIGHT - 26, WIDTH, 1, C.STEEN);
    screen.textCentered(
      gated ? 'FASE 2 - ISOLATIE: EERST ALLE RUIMTES SLOPEN' : 'FASE 2 - ISOLATIE IS OPEN',
      WIDTH / 2, HEIGHT - 19, gated ? C.STEEN : C.SALIE,
    );
    screen.textCentered('PIJLTJES = KIEZEN   ENTER = SLOPEN', WIDTH / 2, HEIGHT - 9, C.ASGRIJS);
  }

  private drawCard(screen: Screen, i: number): void {
    const level = SLOOP_LEVELS[i]!;
    const x = this.cardX(i);
    const active = i === this.selected;
    const record = this.save.get(level.id);

    screen.fillRect(x, CARD_Y, CARD_W, CARD_H, C.ZWART);
    screen.strokeRect(x, CARD_Y, CARD_W, CARD_H, active ? C.LICHTOKER : C.STEEN);
    if (active) screen.strokeRect(x + 1, CARD_Y + 1, CARD_W - 2, CARD_H - 2, C.DONKEROKER);

    screen.textCentered(ROOM_NAMES[level.ruimte],
      x + CARD_W / 2, CARD_Y + 8, active ? C.WIT : C.KALK);
    screen.textCentered(level.vlak, x + CARD_W / 2, CARD_Y + 18, C.ASGRIJS);

    // A thumbnail of the wall, straight from the level data.
    const rows = level.rows;
    const cols = rows[0]!.length;
    const cell = Math.max(2, Math.floor(72 / cols));
    const gx = x + Math.round((CARD_W - cols * cell) / 2);
    const gy = CARD_Y + 30;
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
          CARD_Y + CARD_H - 14, s < record.stars);
      }
    } else if (active && Math.floor(this.time * 2) % 2 === 0) {
      screen.textCentered('SLOPEN', x + CARD_W / 2, CARD_Y + CARD_H - 13, C.ROESTROOD);
    }
  }
}
