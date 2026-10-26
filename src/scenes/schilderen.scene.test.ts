import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SchilderScene } from './schilderen.ts';
import { cellCentre as rawCellCentre } from './room.ts';
import { WIDTH, HEIGHT } from '../engine/screen.ts';
import { SCHILDER_LEVELS } from '../puzzles/schilderen/levels.ts';
import { solve } from '../puzzles/schilderen/solver.ts';
import { xy } from '../puzzles/schilderen/model.ts';
import { Save } from '../engine/save.ts';
import type { Input } from '../engine/input.ts';
import type { Scene, SceneContext } from '../engine/scene.ts';
import type { Screen } from '../engine/screen.ts';

const cellCentre = (w: number, h: number, p: { x: number; y: number }) =>
  rawCellCentre(w, h, WIDTH, HEIGHT, p);

type Mouse = {
  x: number; y: number; down: boolean; clicked: boolean;
  press?: { x: number; y: number };
  path?: { x: number; y: number }[];
  released?: boolean;
};

function context(mouse: Mouse, keys: Set<string> = new Set()): SceneContext {
  const input = {
    mouseX: mouse.x,
    mouseY: mouse.y,
    mousePressX: mouse.press?.x ?? mouse.x,
    mousePressY: mouse.press?.y ?? mouse.y,
    mousePath: mouse.path ?? [],
    mouseDown: mouse.down,
    mouseClicked: mouse.clicked,
    mouseReleased: mouse.released ?? false,
    mouseOver: true,
    isDown: (code: string) => keys.has(code),
    justPressed: (code: string) => keys.has(code),
    justReleased: () => false,
    confirmed: () => keys.has('Enter'),
    endFrame: () => {},
    drawCursor: () => {},
  } as unknown as Input;
  return {
    screen: undefined as unknown as Screen,
    input,
    push: (_: Scene) => {},
    pop: () => {},
    replace: (_: Scene) => {},
  };
}

/** Pim's explanation opens over a fresh level and holds input until it is read. */
function dismissUitleg(scene: SchilderScene): void {
  const enter = new Set(['Enter']);
  scene.update(1 / 60, context({ x: 0, y: 0, down: false, clicked: false }, enter));
  scene.update(1 / 60, context({ x: 0, y: 0, down: false, clicked: false }, enter));
}

test('a flick along the whole solution paints every square in one step', () => {
  for (const level of SCHILDER_LEVELS) {
    const save = new Save(null);
    const scene = new SchilderScene(level, save);
    dismissUitleg(scene);

    const { muur } = level;
    const streek = solve(muur).streek;
    // The entire winning line swept out between two steps: the roller presses
    // in the corner and the pointer runs over every square before the next
    // step. Reading only where it stopped would paint a single tile.
    const path = streek.map((cel) => cellCentre(muur.width, muur.height, xy(muur, cel)));
    const end = path[path.length - 1]!;
    scene.update(1 / 60, context({
      x: end.x, y: end.y, down: true, clicked: true, press: path[0], path,
    }));
    scene.update(1 / 60, context({ x: end.x, y: end.y, down: false, clicked: false }));

    assert.ok(save.isDone(level.id), `${level.id}: a flicked stroke never covered the wall`);
  }
});

test('a drag back over the last square still lifts the roller mid-flick', () => {
  const level = SCHILDER_LEVELS[0]!;
  const { muur } = level;
  const save = new Save(null);
  const scene = new SchilderScene(level, save);
  dismissUitleg(scene);

  const streek = solve(muur).streek;
  // Run three squares out, then retrace the last one within the same step.
  const out = streek.slice(0, 3);
  const cells = [...out, out[out.length - 2]!];
  const path = cells.map((cel) => cellCentre(muur.width, muur.height, xy(muur, cel)));
  const end = path[path.length - 1]!;
  scene.update(1 / 60, context({
    x: end.x, y: end.y, down: true, clicked: true, press: path[0], path,
  }));
  // Not solved, but also not crashed: the retrace is handled like any other
  // step along the path.
  scene.update(1 / 60, context({ x: end.x, y: end.y, down: false, clicked: false }));
  assert.equal(save.isDone(level.id), false);
});
