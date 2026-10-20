import { Input } from './engine/input.ts';
import { PALETTE } from './engine/palette.ts';
import { Screen, WIDTH, HEIGHT } from './engine/screen.ts';
import type { Scene, SceneContext } from './engine/scene.ts';
import { DesignSheetScene } from './scenes/designsheet.ts';
import { TitleScene } from './scenes/title.ts';

/** Fixed timestep, so puzzle logic never sees a variable dt. */
const STEP = 1 / 60;
const MAX_CATCHUP = 5;

class Game implements SceneContext {
  readonly screen: Screen;
  readonly input: Input;
  private readonly stack: Scene[] = [];
  private accumulator = 0;
  private last = 0;
  private showPalette = false;

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

      this.render();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  private step(dt: number): void {
    if (this.input.justPressed('KeyS')) this.screen.scanlines = !this.screen.scanlines;
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

  private render(): void {
    // Walk down to the lowest scene that still wants what is under it drawn.
    let base = this.stack.length - 1;
    while (base > 0 && this.stack[base]?.transparent) base--;
    for (let i = base; i < this.stack.length; i++) {
      this.stack[i]!.render(this.screen, this);
    }

    if (this.showPalette) this.renderPalette();
    this.input.drawCursor();
    this.screen.present();
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

const canvas = document.getElementById('screen');
if (!(canvas instanceof HTMLCanvasElement)) throw new Error('canvas #screen missing');
const game = new Game(canvas);
game.push(new TitleScene());
game.start();
