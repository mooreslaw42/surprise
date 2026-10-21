import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  type Stuk,
  bezetting, cellsOf, hoofdIndex, isSolved, kanSchuiven, parsePlan, schuif, sleutel, stars,
} from './model.ts';
import { solve } from './solver.ts';
import { SCHUIF_LEVELS } from './levels.ts';

const simpel = () => parsePlan([
  '......',
  '..A...',
  'TTA...',
  '..A...',
  '......',
  '......',
]);

test('parsePlan reads runs of a letter as one piece', () => {
  const plan = simpel();
  const a = plan.stukken.find((s) => s.id === 'A')!;
  assert.equal(a.orientatie, 'verticaal');
  assert.equal(a.lengte, 3);
  assert.deepEqual(cellsOf(a), [{ x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }]);
  const t = plan.stukken.find((s) => s.hoofd)!;
  assert.equal(t.orientatie, 'horizontaal');
  assert.equal(plan.aansluiting.y, t.y, 'the outlet lines up with the hoofdkanaal');
});

test('parsePlan rejects drawings it cannot make sense of', () => {
  assert.throws(() => parsePlan(['TTA', 'TT']), /ragged/);
  assert.throws(() => parsePlan(['TT.A.A']), /broken in two/);
  assert.throws(() => parsePlan(['TT.A..', '...A..', '..AA..']), /not a straight run/);
  assert.throws(() => parsePlan(['AA....']), /no hoofdkanaal/);
  assert.throws(() => parsePlan(['TT...A']), /only one cell/);
  assert.throws(() => parsePlan(['T.....', 'T.....', 'AA....']), /must lie horizontally/);
});

test('a piece only slides along its own axis', () => {
  const plan = simpel();
  const a = plan.stukken.findIndex((s) => s.id === 'A');
  // A is vertical: it can go up and down, and the slide changes only y.
  assert.ok(kanSchuiven(plan, plan.stukken, a, 1));
  const moved = schuif(plan, plan.stukken, a, 1);
  assert.equal(moved[a]!.y, plan.stukken[a]!.y + 1);
  assert.equal(moved[a]!.x, plan.stukken[a]!.x);
});

test('a piece stops against another piece and against the edge', () => {
  const plan = simpel();
  const t = hoofdIndex(plan.stukken);
  assert.equal(kanSchuiven(plan, plan.stukken, t, 1), false, 'A is in the way');
  assert.equal(kanSchuiven(plan, plan.stukken, t, -1), false, 'the wall is in the way');
});

test('a fixed obstacle blocks just as a piece does', () => {
  const plan = parsePlan([
    '......',
    '......',
    'TT.#..',
    '......',
    '......',
    '......',
  ]);
  const t = hoofdIndex(plan.stukken);
  assert.ok(kanSchuiven(plan, plan.stukken, t, 1));
  assert.equal(kanSchuiven(plan, plan.stukken, t, 2), false, 'the chimney is in the way');
});

test('an illegal slide leaves the board exactly as it was', () => {
  const plan = simpel();
  const t = hoofdIndex(plan.stukken);
  const before = sleutel(plan.stukken);
  assert.equal(sleutel(schuif(plan, plan.stukken, t, 1)), before);
});

test('bezetting marks pieces, fixed cells and empty space apart', () => {
  const plan = parsePlan(['......', '......', 'TT.#..', '......', '......', '......']);
  const grid = bezetting(plan, plan.stukken);
  assert.equal(grid[2 * plan.width + 0], hoofdIndex(plan.stukken));
  assert.equal(grid[2 * plan.width + 3], -2, 'fixed');
  assert.equal(grid[2 * plan.width + 4], -1, 'empty');
});

test('solved only once the hoofdkanaal reaches the far edge', () => {
  const plan = simpel();
  assert.equal(isSolved(plan, plan.stukken), false);
  const out: Stuk[] = plan.stukken.map((s) => (s.hoofd ? { ...s, x: 4 } : s));
  assert.ok(isSolved(plan, out));
});

test('every shipped plan is solvable, and par is the shortest way', () => {
  for (const level of SCHUIF_LEVELS) {
    const { par, zetten } = solve(level.plan);
    assert.equal(zetten.length, par, `${level.id} par disagrees with its own line`);
    assert.ok(par > 0, `${level.id} starts solved`);

    // Replay it and check the plan actually comes out.
    let stukken = level.plan.stukken.map((s) => ({ ...s }));
    for (const zet of zetten) {
      const i = stukken.findIndex((s) => s.id === zet.id);
      assert.ok(i >= 0, `${level.id}: no piece ${zet.id}`);
      assert.ok(kanSchuiven(level.plan, stukken, i, zet.stap), `${level.id}: illegal slide of ${zet.id}`);
      stukken = schuif(level.plan, stukken, i, zet.stap);
    }
    assert.ok(isSolved(level.plan, stukken), `${level.id} is not solved by its own par line`);
  }
});

test('no plan can be solved in fewer moves than par', () => {
  // Breadth-first, so the first solution found is the shortest by definition;
  // this guards the claim rather than re-deriving it.
  for (const level of SCHUIF_LEVELS) {
    const { par } = solve(level.plan);
    let stukken = level.plan.stukken.map((s) => ({ ...s }));
    let moves = 0;
    while (!isSolved(level.plan, stukken) && moves < par) {
      const next = solve({ ...level.plan, stukken }).zetten[0]!;
      const i = stukken.findIndex((s) => s.id === next.id);
      stukken = schuif(level.plan, stukken, i, next.stap);
      moves++;
    }
    assert.equal(moves, par, `${level.id} solved in ${moves} following the solver one move at a time`);
  }
});

test('the rooms get harder as they go', () => {
  const pars = SCHUIF_LEVELS.map((l) => solve(l.plan).par);
  assert.deepEqual(pars, [...pars].sort((a, b) => a - b), `pars go ${pars.join(', ')}`);
  assert.ok(pars[0]! >= 4, 'even the first should take some thought');
});

test('stars are awarded against par', () => {
  assert.equal(stars(6, 6), 3);
  assert.equal(stars(10, 6), 2);
  assert.equal(stars(11, 6), 1);
});
