import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  type Vloer,
  faults, isSolved, naden, planken, restant, stars, totaalPlanken,
} from './model.ts';
import { solve } from './solver.ts';
import { VLOER_LEVELS } from './levels.ts';

const vloer: Vloer = { breedte: 11, rijen: 4, plank: 5, versprong: 2 };

test('joints fall a plank apart, starting where the first one ends', () => {
  assert.deepEqual(naden(vloer, 3), [3, 8]);
  assert.deepEqual(naden(vloer, 5), [5, 10]);
});

test('the off-cut is what the far wall leaves over', () => {
  // 11 wide, first plank 3, then 5 and 3: the last is cut from a 5, leaving 2.
  assert.equal(restant(vloer, 3), 2);
  // A row that comes out exactly even leaves nothing.
  assert.equal(restant({ ...vloer, breedte: 10 }, 5), 0);
});

test('starting with the off-cut saves a plank', () => {
  const zonder = planken(vloer, 3, 0);
  const met = planken(vloer, 3, 3);
  assert.equal(met, zonder - 1, 'the first piece came free');
  assert.equal(planken(vloer, 3, 4), zonder, 'but only if it is the right length');
});

test('joints too near the row above are reported', () => {
  const slecht = [3, 4];
  assert.ok(faults({ ...vloer, rijen: 2 }, slecht).some((f) => f.kind === 'naad'));
  const goed = [3, 1];
  assert.deepEqual(faults({ ...vloer, rijen: 2 }, goed).filter((f) => f.kind === 'naad'), []);
});

test('a first plank longer than a plank is refused', () => {
  assert.ok(faults({ ...vloer, rijen: 1 }, [9]).some((f) => f.kind === 'buiten'));
  assert.ok(faults({ ...vloer, rijen: 1 }, [0]).some((f) => f.kind === 'buiten'));
});

test('every floor can be laid, and par is the fewest planks', () => {
  for (const level of VLOER_LEVELS) {
    const { par, plan } = solve(level.vloer);
    assert.equal(plan.length, level.vloer.rijen, `${level.id} left a row out`);
    assert.deepEqual(faults(level.vloer, plan), [], `${level.id}: the solver's own floor breaks the rules`);
    assert.ok(isSolved(level.vloer, plan), `${level.id} is not finished at par`);
    assert.equal(totaalPlanken(level.vloer, plan), par, `${level.id} par disagrees with its plan`);
  }
});

test('par beats laying every row the same way', () => {
  for (const level of VLOER_LEVELS) {
    const { par } = solve(level.vloer);
    // All rows starting on a full plank: cheap per row, but the joints line up.
    const lui = new Array(level.vloer.rijen).fill(level.vloer.plank);
    assert.ok(faults(level.vloer, lui).some((f) => f.kind === 'naad'),
      `${level.id}: laying it lazily should not even be legal`);
    assert.ok(par > 0);
  }
});

test('a floor whose rules cannot be met says so', () => {
  // A stagger wider than the plank leaves no legal next row.
  const onmogelijk: Vloer = { breedte: 9, rijen: 3, plank: 3, versprong: 4 };
  assert.throws(() => solve(onmogelijk), /cannot be laid/);
});

test('reuse actually happens in the best plan', () => {
  const level = VLOER_LEVELS.find((l) => l.id === 'vloeren-tvkamer')!;
  const { plan } = solve(level.vloer);
  let hergebruik = 0;
  let over = 0;
  for (const eerste of plan) {
    if (eerste === over && over > 0) hergebruik++;
    over = restant(level.vloer, eerste);
  }
  assert.ok(hergebruik > 0, 'the cheapest floor should be using its off-cuts');
});

test('the floors get bigger as they go', () => {
  const rijen = VLOER_LEVELS.map((l) => l.vloer.rijen * l.vloer.breedte);
  assert.deepEqual(rijen, [...rijen].sort((a, b) => a - b), `areas go ${rijen.join(', ')}`);
});

test('stars are awarded against par', () => {
  assert.equal(stars(19, 19), 3);
  assert.equal(stars(21, 19), 2);
  assert.equal(stars(22, 19), 1);
});
