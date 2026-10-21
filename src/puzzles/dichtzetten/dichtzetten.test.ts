import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MERK, type MerkWaarde, faults, hints, isSolved, maakWand, missers, stars } from './model.ts';
import { HOUT, ONBEKEND, eenduidig, lijnSlag, solve, volgende } from './solver.ts';
import { DICHT_LEVELS } from './levels.ts';

test('hints count the runs of timber in order', () => {
  assert.deepEqual(hints([true, true, false, true]), [2, 1]);
  assert.deepEqual(hints([false, false]), [0], 'an empty line still says something');
  assert.deepEqual(hints([true, true, true]), [3]);
});

test('maakWand works the numbers out from the frame', () => {
  const w = maakWand(['##.', '#.#']);
  assert.deepEqual(w.rijHints[0], [2]);
  assert.deepEqual(w.rijHints[1], [1, 1]);
  assert.deepEqual(w.kolomHints[0], [2]);
  assert.deepEqual(w.kolomHints[2], [1]);
  assert.throws(() => maakWand(['##', '#']), /ragged/);
  assert.throws(() => maakWand(['#q']), /unknown frame cell/);
});

test('a line says only what every arrangement agrees on', () => {
  // A run of three in a line of four: the middle two are certain either way.
  const slag = lijnSlag([3], new Array(4).fill(ONBEKEND))!;
  assert.deepEqual(slag, [ONBEKEND, HOUT, HOUT, ONBEKEND]);
  // A run that exactly fills is certain everywhere.
  assert.deepEqual(lijnSlag([4], new Array(4).fill(ONBEKEND)), [HOUT, HOUT, HOUT, HOUT]);
});

test('numbers that fit nothing are reported rather than guessed around', () => {
  assert.equal(lijnSlag([5], new Array(4).fill(ONBEKEND)), null);
});

test('marking timber that is not there is a miss', () => {
  const w = maakWand(['#.', '.#']);
  const merken: MerkWaarde[] = [MERK.HOUT, MERK.HOUT, MERK.ONBEKEND, MERK.ONBEKEND];
  assert.equal(missers(w, merken), 1);
  assert.ok(faults(w, merken).some((f) => f.kind === 'mis'));
  assert.ok(faults(w, merken).some((f) => f.kind === 'open'), 'and one is still to find');
});

test('the wall is done when every stud is marked and nothing else is', () => {
  const w = maakWand(['#.', '.#']);
  assert.ok(isSolved(w, [MERK.HOUT, MERK.LEEG, MERK.LEEG, MERK.HOUT]));
  assert.ok(isSolved(w, [MERK.HOUT, MERK.ONBEKEND, MERK.ONBEKEND, MERK.HOUT]),
    'leaving the gaps blank is fine; they are not timber');
  assert.equal(isSolved(w, [MERK.HOUT, MERK.ONBEKEND, MERK.ONBEKEND, MERK.ONBEKEND]), false);
});

test('every shipped wall can be reasoned out without guessing', () => {
  for (const level of DICHT_LEVELS) {
    assert.ok(eenduidig(level.wand), `${level.id} needs a guess somewhere`);
    const { kennis, volledig } = solve(level.wand);
    assert.ok(volledig, `${level.id} does not resolve`);
    kennis.forEach((v, i) => {
      assert.equal(v === HOUT, level.wand.hout[i], `${level.id}: square ${i} resolves wrongly`);
    });
  }
});

test('a wall needing a guess is not called solvable', () => {
  // Two diagonals describe the same numbers, so the frame is ambiguous.
  assert.equal(eenduidig(maakWand(['#.', '.#'])), false);
});

test('the hint only ever names a square reasoning would reach', () => {
  for (const level of DICHT_LEVELS) {
    const leeg = new Array(level.wand.hout.length).fill(ONBEKEND);
    const i = volgende(level.wand, leeg);
    assert.ok(i >= 0, `${level.id}: no first move`);
    assert.ok(level.wand.hout[i], `${level.id}: the hint points at thin air`);
  }
});

test('the walls get bigger as they go', () => {
  const vlak = DICHT_LEVELS.map((l) => l.wand.width * l.wand.height);
  assert.deepEqual(vlak, [...vlak].sort((a, b) => a - b), `areas go ${vlak.join(', ')}`);
});

test('stars are awarded on missed screws', () => {
  assert.equal(stars(0), 3);
  assert.equal(stars(3), 2);
  assert.equal(stars(4), 1);
});
