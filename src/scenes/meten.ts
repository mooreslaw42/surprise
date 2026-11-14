import { METEN } from '../data/praatjes.ts';
import { C } from '../engine/palette.ts';
import { WIDTH, HEIGHT, type Screen } from '../engine/screen.ts';
import type { Scene, SceneContext } from '../engine/scene.ts';
import { Dialogue } from './dialogue.ts';

/**
 * Meten is weten. Tien keer meten is Wouter.
 *
 * Before the first wall of each phase where material gets cut, the rolmaat
 * comes out: drag it from one end to the other, three times, and get three
 * readings that do not quite agree. The counter says "van 10". After three
 * Pim lets him off the other seven.
 *
 * It is a gag and not a mechanic on purpose. The plan had measuring change
 * the grid — measure once and the board may be a tile out — and that turns a
 * puzzle that is proven solvable into one that might be lying to you, which
 * is a different game. So it costs twenty seconds, once per phase, and it
 * gets the line in.
 */

const X0 = 42;
const X1 = 342;
const BAND_Y = 104;
const GRIJP = 22;

export class MeetScene implements Scene {
  private readonly wat: string;
  private readonly metingen: readonly number[];
  private readonly daarna: () => Scene;
  private readonly gedaan: number[] = [];
  private slepen = false;
  private lint = X0;
  private time = 0;
  private slot: Dialogue | null = null;

  constructor(fase: string, daarna: () => Scene) {
    const spec = METEN[fase];
    if (!spec) throw new Error(`geen meting voor ${fase}`);
    this.wat = spec.wat;
    this.metingen = spec.metingen;
    this.daarna = daarna;
    this.na = spec.na;
  }

  private readonly na: readonly string[];

  static heeft(fase: string): boolean {
    return METEN[fase] !== undefined;
  }

  private verder(ctx: SceneContext): void {
    ctx.pop();
    ctx.push(this.daarna());
  }

  private noteer(ctx: SceneContext): void {
    this.gedaan.push(this.metingen[this.gedaan.length]!);
    this.lint = X0;
    this.slepen = false;
    ctx.geluid?.('tik');
    if (this.gedaan.length >= this.metingen.length) this.slot = new Dialogue(this.na);
  }

  update(dt: number, ctx: SceneContext): void {
    this.time += dt;
    if (this.slot) {
      if (this.slot.update(dt, ctx)) this.verder(ctx);
      return;
    }
    if (ctx.input.justPressed('Escape')) { this.verder(ctx); return; }
    // For whoever would rather not drag: Enter measures.
    if (ctx.input.confirmed()) { this.noteer(ctx); return; }

    if (ctx.input.mouseClicked && Math.abs(ctx.input.mousePressX - X0) <= GRIJP) this.slepen = true;
    if (this.slepen) {
      this.lint = Math.max(X0, Math.min(X1, ctx.input.mouseX));
      if (!ctx.input.mouseDown) {
        if (this.lint >= X1 - 6) this.noteer(ctx);
        else { this.slepen = false; this.lint = X0; }
      }
    }
  }

  private static cm(mm: number): string {
    return `${Math.floor(mm / 10)},${mm % 10} CM`;
  }

  render(screen: Screen, _ctx: SceneContext): void {
    screen.clear(C.ROET);
    screen.fillRect(0, 0, WIDTH, 16, C.ZWART);
    screen.fillRect(0, 15, WIDTH, 1, C.STEEN);
    screen.text('EERST METEN', 6, 5, C.LICHTOKER);
    const teller = `METING ${Math.min(this.gedaan.length + 1, 10)} VAN 10`;
    screen.text(teller, WIDTH - 6 - teller.length * 6, 5, C.ASGRIJS);

    screen.textCentered(this.wat, WIDTH / 2, 30, C.KALK);

    // What is being measured: a bare run between two ends.
    screen.fillRect(X0, 56, X1 - X0, 40, C.KALK);
    screen.ditherRect(X0, 56, X1 - X0, 40, C.KALK, C.ZANDGRIJS);
    screen.fillRect(X0 - 8, 48, 8, 60, C.STEEN);
    screen.fillRect(X1, 48, 8, 60, C.STEEN);
    screen.fillRect(X0 - 8, 108, X1 - X0 + 16, 4, C.MAHONIE);

    // The tape, out as far as it has been pulled, with its marks.
    const uit = this.lint - X0;
    screen.fillRect(X0, BAND_Y - 3, uit, 6, C.BOTERGEEL);
    screen.fillRect(X0, BAND_Y + 2, uit, 1, C.DONKEROKER);
    for (let x = 0; x < uit; x += 6) {
      screen.fillRect(X0 + x, BAND_Y - 3, 1, x % 30 === 0 ? 5 : 2, C.ROET);
    }
    // The case, in the brand's colours, riding the end of the tape.
    screen.fillRect(this.lint - 2, BAND_Y - 8, 16, 16, C.ROESTROOD);
    screen.strokeRect(this.lint - 2, BAND_Y - 8, 16, 16, C.ROET);
    screen.fillRect(this.lint + 2, BAND_Y - 4, 8, 8, C.ZWART);
    screen.fillRect(this.lint + 5, BAND_Y - 1, 2, 2, C.ASGRIJS);

    // Readings so far. They do not agree, which is why there are three.
    this.gedaan.forEach((mm, i) => {
      screen.text(`${i + 1}.  ${MeetScene.cm(mm)}`, 60 + i * 96, 126, C.LICHTOKER);
    });
    if (this.slepen) {
      const doel = this.metingen[this.gedaan.length] ?? 0;
      const nu = Math.round((doel * uit) / (X1 - X0));
      screen.textCentered(MeetScene.cm(nu), WIDTH / 2, 142, C.WIT);
    }

    screen.fillRect(0, HEIGHT - 30, WIDTH, 30, C.ZWART);
    screen.fillRect(0, HEIGHT - 30, WIDTH, 1, C.STEEN);
    const wenk = this.gedaan.length === 0
      ? 'PAK DE ROLMAAT LINKS EN SLEEP HEM NAAR DE OVERKANT'
      : this.gedaan.length === 1 ? 'NOG EEN KEER. VOOR DE ZEKERHEID.' : 'EN NOG EEN KEER. VOOR DE ZEKERHEID VAN DE ZEKERHEID.';
    if (!this.slepen && !this.slot && Math.floor(this.time * 2) % 2 === 0) {
      screen.fillRect(X0 - 4, BAND_Y - 10, 20, 20, C.ZWART);
      screen.strokeRect(X0 - 4, BAND_Y - 10, 20, 20, C.WIT);
      screen.fillRect(X0 - 2, BAND_Y - 8, 16, 16, C.ROESTROOD);
    }
    screen.textCentered(wenk, WIDTH / 2, HEIGHT - 23, C.KALK);
    screen.textCentered('ENTER = METEN ZONDER SLEPEN   ESC = OVERSLAAN', WIDTH / 2, HEIGHT - 11, C.STEEN);

    if (this.slot) this.slot.render(screen, this.time);
  }
}
