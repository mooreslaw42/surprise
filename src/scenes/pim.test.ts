import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PixelBuffer } from '../engine/pixelbuffer.ts';
import { drawPim, PIM_W, PIM_H } from './pim.ts';

const MARGIN = 24;

function render(talking = false): PixelBuffer {
  const buf = new PixelBuffer(PIM_W + MARGIN * 2, PIM_H + MARGIN * 2);
  drawPim(buf, MARGIN, MARGIN, talking);
  return buf;
}

test('the sprite stays inside the size it advertises', () => {
  for (const talking of [false, true]) {
    const buf = render(talking);
    for (let y = 0; y < buf.height; y++) {
      for (let x = 0; x < buf.width; x++) {
        const inside = x >= MARGIN && x < MARGIN + PIM_W && y >= MARGIN && y < MARGIN + PIM_H;
        if (!inside && buf.get(x, y) !== 0) {
          assert.fail(`drew at ${x - MARGIN},${y - MARGIN}, outside ${PIM_W}x${PIM_H}`);
        }
      }
    }
  }
});

test('he is actually drawn, and the mouth moves when talking', () => {
  const quiet = render(false);
  const talking = render(true);
  let painted = 0;
  for (let i = 0; i < quiet.pixels.length; i++) if (quiet.pixels[i] !== 0) painted++;
  assert.ok(painted > PIM_W * PIM_H * 0.4, `only ${painted} pixels drawn`);
  assert.notDeepEqual(quiet.pixels, talking.pixels, 'the mouth should change');
});
