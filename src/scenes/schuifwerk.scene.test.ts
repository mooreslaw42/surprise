import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SchuifScene, vlakVan } from './schuifwerk.ts';
import { SCHUIF_LEVELS } from '../puzzles/schuifwerk/levels.ts';
import { solve } from '../puzzles/schuifwerk/solver.ts';
import { cellsOf } from '../puzzles/schuifwerk/model.ts';
import { Save } from '../engine/save.ts';
import type { Input } from '../engine/input.ts';
import type { Scene, SceneContext } from '../engine/scene.ts';
import type { Screen } from '../engine/screen.ts';

/**
 * Leeghalen is driven by dragging, and a drag is three events that may all
 * arrive between two steps: the press, the travel and the release. These
 * exercise that case, because it used to throw the whole gesture away — the
 * grab was read at the release position, so it picked up nothing.
 */

type Muis = {
  x: number; y: number;
  pressX: number; pressY: number;
  down: boolean; clicked: boolean; released: boolean;
};

const stil: Muis = { x: 0, y: 0, pressX: 0, pressY: 0, down: false, clicked: false, released: false };

function context(muis: Muis, keys: Set<string> = new Set()): SceneContext {
  const input = {
    mouseX: muis.x, mouseY: muis.y,
    mousePressX: muis.pressX, mousePressY: muis.pressY,
    mouseDown: muis.down, mouseClicked: muis.clicked, mouseReleased: muis.released,
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

/** Pim explains the stage first, and holds input until he is read. */
function voorbijDeUitleg(scene: SchuifScene): void {
  const enter = new Set(['Enter']);
  scene.update(1 / 60, context(stil, enter));
  scene.update(1 / 60, context(stil, enter));
}

test('a flick with press and release in one step still shifts the furniture', () => {
  for (const level of SCHUIF_LEVELS) {
    const save = new Save(null);
    const scene = new SchuifScene(level, save);
    voorbijDeUitleg(scene);

    const { tile, originX, originY } = vlakVan(level.plan);
    const midden = (x: number, y: number) => ({
      x: originX + x * tile + Math.floor(tile / 2),
      y: originY + y * tile + Math.floor(tile / 2),
    });

    const { par, zetten } = solve(level.plan);
    let stukken = level.plan.stukken.map((s) => ({ ...s }));

    for (const zet of zetten) {
      const stuk = stukken.find((s) => s.id === zet.id)!;
      // Grab the piece's own first cell and let go `stap` cells along its axis.
      const pak = cellsOf(stuk)[0]!;
      const los = stuk.orientatie === 'horizontaal'
        ? { x: pak.x + zet.stap, y: pak.y }
        : { x: pak.x, y: pak.y + zet.stap };
      const van = midden(pak.x, pak.y);
      const naar = midden(los.x, los.y);

      // One single step holding the lot: the press at the grab, the mouse
      // already at the far end, the button already back up.
      scene.update(1 / 60, context({
        x: naar.x, y: naar.y,
        pressX: van.x, pressY: van.y,
        down: false, clicked: true, released: true,
      }));

      stukken = stukken.map((s) => (s.id === zet.id
        ? { ...s, x: s.orientatie === 'horizontaal' ? s.x + zet.stap : s.x,
            y: s.orientatie === 'verticaal' ? s.y + zet.stap : s.y }
        : s));
    }

    assert.ok(save.isDone(level.id),
      `${level.id}: every piece was flicked where the solver said and the room never emptied`);
    assert.equal(save.get(level.id)?.swings, par,
      `${level.id}: a flick should count as one move, like a slow drag`);
    assert.equal(save.get(level.id)?.stars, 3, `${level.id}: clearing at par is three stars`);
  }
});

test('a click that goes nowhere shifts nothing', () => {
  const level = SCHUIF_LEVELS[0]!;
  const save = new Save(null);
  const scene = new SchuifScene(level, save);
  voorbijDeUitleg(scene);

  const { tile, originX, originY } = vlakVan(level.plan);
  const pak = cellsOf(level.plan.stukken[0]!)[0]!;
  const op = {
    x: originX + pak.x * tile + Math.floor(tile / 2),
    y: originY + pak.y * tile + Math.floor(tile / 2),
  };

  for (let n = 0; n < 5; n++) {
    scene.update(1 / 60, context({
      x: op.x, y: op.y, pressX: op.x, pressY: op.y,
      down: false, clicked: true, released: true,
    }));
  }

  assert.ok(!save.isDone(level.id), 'clicking in place should not be a move at all');
});
