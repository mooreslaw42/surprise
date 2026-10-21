import { C } from '../engine/palette.ts';
import { WIDTH, HEIGHT, type Screen } from '../engine/screen.ts';
import type { SceneContext } from '../engine/scene.ts';
import { drawPim, PIM_W, PIM_H } from './pim.ts';

/**
 * Pim, saying something. A portrait box with the text typing itself out
 * beside it, which is how every game of that era handed you a rule.
 *
 * Reusable: Moeder asking after her kleiatelier and Zus after the tiny house
 * are the same thing with a different portrait.
 */

const CHARS_PER_SECOND = 42;
const PANEL_W = 336;
const PAD = 8;
const LINE_H = 9;
const NAME_H = 9;

export function wrap(text: string, width: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line.length === 0) line = word;
    else if (line.length + 1 + word.length <= width) line += ` ${word}`;
    else {
      out.push(line);
      line = word;
    }
  }
  if (line) out.push(line);
  return out;
}

export class Dialogue {
  private readonly lines: string[];
  private readonly total: number;
  private readonly naam: string;
  private revealed = 0;
  private done = false;

  // No parameter properties anywhere in this codebase: node's strip-only
  // type removal, which runs the tests, does not support them.
  constructor(paragraphs: readonly string[], naam = 'PIM') {
    this.naam = naam;
    const columns = Math.floor((PANEL_W - PIM_W - PAD * 4) / 6);
    this.lines = [];
    paragraphs.forEach((p, i) => {
      if (i > 0) this.lines.push('');
      this.lines.push(...wrap(p, columns));
    });
    this.total = this.lines.reduce((n, l) => n + l.length, 0);
  }

  /** True once the reader has dismissed it. */
  update(dt: number, ctx: SceneContext): boolean {
    const pressed = ctx.input.confirmed() || ctx.input.mouseClicked;
    if (this.revealed < this.total) {
      this.revealed = Math.min(this.total, this.revealed + CHARS_PER_SECOND * dt);
      // First press finishes the typing, second closes.
      if (pressed) this.revealed = this.total;
      return false;
    }
    if (pressed) this.done = true;
    return this.done;
  }

  private get talking(): boolean {
    return this.revealed < this.total;
  }

  /** Tall enough for whatever is being said; a fixed height overflows. */
  get height(): number {
    const text = this.lines.length * LINE_H;
    const portrait = PIM_H + 4 + NAME_H;
    return Math.max(text, portrait) + PAD * 2 + 8;
  }

  render(screen: Screen, time: number): void {
    const h = this.height;
    const x = Math.round((WIDTH - PANEL_W) / 2);
    const y = Math.round((HEIGHT - h) / 2);

    screen.fillRect(x, y, PANEL_W, h, C.ZWART);
    screen.strokeRect(x, y, PANEL_W, h, C.LICHTOKER);
    screen.strokeRect(x + 2, y + 2, PANEL_W - 4, h - 4, C.DONKEROKER);

    // Portrait, in its own recessed frame.
    const px = x + PAD;
    const py = y + PAD;
    screen.fillRect(px - 2, py - 2, PIM_W + 4, PIM_H + 4, C.ROET);
    screen.strokeRect(px - 2, py - 2, PIM_W + 4, PIM_H + 4, C.STEEN);
    drawPim(screen, px, py, this.talking && Math.floor(time * 9) % 2 === 0);

    screen.fillRect(px - 2, py + PIM_H + 2, PIM_W + 4, NAME_H, C.DONKEROKER);
    screen.textCentered(this.naam, px + PIM_W / 2, py + PIM_H + 4, C.WIT);

    // The speech, typing itself out.
    let budget = Math.floor(this.revealed);
    const tx = px + PIM_W + PAD * 2;
    this.lines.forEach((line, i) => {
      if (budget <= 0 && line.length > 0) return;
      const shown = line.slice(0, Math.max(0, budget));
      budget -= line.length;
      screen.text(shown, tx, py + 2 + i * LINE_H, C.KALK);
    });

    const prompt = this.talking ? '' : 'ENTER';
    if (prompt && Math.floor(time * 2) % 2 === 0) {
      screen.text(prompt, x + PANEL_W - 6 - prompt.length * 6, y + h - 10, C.SALIE);
    }
  }
}
