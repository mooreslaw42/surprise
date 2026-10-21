import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TILE, type Board, type Device, type Groep, type Route,
  axisAt, axesCompatible, cableLength, faults, groepVoor, groupLoads, groupOf, isSolved,
  endpointsFor, isTerminal, routable, stars, targetsFor, tileAt,
} from './model.ts';
import { solve } from './solver.ts';
import { ELEKTRA_LEVELS, boardFor } from './levels.ts';
import { SURFACES } from '../../data/house.ts';

/** A 5x3 open wall with one groep bottom-left, unless more are asked for. */
function openBoard(
  sockets: { x: number; y: number }[],
  belasting?: number[],
  groepen: Groep[] = [{ cel: { x: 0, y: 2 }, naam: 'WCD1', soort: 'wcd', maxAmp: 16 }],
  extra: Device[] = [],
): Board {
  const width = 5;
  const height = 3;
  const devices: Device[] = [
    ...sockets.map((cel, i): Device => ({ kind: 'stopcontact', cel, amp: belasting?.[i] ?? 2 })),
    ...extra,
  ];
  const board: Board = {
    width, height,
    tiles: new Array(width * height).fill(TILE.MUUR),
    groepen,
    devices,
  };
  for (const g of groepen) board.tiles[g.cel.y * width + g.cel.x] = TILE.METERKAST;
  for (const d of devices) board.tiles[d.cel.y * width + d.cel.x] = TILE.STOPCONTACT;
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

test('a groep over 16A trips, and splitting them does not', () => {
  const sockets = [{ x: 4, y: 0 }, { x: 4, y: 2 }];
  const groepen: Groep[] = [
    { cel: { x: 0, y: 2 }, naam: 'WCD1', soort: 'wcd', maxAmp: 16 },
    { cel: { x: 0, y: 1 }, naam: 'WCD2', soort: 'wcd', maxAmp: 16 },
  ];
  const board = openBoard(sockets, [10, 10], groepen);

  // Both on G1: 20A through one breaker.
  const bothOnG1: Route[] = [
    [{ x: 4, y: 0 }, { x: 3, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }],
    [{ x: 4, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 2 }, { x: 1, y: 2 }, { x: 0, y: 2 }],
  ];
  assert.deepEqual(groupLoads(board, bothOnG1), [20, 0]);
  assert.ok(faults(board, bothOnG1).some((f) => f.kind === 'overbelast'));

  // One each: 10A apiece, and the breakers hold.
  const split: Route[] = [
    [{ x: 4, y: 0 }, { x: 3, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }],
    [{ x: 4, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 2 }, { x: 1, y: 2 }, { x: 0, y: 2 }],
  ];
  assert.deepEqual(groupLoads(board, split), [10, 10]);
  assert.deepEqual(faults(board, split).filter((f) => f.kind === 'overbelast'), []);
});

test('a route is credited to the groep it actually lands on', () => {
  const groepen: Groep[] = [
    { cel: { x: 0, y: 2 }, naam: 'WCD1', soort: 'wcd', maxAmp: 16 },
    { cel: { x: 0, y: 1 }, naam: 'WCD2', soort: 'wcd', maxAmp: 16 },
  ];
  const board = openBoard([{ x: 4, y: 1 }], [7], groepen);
  assert.ok(isTerminal(board, { x: 0, y: 1 }));
  const toG2: Route = [{ x: 4, y: 1 }, { x: 3, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
  assert.equal(groupOf(board, toG2), 1);
  assert.deepEqual(groupLoads(board, [toG2]), [0, 7]);
});

test('the solver wires every shipped level, and its answer is legal', () => {
  for (const level of ELEKTRA_LEVELS) {
    const { par, routes } = solve(level.board);
    assert.ok(par > 0, `${level.id} has nothing to wire`);
    assert.equal(routes.length, level.board.devices.length, `${level.id} left a device out`);
    assert.deepEqual(faults(level.board, routes), [], `${level.id}: the solver's own answer is not legal`);
    assert.ok(isSolved(level.board, routes), `${level.id} is not solved by par`);
    assert.equal(cableLength(routes), par, `${level.id} par disagrees with its own routes`);
  }
});

test('par is at least the sum of the shortest possible runs', () => {
  for (const level of ELEKTRA_LEVELS) {
    const { par } = solve(level.board);
    let floor = 0;
    for (const socket of level.board.devices) {
      floor += Math.min(...targetsFor(level.board, level.board.devices.indexOf(socket)).map(
        (t) => Math.abs(socket.cel.x - t.x) + Math.abs(socket.cel.y - t.y)));
    }
    assert.ok(par >= floor, `${level.id}: par ${par} beats the straight-line floor ${floor}`);
  }
});

test('every socket and the meterkast sit on a cell cable can reach', () => {
  for (const surface of SURFACES) {
    const board = boardFor(surface);
    for (const groep of board.groepen) {
      assert.ok(routable(board, groep.cel), `${surface.id}: ${groep.naam} is walled in`);
    }
    for (const device of board.devices) {
      assert.ok(routable(board, device.cel), `${surface.id}: a ${device.kind} is inside a window`);
    }
  }
});

test('stars are awarded against par', () => {
  assert.equal(stars(20, 20), 3);
  assert.equal(stars(23, 20), 2);
  assert.equal(stars(24, 20), 1);
});

test('a lamp hangs on the groep its schakelaar reaches', () => {
  const groepen: Groep[] = [
    { cel: { x: 0, y: 2 }, naam: 'LICHT', soort: 'licht', maxAmp: 16 },
    { cel: { x: 0, y: 0 }, naam: 'WCD1', soort: 'wcd', maxAmp: 16 },
  ];
  const board = openBoard([], [], groepen, [
    { kind: 'lamp', cel: { x: 4, y: 0 }, amp: 7 },
    { kind: 'schakelaar', cel: { x: 4, y: 2 }, amp: 0 },
  ]);

  // The lamp may only end on a schakelaar; the schakelaar only on LICHT.
  assert.deepEqual(targetsFor(board, 0), [{ x: 4, y: 2 }]);
  assert.deepEqual(targetsFor(board, 1), [{ x: 0, y: 2 }]);

  const lampRun: Route = [{ x: 4, y: 0 }, { x: 4, y: 1 }, { x: 4, y: 2 }];
  const switchRun: Route = [{ x: 4, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 2 }, { x: 1, y: 2 }, { x: 0, y: 2 }];
  assert.equal(groepVoor(board, [lampRun, switchRun], 0), 0, 'lamp follows its switch to G1');
  assert.deepEqual(groupLoads(board, [lampRun, switchRun]), [7, 0]);
});

test('a lamp wired straight to the meterkast is not connected', () => {
  const groepen: Groep[] = [{ cel: { x: 0, y: 2 }, naam: 'LICHT', soort: 'licht', maxAmp: 16 }];
  const board = openBoard([], [], groepen, [
    { kind: 'lamp', cel: { x: 4, y: 0 }, amp: 7 },
    { kind: 'schakelaar', cel: { x: 4, y: 2 }, amp: 0 },
  ]);
  const straight: Route = [{ x: 4, y: 0 }, { x: 3, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }];
  const switchRun: Route = [{ x: 4, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 2 }, { x: 1, y: 2 }, { x: 0, y: 2 }];
  assert.ok(faults(board, [straight, switchRun]).some((f) => f.kind === 'los'),
    'a lamp must go through a switch, not round it');
});

test('a dangling schakelaar leaves its lamp unpowered', () => {
  const groepen: Groep[] = [{ cel: { x: 0, y: 2 }, naam: 'LICHT', soort: 'licht', maxAmp: 16 }];
  const board = openBoard([], [], groepen, [
    { kind: 'lamp', cel: { x: 4, y: 0 }, amp: 7 },
    { kind: 'schakelaar', cel: { x: 4, y: 2 }, amp: 0 },
  ]);
  const lampRun: Route = [{ x: 4, y: 0 }, { x: 4, y: 1 }, { x: 4, y: 2 }];
  assert.equal(groepVoor(board, [lampRun, []], 0), -1);
  assert.deepEqual(groupLoads(board, [lampRun, []]), [0]);
});

test('cable may not pass through a device it does not belong to', () => {
  const board = openBoard([{ x: 4, y: 0 }, { x: 2, y: 0 }]);
  const through: Route = [{ x: 4, y: 0 }, { x: 3, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }];
  assert.ok(faults(board, [through, []]).some((f) => f.kind === 'verboden'));
});

test('lights and sockets may not share a breaker', () => {
  const groepen: Groep[] = [
    { cel: { x: 0, y: 2 }, naam: 'LICHT', soort: 'licht', maxAmp: 16 },
    { cel: { x: 0, y: 0 }, naam: 'WCD1', soort: 'wcd', maxAmp: 16 },
  ];
  const board = openBoard([{ x: 4, y: 1 }], [8], groepen, [
    { kind: 'lamp', cel: { x: 4, y: 2 }, amp: 6 },
    { kind: 'schakelaar', cel: { x: 2, y: 2 }, amp: 0 },
  ]);

  // A socket belongs on WCD, a schakelaar on LICHT, and neither may swap.
  assert.deepEqual(targetsFor(board, 0), [{ x: 0, y: 0 }]);
  assert.deepEqual(targetsFor(board, 2), [{ x: 0, y: 2 }]);

  // A cable dragged to the wrong breaker still attaches, so the player can
  // see what they did, but the level is not finished.
  assert.ok(endpointsFor(board, 0).some((p) => p.x === 0 && p.y === 2));
  const socketOnLicht: Route = [{ x: 4, y: 1 }, { x: 3, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: 0, y: 2 }];
  const found = faults(board, [socketOnLicht, [], []]);
  assert.ok(found.some((f) => f.kind === 'verkeerdegroep'), 'should name the wrong breaker');
  assert.ok(!found.some((f) => f.kind === 'los' && f.which === 0), 'and not call it unconnected');
});

test('every shipped level keeps lights and sockets apart', () => {
  for (const level of ELEKTRA_LEVELS) {
    const { routes } = solve(level.board);
    for (let i = 0; i < level.board.devices.length; i++) {
      const groep = groepVoor(level.board, routes, i);
      assert.ok(groep >= 0, `${level.id}: device ${i} ended up on nothing`);
      const want = level.board.devices[i]!.kind === 'stopcontact' ? 'wcd' : 'licht';
      assert.equal(level.board.groepen[groep]!.soort, want,
        `${level.id}: a ${level.board.devices[i]!.kind} landed on a ${level.board.groepen[groep]!.soort} groep`);
    }
  }
});

test('the later levels ask more than the first', () => {
  const counts = ELEKTRA_LEVELS.map((l) => l.board.devices.length);
  assert.ok(Math.max(...counts) >= 5, 'at least one level should have five runs');
  assert.ok(ELEKTRA_LEVELS.some((l) => l.board.groepen.length === 3), 'and one should have three groepen');
  assert.ok(ELEKTRA_LEVELS.some((l) => l.blokkade.length > 0), 'and one should have a pipe in the way');
});
