import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  type Plaatsing,
  doelCellen, draaiVorm, faults, isSolved, parseMuur, periode, stars, totaalRc,
} from './model.ts';
import { solve } from './solver.ts';
import { ISOLATIE_LEVELS } from './levels.ts';

const STROOK: [number, number][] = [[0, 0], [0, 1]];
const HOEK: [number, number][] = [[0, 0], [0, 1], [1, 1]];

const klein = () => parseMuur(
  ['##', '##'],
  [
    { id: 'A', naam: 'STROOK', rc: 20, vorm: STROOK },
    { id: 'B', naam: 'STROOK', rc: 20, vorm: STROOK },
    { id: 'C', naam: 'HOEK', rc: 30, vorm: HOEK },
  ],
  40,
);

test('turning a batt keeps its cells and pulls it back to the corner', () => {
  const gedraaid = draaiVorm(STROOK, 1);
  assert.equal(gedraaid.length, 2);
  assert.ok(gedraaid.every(([x, y]) => x >= 0 && y >= 0), 'normalised to the corner');
  assert.deepEqual(draaiVorm(STROOK, 4), draaiVorm(STROOK, 0), 'four turns is where you started');
});

test('a batt repeats according to its shape', () => {
  assert.equal(periode(STROOK), 2, 'a strip looks the same twice');
  assert.equal(periode(HOEK), 4, 'a corner piece does not');
  assert.equal(periode([[0, 0]]), 1, 'an offcut never changes');
});

test('parseMuur reads the cavity', () => {
  const muur = parseMuur(['#.#', '###'], [], 0);
  assert.equal(muur.width, 3);
  assert.equal(doelCellen(muur), 5);
  assert.equal(muur.doel[1], false, 'the stud is not cavity');
  assert.throws(() => parseMuur(['##', '#'], [], 0), /ragged/);
  assert.throws(() => parseMuur(['#x'], [], 0), /unknown wall cell/);
});

test('a gap is reported, and filling it clears the fault', () => {
  const muur = klein();
  const half: Plaatsing[] = [{ deken: 0, draai: 0, x: 0, y: 0 }];
  assert.ok(faults(muur, half).some((f) => f.kind === 'gat'), 'half a wall has holes');

  const vol: Plaatsing[] = [
    { deken: 0, draai: 0, x: 0, y: 0 },
    { deken: 1, draai: 0, x: 1, y: 0 },
  ];
  assert.deepEqual(faults(muur, vol).filter((f) => f.kind === 'gat'), []);
  assert.ok(isSolved(muur, vol), 'two strips fill a two by two');
});

test('overlap and overhang are reported', () => {
  const muur = klein();
  const bovenop: Plaatsing[] = [
    { deken: 0, draai: 0, x: 0, y: 0 },
    { deken: 1, draai: 0, x: 0, y: 0 },
  ];
  assert.ok(faults(muur, bovenop).some((f) => f.kind === 'overlap'));

  const eruit: Plaatsing[] = [{ deken: 0, draai: 0, x: 3, y: 0 }];
  assert.ok(faults(muur, eruit).some((f) => f.kind === 'buiten'));
});

test('a batt cannot be used twice', () => {
  const muur = klein();
  const twee: Plaatsing[] = [
    { deken: 0, draai: 0, x: 0, y: 0 },
    { deken: 0, draai: 0, x: 1, y: 0 },
  ];
  assert.ok(faults(muur, twee).some((f) => f.kind === 'dubbel'));
});

test('too little Rc keeps the wall from passing even when it is full', () => {
  const muur = { ...klein(), doelRc: 100 };
  const vol: Plaatsing[] = [
    { deken: 0, draai: 0, x: 0, y: 0 },
    { deken: 1, draai: 0, x: 1, y: 0 },
  ];
  assert.deepEqual(faults(muur, vol).filter((f) => f.kind === 'gat'), [], 'it is full');
  assert.ok(faults(muur, vol).some((f) => f.kind === 'teweinig'), 'but not warm enough');
  assert.equal(isSolved(muur, vol), false);
});

test('every cavity can be filled, and par is what the best fill is worth', () => {
  for (const level of ISOLATIE_LEVELS) {
    const { par, plaatsingen } = solve(level.muur);
    assert.deepEqual(
      faults({ ...level.muur, doelRc: 0 }, plaatsingen), [],
      `${level.id}: the solver's own fill is not legal`,
    );
    assert.equal(totaalRc(level.muur, plaatsingen), par, `${level.id} par disagrees with its fill`);
    assert.ok(isSolved(level.muur, plaatsingen), `${level.id} does not pass at par`);
  }
});

test('the target is reachable but not free', () => {
  for (const level of ISOLATIE_LEVELS) {
    const { par } = solve(level.muur);
    assert.ok(par >= level.muur.doelRc, `${level.id}: target ${level.muur.doelRc} is above the best ${par}`);
    assert.ok(level.muur.doelRc > 0, `${level.id} has no target at all`);
  }
});

test('there is more wool than the cavity needs', () => {
  for (const level of ISOLATIE_LEVELS) {
    const voorraad = level.muur.dekens.reduce((n, d) => n + d.vorm.length, 0);
    assert.ok(voorraad > doelCellen(level.muur),
      `${level.id}: no spare batts, so there is nothing to choose`);
  }
});

test('the cavities get bigger as they go', () => {
  const cellen = ISOLATIE_LEVELS.map((l) => doelCellen(l.muur));
  assert.deepEqual(cellen, [...cellen].sort((a, b) => a - b), `cells go ${cellen.join(', ')}`);
});

test('stars are awarded against the best possible Rc', () => {
  assert.equal(stars(218, 218), 3);
  assert.equal(stars(215, 218), 2);
  assert.equal(stars(200, 218), 1);
});
