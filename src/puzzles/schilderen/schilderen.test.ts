import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buren, faults, isSolved, magOp, overlap, parseMuur, stars, teVerven } from './model.ts';
import { oplossingen, solve } from './solver.ts';
import { SCHILDER_LEVELS } from './levels.ts';

const klein = () => parseMuur(['X#', '##']);

test('parseMuur reads the wall and where the painter starts', () => {
  const m = parseMuur(['X#.', '###']);
  assert.equal(m.start, 0);
  assert.equal(teVerven(m), 5, 'the opening is not painted');
  assert.equal(m.verfbaar[2], false);
  assert.throws(() => parseMuur(['##', '#']), /ragged/);
  assert.throws(() => parseMuur(['Xq']), /unknown wall cell/);
  assert.throws(() => parseMuur(['##']), /no starting point/);
});

test('the roller only moves to a square it is touching', () => {
  const m = klein();
  assert.deepEqual(buren(m, 0).sort((a, b) => a - b), [1, 2]);
  assert.ok(faults(m, [0, 3]).some((f) => f.kind === 'sprong'), 'no jumping across');
});

test('a run has to start where the painter does', () => {
  const m = klein();
  assert.ok(faults(m, [1, 0, 2, 3]).some((f) => f.kind === 'begin'));
});

test('the roller cannot go over a window', () => {
  const m = parseMuur(['X.', '##']);
  assert.ok(faults(m, [0, 1]).some((f) => f.kind === 'raam'));
});

test('a bare square keeps the wall unfinished', () => {
  const m = klein();
  assert.ok(faults(m, [0, 1]).some((f) => f.kind === 'kaal'));
  assert.equal(isSolved(m, [0, 1]), false);
  assert.ok(isSolved(m, [0, 1, 3, 2]), 'all four, in one run');
});

test('going over the same square twice is allowed but counted', () => {
  const m = klein();
  const slordig = [0, 1, 0, 2, 3];
  assert.equal(overlap(slordig), 1);
  assert.ok(isSolved(m, slordig), 'it still covers the wall');
  assert.ok(slordig.length > teVerven(m), 'but it took more rolling than it should');
});

test('every wall can be done in a single run, and par is its size', () => {
  for (const level of SCHILDER_LEVELS) {
    const { par, streek } = solve(level.muur);
    assert.deepEqual(faults(level.muur, streek), [], `${level.id}: the solver's own run is not legal`);
    assert.ok(isSolved(level.muur, streek), `${level.id} is not finished at par`);
    assert.equal(overlap(streek), 0, `${level.id}: the best run should not double back`);
    assert.equal(par, teVerven(level.muur), `${level.id} par is not the number of squares`);
    assert.equal(streek.length, par, `${level.id} par disagrees with its own run`);
  }
});

test('a wall that cannot be done in one run says so', () => {
  // Two squares joined only through a window: the roller cannot get across.
  const gesplitst = parseMuur(['X.#', '#.#']);
  assert.throws(() => solve(gesplitst), /cannot be done in one run/);
});

test('the walls get bigger as they go', () => {
  const vakken = SCHILDER_LEVELS.map((l) => teVerven(l.muur));
  assert.deepEqual(vakken, [...vakken].sort((a, b) => a - b), `squares go ${vakken.join(', ')}`);
});

test('every wall painted is a wall that exists', () => {
  for (const level of SCHILDER_LEVELS) {
    assert.ok(level.surface.openings.length > 0,
      `${level.id}: a blank wall is a boustrophedon, not a puzzle`);
    assert.equal(level.muur.width * level.muur.height >= teVerven(level.muur), true);
  }
});

test('stars are awarded against par', () => {
  assert.equal(stars(51, 51), 3);
  assert.equal(stars(54, 51), 2);
  assert.equal(stars(55, 51), 1);
});

test('every shipped wall has exactly one clean run', () => {
  for (const level of SCHILDER_LEVELS) {
    assert.ok((level.muur.punten ?? []).length >= 3, `${level.id}: a wall with no ladder on it is a snake`);
    assert.equal(oplossingen(level.muur, 2).length, 1, `${level.id}: more than one way to do it cleanly`);
  }
});

test('a ladder spot is shut until the ones before it have been passed', () => {
  const m = { ...parseMuur(['X###', '####']), punten: [3, 1, 4] };
  assert.equal(magOp(m, [0], 1), false, 'spot 2 before spot 1');
  assert.equal(magOp(m, [0], 2), true, 'an ordinary square is always open');
  assert.equal(magOp(m, [0, 4], 5), true);
  assert.equal(magOp(m, [0], 4), false, 'the verfbak is the last square on the wall, not the second');
  assert.ok(faults(m, [0, 1]).some((f) => f.kind === 'volgorde'));
});

test('the verfbak opens once everything else is under', () => {
  const m = { ...parseMuur(['X###', '####']), punten: [3, 4] };
  const run = [0, 1, 2, 3, 7, 6, 5];
  assert.equal(magOp(m, run.slice(0, 4), 4), false);
  assert.equal(magOp(m, run, 4), true);
  assert.ok(isSolved(m, [...run, 4]));
});
