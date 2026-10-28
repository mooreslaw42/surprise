import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  type Vloer, type Legplan,
  breedte, faults, isSolved, naden, planken, restant, rijen, stars, totaalPlanken,
} from './model.ts';
import { solve } from './solver.ts';
import { VLOER_LEVELS } from './levels.ts';

const vloer: Vloer = {
  plank: 5,
  versprong: 2,
  vorm: [
    { links: 0, breedte: 11 },
    { links: 0, breedte: 11 },
    { links: 2, breedte: 8 },
    { links: 0, breedte: 11 },
  ],
};

test('joints fall a plank apart, starting where the first one ends', () => {
  assert.deepEqual(naden(vloer, 0, 3), [3, 8]);
  assert.deepEqual(naden(vloer, 0, 5), [5, 10]);
});

test('an inset course carries its left wall into the joint positions', () => {
  // Row 2 starts two cells in, so its first joint lands at 2 + eerste.
  assert.deepEqual(naden(vloer, 2, 3), [5]);
  assert.deepEqual(naden(vloer, 2, 1), [3, 8]);
});

test('the off-cut is what the far wall leaves over', () => {
  // 11 wide, first plank 3, then 5 and 3: the last is cut from a 5, leaving 2.
  assert.equal(restant(vloer, 0, 3), 2);
  // A row that comes out exactly even leaves nothing.
  assert.equal(restant({ ...vloer, vorm: [{ links: 0, breedte: 10 }] }, 0, 5), 0);
});

test('starting with the off-cut saves a plank', () => {
  const zonder = planken(vloer, 0, 3, 0);
  const met = planken(vloer, 0, 3, 3);
  assert.equal(met, zonder - 1, 'the first piece came free');
  assert.equal(planken(vloer, 0, 3, 4), zonder, 'but only if it is the right length');
});

test('joints too near the row above are reported', () => {
  assert.ok(faults(vloer, [3, 4]).some((f) => f.kind === 'naad'));
  assert.deepEqual(faults(vloer, [3, 1]).filter((f) => f.kind === 'naad'), []);
});

test('a first plank longer than a plank, or longer than the course, is refused', () => {
  assert.ok(faults(vloer, [9]).some((f) => f.kind === 'buiten'));
  assert.ok(faults(vloer, [0]).some((f) => f.kind === 'buiten'));
  // Row 2 is only 8 wide but even a full plank (5) fits; one of 6 would not.
  const smal: Vloer = { ...vloer, vorm: [{ links: 0, breedte: 4 }] };
  assert.ok(faults(smal, [5]).some((f) => f.kind === 'buiten'));
});

test('every floor can be laid, and par is the fewest planks', () => {
  for (const level of VLOER_LEVELS) {
    const { par, plan } = solve(level.vloer);
    assert.equal(plan.length, rijen(level.vloer), `${level.id} left a row out`);
    assert.deepEqual(faults(level.vloer, plan), [], `${level.id}: the solver's own floor breaks the rules`);
    assert.ok(isSolved(level.vloer, plan), `${level.id} is not finished at par`);
    assert.equal(totaalPlanken(level.vloer, plan), par, `${level.id} par disagrees with its plan`);
  }
});

test('no om-en-om rhythm can walk a ragged floor', () => {
  // The old square rooms fell to any two first-plank lengths alternated down
  // the floor. On these rooms there is no such pair — you have to plan.
  for (const level of VLOER_LEVELS) {
    const v = level.vloer;
    for (let a = 1; a <= v.plank; a++) {
      for (let b = 1; b <= v.plank; b++) {
        const plan: Legplan = v.vorm.map((_, r) => (r % 2 === 0 ? a : b));
        assert.ok(!isSolved(v, plan),
          `${level.id}: alternating ${a}/${b} solves it, so it is still trivial`);
      }
    }
  }
});

test('par beats laying every row the same way', () => {
  for (const level of VLOER_LEVELS) {
    const { par } = solve(level.vloer);
    // Every course on a full plank: cheap per row, but the joints line up.
    const lui = level.vloer.vorm.map((r) => Math.min(level.vloer.plank, r.breedte));
    assert.ok(faults(level.vloer, lui).some((f) => f.kind === 'naad'),
      `${level.id}: laying it lazily should not even be legal`);
    assert.ok(par > 0);
  }
});

test('the rooms are not rectangles', () => {
  for (const level of VLOER_LEVELS) {
    const shapes = new Set(level.vloer.vorm.map((r) => `${r.links},${r.breedte}`));
    assert.ok(shapes.size > 1, `${level.id}: every course is the same, so it is still a box`);
  }
  // At least one room has an inset course — a real corner to lay around.
  assert.ok(VLOER_LEVELS.some((l) => l.vloer.vorm.some((r) => r.links > 0)),
    'none of the floors has a nook');
});

test('a floor whose rules cannot be met says so', () => {
  // A stagger wider than the plank leaves no legal next row.
  const onmogelijk: Vloer = {
    plank: 3, versprong: 4,
    vorm: [{ links: 0, breedte: 9 }, { links: 0, breedte: 9 }, { links: 0, breedte: 9 }],
  };
  assert.throws(() => solve(onmogelijk), /cannot be laid/);
});

test('reuse actually happens in the best plan', () => {
  const level = VLOER_LEVELS.find((l) => l.id === 'vloeren-tvkamer')!;
  const { plan } = solve(level.vloer);
  let hergebruik = 0;
  let over = 0;
  for (let r = 0; r < plan.length; r++) {
    if (plan[r] === over && over > 0) hergebruik++;
    over = restant(level.vloer, r, plan[r]!);
  }
  assert.ok(hergebruik > 0, 'the cheapest floor should be using its off-cuts');
});

test('the floors get bigger as they go', () => {
  const cellen = VLOER_LEVELS.map((l) => l.vloer.vorm.reduce((s, r) => s + r.breedte, 0));
  assert.deepEqual(cellen, [...cellen].sort((a, b) => a - b), `areas go ${cellen.join(', ')}`);
});

test('breedte spans the widest course', () => {
  assert.equal(breedte(vloer), 11);
  assert.equal(breedte({ ...vloer, vorm: [{ links: 4, breedte: 10 }, { links: 0, breedte: 11 }] }), 14);
});

test('stars are awarded against par', () => {
  assert.equal(stars(19, 19), 3);
  assert.equal(stars(21, 19), 2);
  assert.equal(stars(22, 19), 1);
});
