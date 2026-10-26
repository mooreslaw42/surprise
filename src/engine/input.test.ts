import { test } from 'node:test';
import assert from 'node:assert/strict';
import { densify } from './input.ts';

test('densify leaves a single point alone', () => {
  assert.deepEqual(densify([{ x: 3, y: 7 }]), [{ x: 3, y: 7 }]);
});

test('densify is empty for no points', () => {
  assert.deepEqual(densify([]), []);
});

test('densify fills a straight gap one pixel at a time', () => {
  const out = densify([{ x: 0, y: 0 }, { x: 4, y: 0 }]);
  assert.deepEqual(out, [
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 },
  ]);
});

test('densify never skips a cell boundary, however far the jump', () => {
  // A flick from one corner of the board to the far one, recorded as the two
  // endpoints only. Every step between them is at most one pixel in each axis,
  // so no column or row is ever stepped over.
  const out = densify([{ x: 0, y: 0 }, { x: 200, y: 137 }]);
  for (let i = 1; i < out.length; i++) {
    const dx = Math.abs(out[i]!.x - out[i - 1]!.x);
    const dy = Math.abs(out[i]!.y - out[i - 1]!.y);
    assert.ok(dx <= 1 && dy <= 1, `gap at ${i}: dx=${dx} dy=${dy}`);
  }
  assert.deepEqual(out[out.length - 1], { x: 200, y: 137 });
});
