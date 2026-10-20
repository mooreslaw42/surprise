import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TILE, type Board, type Route,
  axisAt, axesCompatible, cableLength, faults, isSolved, routable, stars, tileAt,
} from './model.ts';
import { solve } from './solver.ts';
import { ELEKTRA_LEVELS, boardFor } from './levels.ts';
import { SURFACES } from '../../data/house.ts';

/** A 5x3 open wall with the meterkast bottom-left. */
function openBoard(stopcontacten: { x: number; y: number }[]): Board {
  const width = 5;
  const height = 3;
  const board: Board = {
    width, height,
    tiles: new Array(width * height).fill(TILE.MUUR),
    meterkast: { x: 0, y: 2 },
    stopcontacten,
    belasting: stopcontacten.map(() => 2),
    maxAmp: 16,
  };
  board.tiles[2 * width + 0] = TILE.METERKAST;
  for (const s of stopcontacten) board.tiles[s.y * width + s.x] = TILE.STOPCONTACT;
  return board;
}

test('a straight run is horizontal or vertical, a bend is a corner', () => {
  const route: Route = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }];
  assert.equal(axisAt(route, 1), 'h');
  assert.equal(axisAt(route, 2), 'hoek');
});

test('only a straight horizontal and a straight vertical cross', () => {
  assert.equal(axesCompatible('h', 'v'), false);
  assert.equal(axesCompatible('v', 'h'), false);
  assert.equal(axesCompatible('h', 'h'), true, 'parallel runs share a chase');
  assert.equal(axesCompatible('v', 'v'), true);
  assert.equal(axesCompatible('hoek', 'h'), true, 'a corner shares a port, it does not cross');
  assert.equal(axesCompatible('hoek', 'v'), true);
  assert.equal(axesCompatible('hoek', 'hoek'), true);
});

test('a cable cannot be chased through a window', () => {
  const board = openBoard([{ x: 4, y: 0 }]);
  board.tiles[1 * board.width + 2] = TILE.GESLOTEN;
  assert.equal(routable(board, { x: 2, y: 1 }), false);
  assert.equal(tileAt(board, { x: 2, y: 1 }), TILE.GESLOTEN);
});

test('a crossing is reported', () => {
  const board = openBoard([{ x: 2, y: 0 }, { x: 4, y: 1 }]);
  // One run straight down the middle column, one straight across the middle row.
  const down: Route = [{ x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 1, y: 2 }, { x: 0, y: 2 }];
  const across: Route = [{ x: 4, y: 1 }, { x: 3, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: 0, y: 2 }];
  const found = faults(board, [down, across]);
  assert.ok(found.some((f) => f.kind === 'kruising'), 'should see the crossing at 2,1');
});

test('parallel runs down the same corridor are fine', () => {
  const board = openBoard([{ x: 3, y: 2 }, { x: 4, y: 2 }]);
  const a: Route = [{ x: 3, y: 2 }, { x: 2, y: 2 }, { x: 1, y: 2 }, { x: 0, y: 2 }];
  const b: Route = [{ x: 4, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 2 }, { x: 1, y: 2 }, { x: 0, y: 2 }];
  assert.deepEqual(faults(board, [a, b]).filter((f) => f.kind === 'kruising'), []);
});

test('an unfinished or broken run is reported', () => {
  const board = openBoard([{ x: 4, y: 0 }]);
  assert.ok(faults(board, [[]]).some((f) => f.kind === 'los'));
  const jump: Route = [{ x: 4, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 2 }];
  assert.ok(faults(board, [jump]).some((f) => f.kind === 'onderbroken'));
});

test('an overloaded group is reported', () => {
  const board = { ...openBoard([{ x: 4, y: 0 }]), belasting: [20], maxAmp: 16 };
  assert.ok(faults(board, [[{ x: 4, y: 0 }, { x: 3, y: 0 }]]).some((f) => f.kind === 'overbelast'));
});

test('the solver wires every shipped level, and its answer is legal', () => {
  for (const level of ELEKTRA_LEVELS) {
    const { par, routes } = solve(level.board);
    assert.ok(par > 0, `${level.id} has nothing to wire`);
    assert.equal(routes.length, level.board.stopcontacten.length, `${level.id} left a socket out`);
    assert.deepEqual(faults(level.board, routes), [], `${level.id}: the solver's own answer is not legal`);
    assert.ok(isSolved(level.board, routes), `${level.id} is not solved by par`);
    assert.equal(cableLength(routes), par, `${level.id} par disagrees with its own routes`);
  }
});

test('par is at least the sum of the shortest possible runs', () => {
  for (const level of ELEKTRA_LEVELS) {
    const { par } = solve(level.board);
    let floor = 0;
    for (const socket of level.board.stopcontacten) {
      floor += Math.abs(socket.x - level.board.meterkast.x) + Math.abs(socket.y - level.board.meterkast.y);
    }
    assert.ok(par >= floor, `${level.id}: par ${par} beats the straight-line floor ${floor}`);
  }
});

test('every socket and the meterkast sit on a cell cable can reach', () => {
  for (const surface of SURFACES) {
    const board = boardFor(surface);
    assert.ok(routable(board, board.meterkast), `${surface.id}: meterkast is walled in`);
    for (const socket of board.stopcontacten) {
      assert.ok(routable(board, socket), `${surface.id}: a socket is inside a window`);
    }
  }
});

test('stars are awarded against par', () => {
  assert.equal(stars(20, 20), 3);
  assert.equal(stars(23, 20), 2);
  assert.equal(stars(24, 20), 1);
});
