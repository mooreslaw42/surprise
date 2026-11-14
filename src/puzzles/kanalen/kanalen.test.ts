import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  type Bord,
  NOORD, OOST, ZUID, WEST, LEEG,
  AF, TOE, afstand, draai, faults, isSolved, kortste, lucht, openingen, periode, soort, stars, verbonden,
} from './model.ts';
import { solve, tel } from './solver.ts';
import { KANAAL_LEVELS } from './levels.ts';
import { PLATTEGROND, binnenshuis, ruimteOp } from '../../data/plattegrond.ts';

test('a quarter turn moves every opening one side round', () => {
  assert.equal(draai(NOORD), OOST);
  assert.equal(draai(OOST), ZUID);
  assert.equal(draai(ZUID), WEST);
  assert.equal(draai(WEST), NOORD);
  assert.equal(draai(NOORD | OOST, 2), ZUID | WEST);
  assert.equal(draai(NOORD, 4), NOORD, 'four turns is where you started');
});

test('pieces repeat according to their shape', () => {
  assert.equal(periode(NOORD), 4, 'an end cap');
  assert.equal(periode(NOORD | ZUID), 2, 'a straight looks the same twice');
  assert.equal(periode(NOORD | OOST), 4, 'a bend');
  assert.equal(periode(NOORD | OOST | ZUID), 4, 'a T');
  assert.equal(periode(0b1111), 1, 'a cross never changes');
});

test('shapes are named from their openings', () => {
  assert.equal(soort(LEEG), 'leeg');
  assert.equal(soort(NOORD), 'eind');
  assert.equal(soort(NOORD | ZUID), 'recht');
  assert.equal(soort(OOST | WEST), 'recht');
  assert.equal(soort(NOORD | OOST), 'bocht');
  assert.equal(soort(NOORD | OOST | ZUID), 'tstuk');
  assert.equal(soort(0b1111), 'kruis');
  assert.equal(openingen(0b1011), 3);
});

test('turn distance accounts for a straight looking the same twice', () => {
  assert.equal(afstand(NOORD, OOST), 1);
  assert.equal(afstand(NOORD, WEST), 3);
  assert.equal(afstand(NOORD | ZUID, NOORD | ZUID), 0);
  assert.equal(afstand(NOORD | ZUID, OOST | WEST), 1);
});

/** Two cells side by side, facing each other. */
const paar = (a: number, b: number): Bord =>
  ({ width: 2, height: 1, masks: [a, b], wtw: 0, roosters: [1] });

test('an opening into a wall or a closed side is a leak', () => {
  const bord = paar(OOST, WEST);
  assert.ok(isSolved(bord, [OOST, WEST]), 'facing each other is right');
  assert.ok(faults(bord, [NOORD, WEST]).some((f) => f.kind === 'lek'), 'venting at the ceiling');
  assert.ok(faults(bord, [OOST, NOORD]).some((f) => f.kind === 'lek'), 'the far end is blind');
});

test('duct not joined back to the unit is reported', () => {
  const bord: Bord = { width: 3, height: 1, masks: [OOST, OOST | WEST, WEST], wtw: 0, roosters: [2] };
  assert.ok(isSolved(bord, [OOST, OOST | WEST, WEST]));
  // Turn the middle piece upright: the ends are now blind and cut off.
  const broken = [OOST, NOORD | ZUID, WEST];
  const found = faults(bord, broken);
  assert.ok(found.some((f) => f.kind === 'lek'));
  assert.ok(found.some((f) => f.kind === 'los'), 'the far end hangs loose');
  assert.equal(verbonden(bord, broken)[2], false);
});

test('verbonden follows only joined openings', () => {
  const bord: Bord = { width: 3, height: 1, masks: [OOST, OOST | WEST, WEST], wtw: 0, roosters: [2] };
  assert.deepEqual(verbonden(bord, [OOST, OOST | WEST, WEST]), [true, true, true]);
  assert.deepEqual(verbonden(bord, [OOST, WEST, WEST]), [true, true, false]);
});

test('every shipped plan comes right, and par is the fewest turns', () => {
  for (const level of KANAAL_LEVELS) {
    const { par, oplossing } = solve(level.bord, level.bord.masks);
    assert.ok(isSolved(level.bord, oplossing), `${level.id}: the solver's answer is not right`);
    assert.ok(par > 0, `${level.id} starts solved`);

    // The cost really is the number of turns from the board as it ships.
    let turns = 0;
    for (let i = 0; i < level.bord.masks.length; i++) {
      const d = kortste(level.bord.masks[i]!, oplossing[i]!);
      assert.ok(d >= 0, `${level.id}: piece ${i} is not a turn of the original`);
      turns += d;
    }
    assert.equal(turns, par, `${level.id} par disagrees with its own answer`);
  }
});

test('every rooster ends up on its own system', () => {
  for (const level of KANAAL_LEVELS) {
    const { oplossing } = solve(level.bord, level.bord.masks);
    const { h } = lucht(level.bord, oplossing);
    const af = new Set(level.bord.afRoosters ?? []);
    for (const r of level.bord.roosters) {
      assert.equal(h[r], af.has(r) ? AF : TOE, `${level.id}: rooster ${r} is on the wrong air`);
    }
  }
});

test('every plan has exactly one answer', () => {
  for (const level of KANAAL_LEVELS) {
    assert.equal(tel(level.bord, level.bord.masks, 2), 1, `${level.id}: somewhere the player has to guess`);
  }
});

test('from the second plan on there are two systems, and they cross', () => {
  assert.equal(KANAAL_LEVELS[0]!.bord.afvoer, undefined, 'the first plan is for learning to turn');
  for (const level of KANAAL_LEVELS.slice(1)) {
    assert.notEqual(level.bord.afvoer, undefined, `${level.id} is one system`);
    assert.ok((level.bord.kruisingen ?? []).length >= 1, `${level.id} has no kruising`);
    assert.ok((level.bord.afRoosters ?? []).length >= 2, `${level.id} has almost no afvoer`);
  }
});

test('air goes straight over a kruising and does not turn onto the other duct', () => {
  // A cross of five cells: toevoer runs west to east, afvoer north to south.
  const bord = {
    width: 3, height: 3,
    masks: [0, ZUID, 0, OOST, 15, WEST, 0, NOORD, 0],
    wtw: 3, afvoer: 1, roosters: [5, 7], afRoosters: [7], kruisingen: [4],
  };
  assert.ok(isSolved(bord, bord.masks));
  const { h, v } = lucht(bord, bord.masks);
  assert.equal(h[4], TOE);
  assert.equal(v[4], AF);
  // The same drawing with an ordinary four-way piece there: one system.
  const samen = { ...bord, kruisingen: [] };
  assert.ok(faults(samen, samen.masks).some((f) => f.kind === 'gemengd'));
});

test('a rooster on the wrong system is a fault even when nothing leaks', () => {
  const bord = {
    width: 3, height: 1, masks: [OOST, OOST | WEST, WEST],
    wtw: 0, afvoer: 2, roosters: [] as number[], afRoosters: [] as number[],
  };
  assert.ok(faults(bord, bord.masks).some((f) => f.kind === 'gemengd'), 'the two units are joined');
  const fout = { width: 2, height: 2, masks: [OOST, WEST, OOST, WEST], wtw: 0, afvoer: 2, roosters: [1, 3], afRoosters: [1] };
  assert.deepEqual(faults(fout, fout.masks).filter((f) => f.kind === 'verkeerd').map((f) => f.at), [1, 3]);
});

test('the plans build, each harder than the last', () => {
  const pars = KANAAL_LEVELS.map((l) => solve(l.bord, l.bord.masks).par);
  assert.deepEqual(pars, [...pars].sort((a, b) => a - b), `pars go ${pars.join(', ')}`);
  // The boss is no longer one of these: it became a level of its own, in
  // puzzles/oplevering. What is left here is plans, and the last of them is
  // the whole house on one sheet.
  assert.ok(KANAAL_LEVELS.every((l) => !l.baas), 'no kanaalplan is the boss any more');
  assert.ok(KANAAL_LEVELS[KANAAL_LEVELS.length - 1]!.bord.roosters.length >= 10, 'the last plan should be the whole house');
});

test('not one of them is ever delivered', () => {
  for (const level of KANAAL_LEVELS) {
    assert.match(level.levering, /LEVERING VERWACHT/, `${level.id} should still be waiting`);
  }
});

test('stars are awarded against par', () => {
  assert.equal(stars(10, 10), 3);
  assert.equal(stars(13, 10), 2);
  assert.equal(stars(20, 10), 1);
});

test('duct is only ever drawn inside the house', () => {
  for (const level of KANAAL_LEVELS) {
    assert.equal(level.bord.width, PLATTEGROND.width, `${level.id} is not on the footprint`);
    assert.equal(level.bord.height, PLATTEGROND.height, `${level.id} is not on the footprint`);
    for (let i = 0; i < level.bord.masks.length; i++) {
      if (level.bord.masks[i] === LEEG) continue;
      const kolom: number = i % level.bord.width;
      const rij: number = Math.floor(i / level.bord.width);
      assert.ok(binnenshuis(kolom, rij), `${level.id}: duct at ${kolom},${rij} is outside the house`);
    }
  }
});

test('every rooster and unit sits in a named room', () => {
  for (const level of KANAAL_LEVELS) {
    for (const i of [...level.bord.roosters, level.bord.wtw]) {
      const kolom: number = i % level.bord.width;
      const rij: number = Math.floor(i / level.bord.width);
      assert.ok(ruimteOp(kolom, rij), `${level.id}: cell ${kolom},${rij} is in no room`);
    }
  }
});

test('the plans widen from one room to the whole house', () => {
  const telling = KANAAL_LEVELS.map((l) =>
    l.bord.masks.filter((m) => m !== LEEG).length);
  assert.deepEqual(telling, [...telling].sort((a, b) => a - b), `cells go ${telling.join(', ')}`);
  const binnen = PLATTEGROND.rows.join('').split('').filter((c) => c === '#').length;
  assert.equal(telling[telling.length - 1], binnen, 'the boss should cover every room');
});
