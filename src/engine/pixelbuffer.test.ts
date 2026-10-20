import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PixelBuffer } from './pixelbuffer.ts';

/** Count how many pixels hold a given colour. */
function count(buf: PixelBuffer, color: number): number {
  let n = 0;
  for (const p of buf.pixels) if (p === color) n++;
  return n;
}

test('fillRect fills exactly the requested area', () => {
  const buf = new PixelBuffer(20, 10);
  buf.fillRect(2, 3, 5, 4, 7);
  assert.equal(count(buf, 7), 20);
  assert.equal(buf.get(2, 3), 7);
  assert.equal(buf.get(6, 6), 7);
  assert.equal(buf.get(7, 3), 0);
  assert.equal(buf.get(2, 7), 0);
});

test('fillRect clips to the left edge without wrapping', () => {
  const buf = new PixelBuffer(20, 10);
  buf.fillRect(-5, 0, 8, 2, 7);
  assert.equal(count(buf, 7), 6);
  assert.equal(buf.get(0, 0), 7);
  assert.equal(buf.get(2, 1), 7);
  assert.equal(buf.get(3, 0), 0);
});

test('a rect entirely off the left edge paints nothing', () => {
  // Regression: a 1px-wide rect at x=-3 gave x1 = -2, and Uint8Array.fill()
  // reads a negative end as relative to the array end, so this used to paint
  // almost the whole buffer and wipe everything drawn before it.
  const buf = new PixelBuffer(20, 10);
  buf.fillRect(-3, 0, 1, 10, 9);
  assert.equal(count(buf, 9), 0);
});

test('rects off every other edge paint nothing', () => {
  const buf = new PixelBuffer(20, 10);
  buf.fillRect(20, 0, 5, 5, 9);
  buf.fillRect(0, -4, 5, 2, 9);
  buf.fillRect(0, 10, 5, 5, 9);
  assert.equal(count(buf, 9), 0);
});

test('zero and negative sized rects paint nothing', () => {
  const buf = new PixelBuffer(20, 10);
  buf.fillRect(5, 5, 0, 5, 9);
  buf.fillRect(5, 5, 5, 0, 9);
  buf.fillRect(5, 5, -5, -5, 9);
  assert.equal(count(buf, 9), 0);
});

test('ditherRect alternates and clips the same way', () => {
  const buf = new PixelBuffer(20, 10);
  buf.ditherRect(0, 0, 4, 2, 1, 2);
  assert.equal(buf.get(0, 0), 1);
  assert.equal(buf.get(1, 0), 2);
  assert.equal(buf.get(0, 1), 2);
  assert.equal(buf.get(1, 1), 1);

  const off = new PixelBuffer(20, 10);
  off.ditherRect(-6, 0, 4, 4, 1, 2);
  assert.equal(count(off, 1) + count(off, 2), 0);
});

test('strokeRect draws a hollow outline', () => {
  const buf = new PixelBuffer(20, 10);
  buf.strokeRect(1, 1, 5, 4, 3);
  assert.equal(count(buf, 3), 5 * 2 + (4 - 2) * 2);
  assert.equal(buf.get(1, 1), 3);
  assert.equal(buf.get(3, 2), 0);
});

test('set and get clip out of bounds', () => {
  const buf = new PixelBuffer(20, 10);
  buf.set(-1, 5, 9);
  buf.set(20, 5, 9);
  buf.set(5, 10, 9);
  assert.equal(count(buf, 9), 0);
  assert.equal(buf.get(-1, -1), 0);
});

test('line draws connected endpoints', () => {
  const buf = new PixelBuffer(20, 10);
  buf.line(0, 0, 9, 9, 4);
  assert.equal(buf.get(0, 0), 4);
  assert.equal(buf.get(9, 9), 4);
  assert.equal(buf.get(5, 5), 4);
});

test('text stays inside the buffer when drawn off-edge', () => {
  const buf = new PixelBuffer(20, 10);
  buf.text('WOUTER', -8, -3, 5);
  buf.text('WOUTER', 15, 8, 5);
  assert.ok(count(buf, 5) > 0);
});
