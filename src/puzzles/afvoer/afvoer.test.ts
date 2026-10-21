import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  VAK, type Pad,
  faults, isSolved, parseDoorsnede, pijpLengte, stars, stroom, vakAt, vrij,
} from './model.ts';
import { solve } from './solver.ts';
import { AFVOER_LEVELS } from './levels.ts';

const recht = () => parseDoorsnede(
  ['....', '....', '....', '...S'],
  [{ naam: 'BAK', x: 0, y: 0 }],
);

test('parseDoorsnede reads the section', () => {
  const d = parseDoorsnede(['.#.', '..S'], [{ naam: 'X', x: 0, y: 0 }]);
  assert.equal(vakAt(d, 1, 0), VAK.BALK);
  assert.equal(vrij(d, 1, 0), false, 'pipe cannot go through a joist');
  assert.deepEqual(d.stand, { x: 2, y: 1 });
  assert.throws(() => parseDoorsnede(['..', '.'], []), /ragged/);
  assert.throws(() => parseDoorsnede(['.q'], []), /unknown section cell/);
  assert.throws(() => parseDoorsnede(['..'], []), /no standleiding/);
});

test('water runs right and down but never up or back', () => {
  const d = recht();
  const omhoog: Pad = [{ x: 0, y: 1 }, { x: 0, y: 0 }];
  assert.equal(stroom(d, omhoog).fout, 'omhoog');
  const terug: Pad = [{ x: 1, y: 0 }, { x: 0, y: 0 }];
  assert.equal(stroom(d, terug).fout, 'omhoog', 'backwards is uphill as far as this is concerned');
  const goed: Pad = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }];
  assert.equal(stroom(d, goed).fout, null);
});

test('a run that stays flat too long stops', () => {
  const d = recht();
  // Three cells flat with maxVlak 2: the water gets as far as the third.
  const vlak: Pad = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }];
  const uit = stroom(d, vlak);
  assert.equal(uit.fout, 'vlak');
  assert.ok(uit.tot < vlak.length - 1, 'and it reports how far it got');

  // Dropping in between keeps it going.
  const trap: Pad = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }];
  assert.equal(stroom(d, trap).fout, null);
});

test('a joist stops the water where it hits it', () => {
  const d = parseDoorsnede(['.#..', '....', '...S'], [{ naam: 'X', x: 0, y: 0 }]);
  const door: Pad = [{ x: 0, y: 0 }, { x: 1, y: 0 }];
  assert.equal(stroom(d, door).fout, 'doorbalk');
});

test('a run that stops short of the stack is still loose', () => {
  const d = recht();
  const kort: Pad = [{ x: 0, y: 0 }, { x: 0, y: 1 }];
  assert.ok(faults(d, [kort]).some((f) => f.kind === 'los'));
  assert.equal(isSolved(d, [kort]), false);
});

test('shared pipe is only paid for once', () => {
  const d = parseDoorsnede(
    ['....', '....', '....', '...S'],
    [{ naam: 'A', x: 0, y: 0 }, { naam: 'B', x: 1, y: 0 }],
  );
  const a: Pad = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 3, y: 3 }];
  const b: Pad = [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 3, y: 3 }];
  assert.equal(pijpLengte(d, [a, b]), a.length, 'B adds nothing: it joins A straight away');
  assert.ok(isSolved(d, [a, b]));
});

test('every section drains, and par is what the best layout costs', () => {
  for (const level of AFVOER_LEVELS) {
    const { par, paden } = solve(level.doorsnede);
    assert.equal(paden.length, level.doorsnede.apparaten.length, `${level.id} left an appliance out`);
    assert.deepEqual(faults(level.doorsnede, paden), [], `${level.id}: the solver's own layout leaks`);
    assert.ok(isSolved(level.doorsnede, paden), `${level.id} does not drain at par`);
    assert.equal(pijpLengte(level.doorsnede, paden), par, `${level.id} par disagrees with its layout`);
  }
});

test('par is at least a straight run from the furthest appliance', () => {
  for (const level of AFVOER_LEVELS) {
    const { par } = solve(level.doorsnede);
    const d = level.doorsnede;
    const verst = Math.max(...d.apparaten.map(
      (a) => Math.abs(d.stand.x - a.x) + Math.abs(d.stand.y - a.y)));
    assert.ok(par >= verst, `${level.id}: par ${par} beats a straight line of ${verst}`);
  }
});

test('a section with no way down is refused rather than shipped', () => {
  // One row, so the run can never drop and the flat rule kills it.
  const plat = parseDoorsnede(['.....S'], [{ naam: 'X', x: 0, y: 0 }]);
  assert.throws(() => solve(plat), /cannot be drained/);
});

test('the sections get bigger as they go', () => {
  const aantal = AFVOER_LEVELS.map((l) => l.doorsnede.apparaten.length);
  assert.deepEqual(aantal, [...aantal].sort((a, b) => a - b), `appliances go ${aantal.join(', ')}`);
});

test('stars are awarded against par', () => {
  assert.equal(stars(17, 17), 3);
  assert.equal(stars(20, 17), 2);
  assert.equal(stars(21, 17), 1);
});
