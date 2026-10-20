import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PALETTE, PALETTE_NAMES, C, MATERIAL, luma } from './palette.ts';

test('palette, names and indices agree', () => {
  assert.equal(PALETTE.length, 24);
  assert.equal(PALETTE_NAMES.length, 24);
  for (const [name, index] of Object.entries(C)) {
    assert.equal(PALETTE_NAMES[index], name, `C.${name} should sit at index ${index}`);
  }
});

test('every colour is a well formed hex triplet', () => {
  for (const hex of PALETTE) assert.match(hex, /^#[0-9a-f]{6}$/);
});

test('every material points at a real palette entry', () => {
  for (const [name, index] of Object.entries(MATERIAL)) {
    assert.ok(index >= 0 && index < PALETTE.length, `${name} out of range`);
  }
});

test('each ramp climbs in lightness with usable separation', () => {
  const ramps = [
    [C.DONKERSALIE, C.SALIE, C.LICHTSALIE],
    [C.DONKEROKER, C.OKER, C.LICHTOKER],
    [C.DONKERROOD, C.TERRACOTTA, C.ROESTROOD],
    [C.MAHONIE, C.HOUT, C.LICHTHOUT],
    [C.ZWART, C.ROET, C.STEEN, C.ASGRIJS, C.ZANDGRIJS, C.KALK, C.WIT],
  ];
  for (const ramp of ramps) {
    for (let i = 1; i < ramp.length; i++) {
      const step = luma(ramp[i]!) - luma(ramp[i - 1]!);
      assert.ok(step > 18, `step ${i} of ramp is only ${step.toFixed(1)} apart`);
    }
  }
});

test('the palette covers the whole value range', () => {
  const values = PALETTE.map((_, i) => luma(i));
  assert.ok(Math.min(...values) < 25, 'needs a true black');
  assert.ok(Math.max(...values) > 225, 'needs a true white');
});
