import { INTRO, strofen } from '../data/intro.ts';
import { C } from '../engine/palette.ts';
import { WIDTH, HEIGHT, type Screen } from '../engine/screen.ts';
import type { Scene, SceneContext } from '../engine/scene.ts';
import type { Save } from '../engine/save.ts';
import { Dialogue } from './dialogue.ts';

/**
 * The gedicht, before anything else. Pim says it, a strofe at a time, over
 * the title screen with its fresh hole in the wall, and Enter brings the
 * next one. When the last is read the house map opens.
 *
 * Once only: it is a surprise, and the second time it is a delay. Escape
 * goes straight through for whoever has heard it.
 */
export class IntroScene implements Scene {
  /** The title stays on screen underneath, and keeps playing its riff. */
  readonly transparent = true;

  private readonly save: Save;
  private readonly daarna: () => Scene;
  private readonly boxen: string[][];
  private index = 0;
  private box: Dialogue | null;
  private time = 0;

  constructor(save: Save, daarna: () => Scene) {
    this.save = save;
    this.daarna = daarna;
    this.boxen = strofen(INTRO);
    this.box = this.maak();
  }

  static nodig(save: Save): boolean {
    return !save.vlag('intro') && strofen(INTRO).length > 0;
  }

  private maak(): Dialogue | null {
    const regels = this.boxen[this.index];
    return regels ? new Dialogue(regels, 'PIM', true) : null;
  }

  private klaar(ctx: SceneContext): void {
    this.save.zetVlag('intro');
    ctx.pop();
    ctx.push(this.daarna());
  }

  update(dt: number, ctx: SceneContext): void {
    this.time += dt;
    if (ctx.input.justPressed('Escape') || !this.box) { this.klaar(ctx); return; }
    if (this.box.update(dt, ctx)) {
      this.index++;
      this.box = this.maak();
      if (!this.box) this.klaar(ctx);
    }
  }

  render(screen: Screen, _ctx: SceneContext): void {
    // Dim the title, so the box is what is read: every other row to black.
    for (let y = 0; y < HEIGHT; y += 2) screen.fillRect(0, y, WIDTH, 1, C.ZWART);
    this.box?.render(screen, this.time);
    // A plain bar for the two lines at the bottom: the title's own footer is
    // underneath and would otherwise show through them.
    screen.fillRect(0, HEIGHT - 28, WIDTH, 28, C.ZWART);
    const teller = `${Math.min(this.index + 1, this.boxen.length)} / ${this.boxen.length}`;
    screen.textCenteredShadow(teller, WIDTH / 2, HEIGHT - 24, C.ASGRIJS, C.ZWART);
    screen.textCenteredShadow('ENTER = VERDER   ESC = OVERSLAAN', WIDTH / 2, HEIGHT - 12, C.STEEN, C.ZWART);
  }
}
