import { STAGES } from './data/stages.ts';
import { Audio } from './engine/audio.ts';
import { Input } from './engine/input.ts';
import type { Effect } from './engine/muziek.ts';
import { C, PALETTE } from './engine/palette.ts';
import { Screen, WIDTH, HEIGHT } from './engine/screen.ts';
import type { Scene, SceneContext } from './engine/scene.ts';
import { Save } from './engine/save.ts';
import { DesignSheetScene } from './scenes/designsheet.ts';
import { TitleScene } from './scenes/title.ts';

/** Fixed timestep, so puzzle logic never sees a variable dt. */
const STEP = 1 / 60;
const MAX_CATCHUP = 5;

class Game implements SceneContext {
  readonly screen: Screen;
  readonly input: Input;
  private readonly audio = new Audio();
  private readonly stack: Scene[] = [];
  private accumulator = 0;
  private last = 0;
  private showPalette = false;
  /** Seconds left on the "muziek uit" notice, so M is not a silent mystery. */
  private melding = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.screen = new Screen(canvas);
    this.input = new Input(canvas, this.screen);
  }

  push(scene: Scene): void {
    this.stack.push(scene);
    scene.enter?.(this);
  }

  pop(): void {
    const scene = this.stack.pop();
    scene?.exit?.(this);
  }

  replace(scene: Scene): void {
    while (this.stack.length > 0) this.pop();
    this.push(scene);
  }

  geluid(naam: Effect): void {
    this.audio.effect(naam);
  }

  private current(): Scene | undefined {
    return this.stack[this.stack.length - 1];
  }

  start(): void {
    this.last = performance.now();
    const frame = (now: number) => {
      this.accumulator += Math.min((now - this.last) / 1000, STEP * MAX_CATCHUP);
      this.last = now;

      let steps = 0;
      while (this.accumulator >= STEP && steps < MAX_CATCHUP) {
        this.step(STEP);
        this.accumulator -= STEP;
        steps++;
      }

      // Once a frame, not once a step: the scheduler works in audio-clock
      // seconds and does not care how many times the game caught up.
      this.muziek();
      this.audio.tik();
      this.render();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /**
   * Run the game forward by hand, for looking at it from a test harness or a
   * background tab where the browser hands out two frames a second. Only
   * reachable on localhost; see the bottom of this file.
   */
  vooruit(seconden: number): void {
    for (let t = 0; t < seconden; t += STEP) this.step(STEP);
    this.render();
  }

  private step(dt: number): void {
    // Nothing is allowed to make a sound until the player has touched
    // something, so the first key or click is also what starts the music.
    if (this.input.raakte()) this.audio.aan();
    if (this.melding > 0) this.melding -= dt;

    if (this.input.justPressed('KeyS')) this.screen.scanlines = !this.screen.scanlines;
    if (this.input.justPressed('KeyM')) {
      this.audio.demp();
      this.melding = 1.8;
    }
    if (this.input.justPressed('KeyP')) this.showPalette = !this.showPalette;
    // Toggled here rather than inside the scene: if both ends handled the key,
    // the push and the pop would land on the same frame.
    if (this.input.justPressed('KeyD')) {
      if (this.current() instanceof DesignSheetScene) this.pop();
      else this.push(new DesignSheetScene());
    }
    if (this.input.justPressed('KeyF')) void document.documentElement.requestFullscreen?.();

    this.current()?.update(dt, this);
    this.input.endFrame();
  }

  /**
   * The topmost scene with an opinion picks the music. Walking down past the
   * ones without one keeps an overlay — the design sheet, a dialogue — from
   * cutting the level theme just by being on top.
   */
  private muziek(): void {
    let i = this.stack.length - 1;
    while (i > 0 && this.stack[i]?.muziek === undefined) i--;
    this.audio.speel(this.stack[i]?.muziek ?? null);
  }

  private render(): void {
    // Walk down to the lowest scene that still wants what is under it drawn.
    let base = this.stack.length - 1;
    while (base > 0 && this.stack[base]?.transparent) base--;
    for (let i = base; i < this.stack.length; i++) {
      this.stack[i]!.render(this.screen, this);
    }

    if (this.showPalette) this.renderPalette();
    if (this.melding > 0) this.renderMelding();
    this.input.drawCursor();
    this.screen.present();
  }

  /** Briefly, after M, because silence that looks like a bug is a bug. */
  private renderMelding(): void {
    const w = 64;
    const x = WIDTH - w - 2;
    this.screen.fillRect(x, 2, w, 11, C.ZWART);
    this.screen.strokeRect(x, 2, w, 11, C.STEEN);
    this.screen.textCentered(
      this.audio.gedempt ? 'MUZIEK UIT' : 'MUZIEK AAN',
      x + w / 2, 5, this.audio.gedempt ? C.ASGRIJS : C.LICHTOKER,
    );
  }

  /** Art-direction aid: every palette index with its number, toggled with P. */
  private renderPalette(): void {
    const sw = 15;
    const cols = PALETTE.length;
    const w = cols * sw + 4;
    const x = Math.round((WIDTH - w) / 2);
    const y = HEIGHT - 34;
    this.screen.fillRect(x, y, w, 30, 0);
    this.screen.strokeRect(x, y, w, 30, 1);
    for (let i = 0; i < cols; i++) {
      const sx = x + 2 + i * sw;
      this.screen.fillRect(sx, y + 2, sw - 1, 14, i);
      this.screen.text(String(i).padStart(2, '0'), sx + 1, y + 19, 1);
    }
  }
}

// Typing the switch onto the address of a page that is already open only
// changes the hash; reload so it is actually read.
window.addEventListener('hashchange', () => {
  if (location.hash === '#alles' || location.hash === '#opnieuw') location.reload();
});

const canvas = document.getElementById('screen');
if (!(canvas instanceof HTMLCanvasElement)) throw new Error('canvas #screen missing');
const save = new Save(typeof localStorage === 'undefined' ? null : localStorage);

// For testing, not for playing: open the page with #alles on the end and
// every gate is open, with nothing marked as solved, so each level still
// plays for its stars. #opnieuw wipes the save. Neither is mentioned anywhere
// on screen.
if (location.hash === '#alles') {
  for (const stage of STAGES) {
    for (const entry of stage.entries) save.slaOver(entry.id);
    save.zetVlag(`praatje-${stage.id}`);
  }
  save.zetVlag('outro');
  history.replaceState(null, '', location.pathname);
} else if (location.hash === '#opnieuw') {
  save.reset();
  history.replaceState(null, '', location.pathname);
}
const game = new Game(canvas);
game.push(new TitleScene(save));
game.start();
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  (window as unknown as { spel: Game }).spel = game;
}
