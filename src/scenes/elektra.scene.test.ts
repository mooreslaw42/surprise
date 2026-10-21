import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ElektraScene } from './elektra.ts';
import { cellCentre as rawCellCentre } from './room.ts';
import { WIDTH, HEIGHT } from '../engine/screen.ts';

const cellCentre = (w: number, h: number, p: { x: number; y: number }) =>
  rawCellCentre(w, h, WIDTH, HEIGHT, p);
import { ELEKTRA_LEVELS } from '../puzzles/elektra/levels.ts';
import { solve } from '../puzzles/elektra/solver.ts';
import { Save } from '../engine/save.ts';
import type { Input } from '../engine/input.ts';
import type { Scene, SceneContext } from '../engine/scene.ts';
import type { Screen } from '../engine/screen.ts';

/**
 * Drives the scene the way a mouse does. ElektraScene.update touches nothing
 * but the input, so it can be exercised without a canvas.
 */
type Mouse = { x: number; y: number; down: boolean; clicked: boolean };

function context(mouse: Mouse, keys: Set<string> = new Set()): SceneContext {
  const input = {
    mouseX: mouse.x,
    mouseY: mouse.y,
    mouseDown: mouse.down,
    mouseClicked: mouse.clicked,
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

/** The rules panel opens over a fresh level and swallows input until read. */
function dismissUitleg(scene: ElektraScene): void {
  scene.update(1 / 60, context({ x: 0, y: 0, down: false, clicked: false }, new Set(['Enter'])));
}

/** Lay one route by dragging from the socket to the meterkast. */
function drag(scene: ElektraScene, width: number, height: number, route: { x: number; y: number }[]): void {
  const first = cellCentre(width, height, route[0]!);
  scene.update(1 / 60, context({ x: first.x, y: first.y, down: true, clicked: true }));
  for (let i = 1; i < route.length; i++) {
    const at = cellCentre(width, height, route[i]!);
    scene.update(1 / 60, context({ x: at.x, y: at.y, down: true, clicked: false }));
  }
  const last = cellCentre(width, height, route[route.length - 1]!);
  scene.update(1 / 60, context({ x: last.x, y: last.y, down: false, clicked: false }));
}

test('wiring every socket by hand completes the level', () => {
  for (const level of ELEKTRA_LEVELS) {
    const save = new Save(null);
    const scene = new ElektraScene(level, save);
    dismissUitleg(scene);
    const { routes } = solve(level.board);
    for (const route of routes) {
      drag(scene, level.board.width, level.board.height, route);
    }
    assert.ok(
      save.isDone(level.id),
      `${level.id}: every cable is laid but the level never recorded as finished`,
    );
    assert.equal(save.get(level.id)?.stars, 3, `${level.id}: wiring at par should be three stars`);
  }
});

test('an abandoned drag leaves no half cable behind', () => {
  const level = ELEKTRA_LEVELS[0]!;
  const save = new Save(null);
  const scene = new ElektraScene(level, save);
  dismissUitleg(scene);
  const { width, height } = level.board;
  const socket = level.board.stopcontacten[0]!;

  const start = cellCentre(width, height, socket);
  scene.update(1 / 60, context({ x: start.x, y: start.y, down: true, clicked: true }));
  const next = cellCentre(width, height, { x: socket.x, y: socket.y + 1 });
  scene.update(1 / 60, context({ x: next.x, y: next.y, down: true, clicked: false }));
  // Let go in the middle of the wall.
  scene.update(1 / 60, context({ x: next.x, y: next.y, down: false, clicked: false }));

  assert.equal(save.isDone(level.id), false);
});

test('the rules panel holds input until it is read', () => {
  const level = ELEKTRA_LEVELS[0]!;
  const save = new Save(null);
  const scene = new ElektraScene(level, save);
  const { width, height } = level.board;
  const { routes } = solve(level.board);

  // Without dismissing it, dragging does nothing at all.
  for (const route of routes) drag(scene, width, height, route);
  assert.equal(save.isDone(level.id), false);

  dismissUitleg(scene);
  for (const route of routes) drag(scene, width, height, route);
  assert.ok(save.isDone(level.id), 'should wire normally once the panel is gone');
});
