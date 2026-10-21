import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  type Bord,
  NOORD, OOST, ZUID, WEST, LEEG,
  afstand, draai, faults, isSolved, openingen, periode, soort, stars, verbonden,
} from './model.ts';
import { solve } from './solver.ts';
import { KANAAL_LEVELS } from './levels.ts';

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
      const d = afstand(level.bord.masks[i]!, oplossing[i]!);
      assert.ok(d >= 0, `${level.id}: piece ${i} is not a turn of the original`);
      turns += d;
    }
    assert.equal(turns, par, `${level.id} par disagrees with its own answer`);
  }
});

test('every rooster ends up fed by the unit', () => {
  for (const level of KANAAL_LEVELS) {
    const { oplossing } = solve(level.bord, level.bord.masks);
    const live = verbonden(level.bord, oplossing);
    for (const r of level.bord.roosters) {
      assert.ok(live[r], `${level.id}: rooster ${r} gets no air`);
    }
    assert.ok(live[level.bord.wtw], `${level.id}: the unit is not in its own system`);
  }
});

test('the plans build to the boss', () => {
  const pars = KANAAL_LEVELS.map((l) => solve(l.bord, l.bord.masks).par);
  assert.deepEqual(pars, [...pars].sort((a, b) => a - b), `pars go ${pars.join(', ')}`);
  const baas = KANAAL_LEVELS.filter((l) => l.baas);
  assert.equal(baas.length, 1, 'exactly one boss');
  assert.equal(baas[0]!.id, KANAAL_LEVELS[KANAAL_LEVELS.length - 1]!.id, 'and it comes last');
  assert.ok(baas[0]!.bord.roosters.length >= 10, 'the boss should be the whole house');
});

test('the boss is the one that finally arrives', () => {
  for (const level of KANAAL_LEVELS) {
    if (level.baas) assert.equal(level.levering, 'GELEVERD');
    else assert.match(level.levering, /LEVERING VERWACHT/, `${level.id} should still be waiting`);
  }
});

test('stars are awarded against par', () => {
  assert.equal(stars(10, 10), 3);
  assert.equal(stars(13, 10), 2);
  assert.equal(stars(20, 10), 1);
});
