import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CELL, TOOLS, toolById, parseGrid, cloneGrid, at, isLegal, swing,
  rubbleCount, isSolved, stars, isProtected,
} from './model.ts';
import { solve } from './solver.ts';
import { SLOOP_LEVELS, gridFor } from './levels.ts';

const beitel = toolById('beitel');
const voorhamer = toolById('voorhamer');

test('parseGrid reads the ASCII art', () => {
  const grid = parseGrid(['.#B', 'LK#']);
  assert.equal(grid.width, 3);
  assert.equal(grid.height, 2);
  assert.equal(at(grid, 0, 0), CELL.LEEG);
  assert.equal(at(grid, 1, 0), CELL.PUIN);
  assert.equal(at(grid, 2, 0), CELL.BALK);
  assert.equal(at(grid, 0, 1), CELL.LEIDING);
  assert.equal(at(grid, 1, 1), CELL.KABEL);
});

test('parseGrid rejects ragged and unknown input', () => {
  assert.throws(() => parseGrid(['##', '#']), /ragged/);
  assert.throws(() => parseGrid(['#X']), /unknown cell/);
  assert.throws(() => parseGrid([]), /empty/);
});

test('a swing that would touch a beam is refused', () => {
  const grid = parseGrid(['###', '#B#', '###']);
  assert.equal(isLegal(grid, voorhamer, 1, 1), false);
  assert.equal(swing(grid, voorhamer, 1, 1), -1);
  assert.equal(rubbleCount(grid), 8, 'a refused swing must not change the wall');
});

test('the footprint clips at the edge instead of wrapping', () => {
  const grid = parseGrid(['##', '##']);
  assert.equal(isLegal(grid, voorhamer, 0, 0), true);
  assert.equal(swing(grid, voorhamer, 0, 0), 4);
  assert.ok(isSolved(grid));
});

test('a chisel can always clear its own rubble cell', () => {
  const grid = parseGrid(['#B', 'B#']);
  assert.equal(swing(grid, beitel, 0, 0), 1);
  assert.equal(swing(grid, beitel, 1, 1), 1);
  assert.ok(isSolved(grid));
});

test('clearing already-open cells counts as nothing', () => {
  const grid = parseGrid(['...', '.#.', '...']);
  assert.equal(swing(grid, voorhamer, 1, 1), 1);
  assert.equal(swing(grid, voorhamer, 1, 1), 0);
});

test('protected cells are the three hazards', () => {
  assert.ok(isProtected(CELL.BALK) && isProtected(CELL.LEIDING) && isProtected(CELL.KABEL));
  assert.ok(!isProtected(CELL.PUIN) && !isProtected(CELL.LEEG));
});

test('the solver finds the obvious optimum', () => {
  // One clean 3x3 of rubble: exactly one sledge swing.
  assert.equal(solve(parseGrid(['###', '###', '###'])).par, 1);
  // A beam through the middle forces chisels down each side.
  assert.equal(solve(parseGrid(['#B#'])).par, 2);
  // Nothing to do.
  assert.equal(solve(parseGrid(['...'])).par, 0);
});

test('the solver prefers one sledge over three chisels', () => {
  const { par, moves } = solve(parseGrid(['###', '###', '###']));
  assert.equal(par, 1);
  assert.equal(moves[0]!.tool.id, 'voorhamer');
});

test('every shipped level is solvable, and its par is reachable', () => {
  for (const level of SLOOP_LEVELS) {
    const { par, moves } = solve(gridFor(level));
    assert.ok(par > 0, `${level.id} has nothing to clear`);
    assert.equal(moves.length, par, `${level.id} par disagrees with its own solution`);

    // Replay the solver's own answer and check the wall actually comes down.
    const grid = gridFor(level);
    for (const move of moves) {
      assert.notEqual(swing(grid, move.tool, move.x, move.y), -1, `${level.id} played an illegal swing`);
    }
    assert.ok(isSolved(grid), `${level.id} is not finished by its optimal line`);
  }
});

test('no shipped level has rubble that cannot be reached', () => {
  for (const level of SLOOP_LEVELS) {
    assert.doesNotThrow(() => solve(gridFor(level)), `${level.id} has unreachable rubble`);
  }
});

test('levels are hard enough to be worth playing', () => {
  for (const level of SLOOP_LEVELS) {
    const par = solve(gridFor(level)).par;
    assert.ok(par >= 3, `${level.id} is over in ${par} swings`);
    assert.ok(par <= 20, `${level.id} needs ${par} swings, which is a chore`);
  }
});

test('stars are awarded against par', () => {
  assert.equal(stars(5, 5), 3);
  assert.equal(stars(4, 5), 3);
  assert.equal(stars(6, 5), 2);
  assert.equal(stars(7, 5), 2);
  assert.equal(stars(8, 5), 1);
});

test('cloneGrid leaves the original alone', () => {
  const grid = parseGrid(['##', '##']);
  const copy = cloneGrid(grid);
  swing(copy, voorhamer, 0, 0);
  assert.equal(rubbleCount(grid), 4);
  assert.equal(rubbleCount(copy), 0);
});

test('every tool has a sane footprint', () => {
  for (const tool of TOOLS) {
    assert.ok(tool.offsets.length > 0, `${tool.id} hits nothing`);
    assert.ok(tool.offsets.some(([dx, dy]) => dx === 0 && dy === 0), `${tool.id} misses what you aim at`);
  }
});

test('the level set teaches every tool', () => {
  const used = new Set<string>();
  for (const level of SLOOP_LEVELS) {
    for (const move of solve(gridFor(level)).moves) used.add(move.tool.id);
  }
  for (const tool of TOOLS) {
    assert.ok(used.has(tool.id), `nothing in the level set needs the ${tool.naam}`);
  }
});

test('difficulty climbs across the set', () => {
  const pars = SLOOP_LEVELS.map((l) => solve(gridFor(l)).par);
  assert.deepEqual(pars, [...pars].sort((a, b) => a - b), `pars go ${pars.join(', ')}`);
});
