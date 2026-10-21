import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LevelScene } from './level.ts';
import { cellCentre } from './room.ts';
import { WIDTH, HEIGHT } from '../engine/screen.ts';
import { SLOOP_LEVELS, gridFor } from '../puzzles/sloop/levels.ts';
import { solve } from '../puzzles/sloop/solver.ts';
import { Save } from '../engine/save.ts';
import type { Input } from '../engine/input.ts';
import type { Scene, SceneContext } from '../engine/scene.ts';
import type { Screen } from '../engine/screen.ts';

function context(x: number, y: number, clicked: boolean, keys: Set<string> = new Set()): SceneContext {
  const input = {
    mouseX: x, mouseY: y, mouseDown: clicked, mouseClicked: clicked, mouseOver: true,
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

test('playing the optimal line by hand completes the level', () => {
  for (const level of SLOOP_LEVELS) {
    const save = new Save(null);
    const scene = new LevelScene(level, save);
    const grid = gridFor(level);
    const { moves } = solve(grid);

    for (const move of moves) {
      // Pick the tool, then swing where the solver says.
      const slot = ['beitel', 'breekijzer', 'voorhamer'].indexOf(move.tool.id) + 1;
      scene.update(1 / 60, context(0, 0, false, new Set([`Digit${slot}`])));
      const at = cellCentre(grid.width, grid.height, WIDTH, HEIGHT, { x: move.x, y: move.y });
      scene.update(1 / 60, context(at.x, at.y, true));
      scene.update(1 / 60, context(at.x, at.y, false));
    }

    assert.ok(save.isDone(level.id), `${level.id}: wall is down but it never recorded as finished`);
    assert.equal(save.get(level.id)?.stars, 3, `${level.id}: clearing at par should be three stars`);
  }
});

test('a swing that would hit a hazard changes nothing', () => {
  const level = SLOOP_LEVELS.find((l) => l.rows.some((r) => r.includes('B')))!;
  const grid = gridFor(level);
  const save = new Save(null);
  const scene = new LevelScene(level, save);

  // Aim the sledge straight at a lintel.
  let target: { x: number; y: number } | null = null;
  for (let y = 0; y < grid.height && !target; y++) {
    for (let x = 0; x < grid.width && !target; x++) {
      if (level.rows[y]![x] === 'B') target = { x, y };
    }
  }
  const at = cellCentre(grid.width, grid.height, WIDTH, HEIGHT, target!);
  scene.update(1 / 60, context(at.x, at.y, true));
  scene.update(1 / 60, context(at.x, at.y, false));

  assert.equal(save.isDone(level.id), false, 'an illegal swing must not finish anything');
});
