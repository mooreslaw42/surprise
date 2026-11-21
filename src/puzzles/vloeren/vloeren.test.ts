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

test('an om-en-om rhythm never reaches par, and costs a star', () => {
  // The rooms are the real ones, so they are rectangles, and any floor can
  // be laid by alternating two first-plank lengths. What stops that being
  // the answer is the price: on every room the best rhythm is more than the
  // two planks over par that still earn a second star.
  for (const level of VLOER_LEVELS) {
    const v = level.vloer;
    const { par } = solve(v);
    let ritme = Infinity;
    for (let a = 1; a <= v.plank; a++) {
      for (let b = 1; b <= v.plank; b++) {
        const plan: Legplan = v.vorm.map((_, r) => (r % 2 === 0 ? a : b));
        if (isSolved(v, plan)) ritme = Math.min(ritme, totaalPlanken(v, plan));
      }
    }
    assert.ok(ritme >= par + 2, `${level.id}: alternating reaches ${ritme} against par ${par}`);
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

test('a joint right beside the post is refused, and the solver knows', () => {
  const v: Vloer = { vorm: [{ links: 0, breedte: 12 }], plank: 5, versprong: 2, palen: [{ rij: 0, x: 5 }] };
  assert.ok(faults(v, [5]).some((f) => f.kind === 'naad'), 'a joint at the post');
  assert.deepEqual(faults(v, [3]), [], 'joints at 3 and 8 are clear of it');
  assert.ok(faults(v, solve(v).plan).length === 0);
});

test('the floors are the rooms on the plan', () => {
  // A cell is 25 cm along the course and a course is 50 cm of floor.
  const maat = (id: string): [number, number] => {
    const v = VLOER_LEVELS.find((l) => l.id === id)!.vloer;
    return [Math.max(...v.vorm.map((r) => r.breedte)) / 4, v.vorm.length / 2];
  };
  assert.deepEqual(maat('vloeren-woonkamer'), [4.5, 5]);
  assert.deepEqual(maat('vloeren-tvkamer'), [4.5, 3]);
  // The keuken is 3 m wide, less the half metre the units stand on.
  assert.deepEqual(maat('vloeren-keuken'), [2.5, 5.5]);
  // The steps are the ones Pim listed and no others: the pier in the keuken,
  // two boxed-out corners in the tv-kamer, and the post in the woonkamer.
  const stappen = (id: string): number => {
    const v = VLOER_LEVELS.find((l) => l.id === id)!.vloer;
    return new Set(v.vorm.map((r) => `${r.links},${r.breedte}`)).size;
  };
  assert.equal(stappen('vloeren-keuken'), 2);
  assert.equal(stappen('vloeren-tvkamer'), 3);
  assert.equal(stappen('vloeren-woonkamer'), 1);
  const woon = VLOER_LEVELS.find((l) => l.id === 'vloeren-woonkamer')!.vloer;
  assert.deepEqual(woon.palen, [{ rij: 6, x: 6 }], 'a third in from the left, a third up from the bottom');
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

test('the floors get dearer as they go', () => {
  // By planks, not by area: the tv-kamer is a few squares smaller than the
  // keuken once its corners are out, and still the bigger job.
  const pars = VLOER_LEVELS.map((l) => solve(l.vloer).par);
  assert.deepEqual(pars, [...pars].sort((a, b) => a - b), `pars go ${pars.join(', ')}`);
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
