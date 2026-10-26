import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KlosScene } from './klossen.ts';
import { KLOS_LEVELS } from '../puzzles/klossen/levels.ts';
import {
  MERK, aanwijzen, buren8, index, isKlos, scheveLijnen, watMist, xy,
} from '../puzzles/klossen/model.ts';
import { WIDTH, HEIGHT } from '../engine/screen.ts';
import { Save } from '../engine/save.ts';
import type { Input } from '../engine/input.ts';
import type { Scene, SceneContext } from '../engine/scene.ts';
import type { Screen } from '../engine/screen.ts';

function context(x: number, y: number, clicked: boolean, keys: Set<string> = new Set()): SceneContext {
  const input = {
    mouseX: x, mouseY: y, mouseDown: clicked, mouseClicked: clicked, mouseOver: true,
    mousePressX: x, mousePressY: y, mouseReleased: false,
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

/**
 * Where a cell sits on screen. The scene works this out from the room
 * layout, so it is recomputed here the same way rather than guessed.
 */
function cellAt(level: (typeof KLOS_LEVELS)[number], i: number): { x: number; y: number } {
  const w = level.wand;
  const TOP_H = 16;
  const BOTTOM_H = 30;
  const TAPE_H = 9;
  const TAPE_W = 13;
  const ceilingY = TOP_H;
  const ceilingH = 26;
  const floorH = 20;
  const floorY = HEIGHT - BOTTOM_H - floorH;
  const wallH = floorY - (ceilingY + ceilingH);
  const tile = Math.max(8, Math.min(
    Math.floor((wallH - TAPE_H) / w.height),
    Math.floor((WIDTH - 24 - TAPE_W) / w.width),
  ));
  const originX = Math.max(TAPE_W + 2, Math.round((WIDTH - w.width * tile) / 2));
  const originY = floorY - w.height * tile;
  const p = xy(w, i);
  return {
    x: originX + p.x * tile + Math.floor(tile / 2),
    y: originY + p.y * tile + Math.floor(tile / 2),
  };
}

/** Click a square the given number of times. */
function klik(scene: KlosScene, level: (typeof KLOS_LEVELS)[number], i: number, keer: number): void {
  const at = cellAt(level, i);
  for (let n = 0; n < keer; n++) {
    scene.update(1 / 60, context(at.x, at.y, true));
    scene.update(1 / 60, context(at.x, at.y, false));
  }
}

function geopend(level: (typeof KLOS_LEVELS)[number], save: Save): KlosScene {
  const scene = new KlosScene(level, save);
  const enter = new Set(['Enter']);
  scene.update(1 / 60, context(0, 0, false, enter));
  scene.update(1 / 60, context(0, 0, false, enter));
  return scene;
}

test('drilling every klos finishes the wall', () => {
  for (const level of KLOS_LEVELS) {
    const save = new Save(null);
    const scene = geopend(level, save);
    for (const i of level.wand.klossen) klik(scene, level, i, 2);
    assert.ok(save.isDone(level.id), `${level.id}: the wall is right but never completed`);
    assert.equal(save.get(level.id)?.stars, 3, `${level.id}: a clean wall is three stars`);
  }
});

test('a hole in the wrong place can be filled, and the wall still finishes', () => {
  // This is the bug that was reported: a stray hole could never be taken
  // back, so the counts stayed wrong for good and the level was dead.
  const level = KLOS_LEVELS[0]!;
  const w = level.wand;
  const mis = [...Array(w.width * w.height).keys()].find(
    (i) => !isKlos(w, i) && !w.blok[i] && !w.dingen.some((d) => d.at === i))!;

  const save = new Save(null);
  const scene = geopend(level, save);
  klik(scene, level, mis, 2);
  for (const i of w.klossen) klik(scene, level, i, 2);
  assert.ok(!save.isDone(level.id), 'a stray hole should still be in the way');

  klik(scene, level, mis, 1);
  assert.ok(save.isDone(level.id), 'filling the stray hole should finish the wall');
  assert.equal(save.get(level.id)?.stars, 2, 'but the hole still costs a star');
});

test('the same hole drilled twice is still one hole', () => {
  const level = KLOS_LEVELS[0]!;
  const w = level.wand;
  const mis = [...Array(w.width * w.height).keys()].find(
    (i) => !isKlos(w, i) && !w.blok[i] && !w.dingen.some((d) => d.at === i))!;
  const save = new Save(null);
  const scene = geopend(level, save);
  // Drill it, fill it, drill it, fill it: one hole in the wall, not two.
  klik(scene, level, mis, 6);
  for (const i of w.klossen) klik(scene, level, i, 2);
  assert.equal(save.get(level.id)?.stars, 2);
});

test('a wall that looks done but is not says so', () => {
  const w = KLOS_LEVELS[0]!.wand;
  const merken = new Array(w.width * w.height).fill(MERK.ONBEKEND);
  assert.match(watMist(w, merken)!, /TE WEINIG/);

  for (const i of w.klossen) merken[i] = MERK.KLOS;
  assert.equal(watMist(w, merken), null, 'the answer has nothing to complain about');

  merken[w.klossen[0]!] = MERK.ONBEKEND;
  assert.match(watMist(w, merken)!, /1 KLOS TE WEINIG/);
});

test('a complaint always points at squares you can see', () => {
  const w = KLOS_LEVELS[0]!.wand;
  const merken = new Array(w.width * w.height).fill(MERK.ONBEKEND);

  // Two klossen corner to corner: wrong straight away, and named as such.
  // Picked off the board rather than by arithmetic, so no edge wraps round.
  let a = -1;
  let schuin = -1;
  for (const i of w.klossen) {
    const p = xy(w, i);
    const hoek = [[1, 1], [1, -1], [-1, 1], [-1, -1]]
      .map(([dx, dy]) => ({ x: p.x + dx!, y: p.y + dy! }))
      .find((q) => q.x >= 0 && q.y >= 0 && q.x < w.width && q.y < w.height);
    if (hoek) { a = i; schuin = index(w, hoek.x, hoek.y); break; }
  }
  assert.ok(a >= 0 && schuin >= 0);
  merken[a] = MERK.KLOS;
  merken[schuin] = MERK.KLOS;
  assert.match(watMist(w, merken)!, /SCHUIN TELT OOK/);
  assert.deepEqual(aanwijzen(w, merken).sort((x, y) => x - y), [a, schuin].sort((x, y) => x - y));

  // The answer has nothing to point at.
  const goed = new Array(w.width * w.height).fill(MERK.ONBEKEND);
  for (const i of w.klossen) goed[i] = MERK.KLOS;
  assert.deepEqual(aanwijzen(w, goed), []);
  assert.deepEqual(scheveLijnen(w, goed), { kolommen: [], rijen: [] });
});

test('no shipped answer has two klossen touching', () => {
  for (const level of KLOS_LEVELS) {
    const w = level.wand;
    for (const i of w.klossen) {
      assert.ok(!buren8(w, i).some((j) => w.klossen.includes(j)),
        `${level.id}: the answer itself breaks the touching rule at ${i}`);
    }
  }
});

test('a line that does not add up is named once the wall is full', () => {
  const w = KLOS_LEVELS[0]!.wand;
  const merken = new Array(w.width * w.height).fill(MERK.ONBEKEND);
  for (const i of w.klossen) merken[i] = MERK.KLOS;
  // Move one klos along its row: same count of klossen, two columns now wrong.
  const weg = w.klossen[0]!;
  const p = xy(w, weg);
  merken[weg] = MERK.ONBEKEND;
  merken[index(w, p.x + 2, p.y)] = MERK.KLOS;
  const scheef = scheveLijnen(w, merken);
  assert.ok(scheef.kolommen.length > 0, 'the columns it moved between must be flagged');
  assert.ok(scheef.kolommen.includes(p.x));
});
