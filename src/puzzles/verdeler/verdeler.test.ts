import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dicht, draaiKraan, heeftKraan, isSolved, parseVerdeler, raakt, stars,
} from './model.ts';
import { solve } from './solver.ts';
import { VERDELER_LEVELS } from './levels.ts';

test('parseVerdeler reads which loops run and which have no valve', () => {
  const v = parseVerdeler(['O.#', '..O']);
  assert.equal(v.width, 3);
  assert.deepEqual(v.open, [true, false, false, false, false, true]);
  assert.equal(heeftKraan(v, 2), false, 'the # has no valve');
  assert.ok(heeftKraan(v, 0));
  assert.throws(() => parseVerdeler(['OO', 'O']), /ragged/);
  assert.throws(() => parseVerdeler(['Ox']), /unknown manifold cell/);
});

test('a valve flips its own loop and the ones beside it', () => {
  const v = parseVerdeler(['...', '...', '...']);
  assert.deepEqual(raakt(v, 4).sort((a, b) => a - b), [1, 3, 4, 5, 7], 'the middle touches four');
  assert.deepEqual(raakt(v, 0).sort((a, b) => a - b), [0, 1, 3], 'a corner touches two');

  const na = draaiKraan(v, v.open, 4);
  assert.deepEqual(na, [false, true, false, true, true, true, false, true, false]);
});

test('turning the same valve twice changes nothing', () => {
  const v = parseVerdeler(['OO', '..']);
  const eenmaal = draaiKraan(v, v.open, 0);
  const tweemaal = draaiKraan(v, eenmaal, 0);
  assert.deepEqual(tweemaal, v.open);
});

test('order makes no difference to where you end up', () => {
  const v = parseVerdeler(['...', '...', '...']);
  const heen = draaiKraan(v, draaiKraan(v, v.open, 0), 4);
  const terug = draaiKraan(v, draaiKraan(v, v.open, 4), 0);
  assert.deepEqual(heen, terug);
});

test('a loop without a valve cannot be turned directly', () => {
  const v = parseVerdeler(['.#.']);
  assert.deepEqual(draaiKraan(v, v.open, 1), v.open, 'nothing happens');
  // But its neighbour drags it along.
  assert.equal(draaiKraan(v, v.open, 0)[1], true);
});

test('every manifold balances, and par is the fewest valves', () => {
  for (const level of VERDELER_LEVELS) {
    const { par, kranen } = solve(level.verdeler);
    assert.equal(kranen.length, par, `${level.id} par disagrees with its own answer`);
    assert.ok(par > 0, `${level.id} starts balanced`);

    let open = [...level.verdeler.open];
    for (const k of kranen) {
      assert.ok(heeftKraan(level.verdeler, k), `${level.id}: turned a loop with no valve`);
      open = draaiKraan(level.verdeler, open, k);
    }
    assert.ok(isSolved(open), `${level.id} is not balanced by its own par line`);
    assert.equal(dicht(open), 0);
  }
});

test('no valve is worth turning twice in an answer', () => {
  for (const level of VERDELER_LEVELS) {
    const { kranen } = solve(level.verdeler);
    assert.equal(new Set(kranen).size, kranen.length, `${level.id} turns a valve twice`);
  }
});

test('a manifold that cannot be balanced is refused, not shipped', () => {
  // Two loops side by side: either valve flips both, so one shut and one open
  // can never be made to match.
  const onmogelijk = parseVerdeler(['O.']);
  assert.throws(() => solve(onmogelijk), /cannot be balanced/);
});

test('the manifolds get harder as they go', () => {
  const pars = VERDELER_LEVELS.map((l) => solve(l.verdeler).par);
  assert.deepEqual(pars, [...pars].sort((a, b) => a - b), `pars go ${pars.join(', ')}`);
  assert.ok(pars[0]! >= 3, 'even the first should take some working out');
});

test('stars are awarded against par', () => {
  assert.equal(stars(4, 4), 3);
  assert.equal(stars(6, 4), 2);
  assert.equal(stars(7, 4), 1);
});
