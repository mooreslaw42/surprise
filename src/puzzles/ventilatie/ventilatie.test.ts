import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CEL, type Route,
  begaanbaar, celAt, debietPerCel, faults, isSolved, kanaalLengte, parsePlan, stars,
} from './model.ts';
import { solve } from './solver.ts';
import { VENTILATIE_LEVELS } from './levels.ts';

/** A plain corridor with the unit at one end and two grilles at the other. */
function corridor(capaciteit = 100, maxLengte = 20) {
  return parsePlan(
    [
      '.......',
      '.#####.',
      '.W###R.',
      '.#####.',
      '.####R.',
      '.......',
    ],
    [
      { x: 5, y: 2, debiet: 60, ruimte: 'EEN' },
      { x: 5, y: 4, debiet: 60, ruimte: 'TWEE' },
    ],
    capaciteit,
    maxLengte,
  );
}

test('parsePlan reads the drawing', () => {
  const plan = corridor();
  assert.equal(celAt(plan, { x: 0, y: 0 }), CEL.MUUR);
  assert.equal(celAt(plan, { x: 2, y: 1 }), CEL.VLOER);
  assert.deepEqual(plan.wtw, { x: 1, y: 2 });
  assert.equal(begaanbaar(plan, { x: 0, y: 0 }), false);
});

test('parsePlan rejects ragged or unknown drawings', () => {
  assert.throws(() => parsePlan(['##', '#'], [], 100, 10), /ragged/);
  assert.throws(() => parsePlan(['#Q'], [], 100, 10), /unknown plan cell/);
  assert.throws(() => parsePlan(['##'], [], 100, 10), /no WTW/);
});

test('air adds up on a shared trunk', () => {
  const plan = corridor();
  // Both grilles come back along row 2, so that run carries both volumes.
  const a: Route = [{ x: 5, y: 2 }, { x: 4, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 2 }, { x: 1, y: 2 }];
  const b: Route = [{ x: 5, y: 4 }, { x: 4, y: 4 }, { x: 4, y: 3 }, { x: 4, y: 2 },
    { x: 3, y: 2 }, { x: 2, y: 2 }, { x: 1, y: 2 }];
  const flow = debietPerCel(plan, [a, b]);
  assert.equal(flow.get(2 * plan.width + 3), 120, 'the shared cell carries both');
  assert.equal(flow.get(2 * plan.width + 5), 60, 'the spur carries one');
});

test('a trunk over capacity is reported, and splitting fixes it', () => {
  const tight = corridor(100);
  const a: Route = [{ x: 5, y: 2 }, { x: 4, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 2 }, { x: 1, y: 2 }];
  const b: Route = [{ x: 5, y: 4 }, { x: 4, y: 4 }, { x: 4, y: 3 }, { x: 4, y: 2 },
    { x: 3, y: 2 }, { x: 2, y: 2 }, { x: 1, y: 2 }];
  assert.ok(faults(tight, [a, b]).some((f) => f.kind === 'overbelast'), '120 through a 100 duct');

  const roomy = corridor(200);
  assert.deepEqual(faults(roomy, [a, b]).filter((f) => f.kind === 'overbelast'), []);
});

test('a shared trunk costs less duct than two separate runs', () => {
  const plan = corridor(200);
  const shared: Route[] = [
    [{ x: 5, y: 2 }, { x: 4, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 2 }, { x: 1, y: 2 }],
    [{ x: 5, y: 4 }, { x: 4, y: 4 }, { x: 4, y: 3 }, { x: 4, y: 2 },
      { x: 3, y: 2 }, { x: 2, y: 2 }, { x: 1, y: 2 }],
  ];
  const apart: Route[] = [
    [{ x: 5, y: 2 }, { x: 4, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 2 }, { x: 1, y: 2 }],
    [{ x: 5, y: 4 }, { x: 4, y: 4 }, { x: 3, y: 4 }, { x: 2, y: 4 },
      { x: 2, y: 3 }, { x: 2, y: 2 }, { x: 1, y: 2 }],
  ];
  assert.ok(kanaalLengte(plan, shared) < kanaalLengte(plan, apart),
    'running together should be the cheaper plan');
});

test('a run longer than the fan will push is reported', () => {
  const plan = corridor(200, 3);
  const long: Route = [{ x: 5, y: 2 }, { x: 4, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 2 }, { x: 1, y: 2 }];
  assert.ok(faults(plan, [long, []]).some((f) => f.kind === 'telang'));
});

test('duct cannot be drawn through a wall', () => {
  const plan = corridor();
  const through: Route = [{ x: 5, y: 2 }, { x: 5, y: 1 }, { x: 5, y: 0 }, { x: 1, y: 2 }];
  assert.ok(faults(plan, [through, []]).some((f) => f.kind === 'doormuur' || f.kind === 'onderbroken'));
});

test('every plan can be ducted, and par is what its own answer costs', () => {
  for (const level of VENTILATIE_LEVELS) {
    const { par, routes } = solve(level.plan);
    assert.equal(routes.length, level.plan.roosters.length, `${level.id} left a rooster out`);
    assert.deepEqual(faults(level.plan, routes), [], `${level.id}: the solver's own plan is not legal`);
    assert.ok(isSolved(level.plan, routes), `${level.id} is not solved by par`);
    assert.equal(kanaalLengte(level.plan, routes), par, `${level.id} par disagrees with its routes`);
  }
});

test('par is at least enough duct to touch every rooster', () => {
  for (const level of VENTILATIE_LEVELS) {
    const { par } = solve(level.plan);
    assert.ok(par >= level.plan.roosters.length,
      `${level.id}: par ${par} is less than one cell per rooster`);
  }
});

test('the plans get bigger as they go', () => {
  const counts = VENTILATIE_LEVELS.map((l) => l.plan.roosters.length);
  assert.deepEqual(counts, [...counts].sort((a, b) => a - b), `roosters go ${counts.join(', ')}`);
  assert.ok(counts[counts.length - 1]! > counts[0]!, 'the last plan should be the biggest');
});

test('every plan promises a delivery it does not keep', () => {
  for (const level of VENTILATIE_LEVELS) {
    assert.match(level.levering, /LEVERING/, `${level.id} has no delivery notice`);
  }
});

test('stars are awarded against par', () => {
  assert.equal(stars(14, 14), 3);
  assert.equal(stars(18, 14), 2);
  assert.equal(stars(19, 14), 1);
});
