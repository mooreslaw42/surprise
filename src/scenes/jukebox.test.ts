import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JukeboxScene } from './jukebox.ts';
import { TitleScene } from './title.ts';
import { IntroScene } from './intro.ts';
import { LIEDJES } from '../data/liedjes.ts';
import { Save } from '../engine/save.ts';
import { WIDTH, HEIGHT } from '../engine/screen.ts';
import type { Input } from '../engine/input.ts';
import type { Scene, SceneContext } from '../engine/scene.ts';

type Stap = { keys?: string[]; klik?: { x: number; y: number } };

function context(stap: Stap, gepusht: Scene[], weg: { n: number }): SceneContext {
  const keys = new Set(stap.keys ?? []);
  const input = {
    mouseX: stap.klik?.x ?? -1,
    mouseY: stap.klik?.y ?? -1,
    mousePressX: stap.klik?.x ?? -1,
    mousePressY: stap.klik?.y ?? -1,
    mouseDown: false,
    mouseClicked: !!stap.klik,
    // The pointer has already left: a click counts where it was pressed.
    mouseOver: false,
    isDown: (c: string) => keys.has(c),
    justPressed: (c: string) => keys.has(c),
    confirmed: () => keys.has('Enter') || keys.has('Space'),
  } as unknown as Input;
  return {
    screen: undefined as never, input,
    push: (s: Scene) => { gepusht.push(s); },
    pop: () => { weg.n++; },
    replace: () => {},
  };
}

const KNOP = { x: WIDTH - 60, y: 180 };

test('the title opens the jukebox on its button and on J, and does not swing', () => {
  for (const stap of [{ klik: KNOP }, { keys: ['KeyJ'] }] as Stap[]) {
    for (const save of [new Save(null), (() => { const s = new Save(null); s.record('leeghalen-woonkamer', 1, 3); return s; })()]) {
      const gepusht: Scene[] = [];
      const titel = new TitleScene(save);
      titel.update(1 / 60, context(stap, gepusht, { n: 0 }));
      assert.equal(gepusht.length, 1);
      assert.ok(gepusht[0] instanceof JukeboxScene, 'not the poem, not the house map');
    }
  }
  // A click anywhere else still starts the game.
  const gepusht: Scene[] = [];
  new TitleScene(new Save(null)).update(1 / 60, context({ klik: { x: 40, y: 60 } }, gepusht, { n: 0 }));
  assert.ok(gepusht[0] instanceof IntroScene);
});

test('the jukebox is quiet until a song is picked, and picking it again stops it', () => {
  const j = new JukeboxScene();
  const ctx = (s: Stap) => context(s, [], { n: 0 });
  const op = () => j.muziek?.lied ?? null;
  assert.equal(op(), null);
  j.update(1 / 60, ctx({ keys: ['Enter'] }));
  assert.equal(op(), LIEDJES[0]);
  j.update(1 / 60, ctx({ keys: ['ArrowDown'] }));
  j.update(1 / 60, ctx({ keys: ['Enter'] }));
  assert.equal(op(), LIEDJES[1]);
  j.update(1 / 60, ctx({ keys: ['Enter'] }));
  assert.equal(op(), null);
  // Clicking a row plays that song.
  j.update(1 / 60, ctx({ klik: { x: 100, y: 25 + 25 * 4 + 5 } }));
  assert.equal(op(), LIEDJES[4]);
});

test('Escape and the back button leave the jukebox', () => {
  for (const stap of [{ keys: ['Escape'] }, { klik: { x: 20, y: HEIGHT - 6 } }] as Stap[]) {
    const weg = { n: 0 };
    new JukeboxScene().update(1 / 60, context(stap, [], weg));
    assert.equal(weg.n, 1);
  }
});
