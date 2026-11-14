import type { Input } from './input.ts';
import type { Effect, Muziekkeuze } from './muziek.ts';
import type { Screen } from './screen.ts';

export interface SceneContext {
  readonly screen: Screen;
  readonly input: Input;
  /** Push a scene on top of the current one. */
  push(scene: Scene): void;
  /** Pop the current scene. */
  pop(): void;
  /** Replace the whole stack. */
  replace(scene: Scene): void;
  /**
   * A one-off sound. Optional so a test can hand a scene a context without
   * a sound card in it; scenes call it as ctx.geluid?.('klaar').
   */
  geluid?(naam: Effect): void;
}

export interface Scene {
  enter?(ctx: SceneContext): void;
  exit?(ctx: SceneContext): void;
  /** dt is in seconds. */
  update(dt: number, ctx: SceneContext): void;
  render(screen: Screen, ctx: SceneContext): void;
  /** When true, the scene below still renders underneath this one. */
  readonly transparent?: boolean;
  /**
   * What should be playing while this scene is on top. Declared rather than
   * started, so push and pop both do the right thing without a scene having
   * to remember to hand the music back.
   *
   * Left off means no opinion and whatever is underneath keeps playing, which
   * is what an overlay wants; null means silence.
   */
  readonly muziek?: Muziekkeuze | null;
}
