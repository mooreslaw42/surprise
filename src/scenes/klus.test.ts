import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Klus } from './klus.ts';
import { Save } from '../engine/save.ts';
import type { Input } from '../engine/input.ts';
import type { Scene, SceneContext } from '../engine/scene.ts';
import type { Screen } from '../engine/screen.ts';

/** A level that does nothing, so the wrapper is all that is being tested. */
const stil: Scene = { update: () => {}, render: () => {} };

function context(enter: boolean, klik: boolean): SceneContext {
  const input = {
    mouseX: 0, mouseY: 0, mouseDown: false, mouseClicked: klik,
    justPressed: (code: string) => enter && code === 'Enter',
    isDown: () => false,
    confirmed: () => enter,
  } as unknown as Input;
  return {
    screen: undefined as unknown as Screen, input,
    push: () => {}, pop: () => {}, replace: () => {}, geluid: () => {},
  };
}

/** How many times the tool breaks in this many seconds of work, pressing Enter through every line. */
function breuken(seconden: number): number {
  const klus = new Klus(stil, { id: 'elektra-x', save: new Save(null), pech: 'elektra' });
  const k = klus as unknown as { krak: number };
  let n = 0;
  let was = -1;
  // One click to start the clock, then frames, with Enter held every other frame.
  klus.update(0.05, context(false, true));
  for (let t = 0, i = 0; t < seconden; t += 0.05, i++) {
    klus.update(0.05, context(i % 2 === 0, false));
    if (was < 0 && k.krak >= 0) n++;
    was = k.krak;
  }
  return n;
}

test('a tool breaks once on a wall, and Enter gets you past it', () => {
  // It used to break again the moment Pim had handed over the new one.
  assert.equal(breuken(120), 1);
});
