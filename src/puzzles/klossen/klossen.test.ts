import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SURFACES } from '../../data/house.ts';
import { gridSize, openingCells } from '../sloop/generate.ts';
import {
  MERK, type MerkWaarde, type Wand,
  buren4, buren8, cellen, faults, index, isSolved, koppel, missers, stars, xy,
} from './model.ts';
import { ALLE_REGELS, eenduidig, solve, tel, volgende } from './solver.ts';
import { blokVan, genereer, maakWand } from './generate.ts';
import { KLOS_LEVELS } from './levels.ts';

function leeg(w: Wand): MerkWaarde[] {
  return new Array(cellen(w)).fill(MERK.ONBEKEND);
}

function antwoord(w: Wand): MerkWaarde[] {
  const merken = leeg(w);
  for (const i of w.klossen) merken[i] = MERK.KLOS;
  return merken;
}

/** Two klossen that can swap places without changing a single clue. */
function tweeslachtig(): Wand {
  return maakWand({
    width: 2,
    height: 3,
    blok: new Array(6).fill(false),
    dingen: [{ at: 2, soort: 'kastje' }, { at: 3, soort: 'kastje' }],
    klossen: [0, 5],
  });
}

test('neighbours stay on the wall', () => {
  const w = tweeslachtig();
  assert.deepEqual(buren4(w, 0).sort((a, b) => a - b), [1, 2]);
  assert.deepEqual(buren8(w, 0).sort((a, b) => a - b), [1, 2, 3]);
  assert.equal(buren8(w, 2).length, 5);
});

test('the clues are read off the answer', () => {
  const w = tweeslachtig();
  assert.deepEqual([...w.kolomTel], [1, 1]);
  assert.deepEqual([...w.rijTel], [1, 0, 1]);
  assert.equal(w.kolomTel.reduce((a, b) => a + b, 0), w.dingen.length);
});

test('the answer is accepted', () => {
  for (const level of KLOS_LEVELS) {
    assert.ok(isSolved(level.wand, antwoord(level.wand)), level.id);
    assert.equal(missers(level.wand, antwoord(level.wand)), 0);
  }
});

test('one klos cannot hold up two things', () => {
  // Both kastjes reach cell 1, and that is all they reach.
  const w = maakWand({
    width: 3,
    height: 2,
    blok: new Array(6).fill(false),
    dingen: [{ at: 0, soort: 'kastje' }, { at: 2, soort: 'kastje' }],
    klossen: [1, 3],
  });
  assert.equal(koppel(w, [1]), null);
  assert.equal(koppel(w, [1, 4]), null);
  assert.ok(koppel(w, [1, 3]) !== null);
});

test('touching klossen are a fault, even corner to corner', () => {
  const w = tweeslachtig();
  const merken = leeg(w);
  merken[0] = MERK.KLOS;
  merken[3] = MERK.KLOS;
  assert.ok(faults(w, merken).some((f) => f.kind === 'tegen'));
});

test('a thing left hanging is a fault', () => {
  const w = tweeslachtig();
  const merken = leeg(w);
  merken[0] = MERK.KLOS;
  assert.ok(faults(w, merken).some((f) => f.kind === 'zonder'));
});

test('counts are checked per line', () => {
  const w = tweeslachtig();
  const merken = antwoord(w);
  merken[1] = MERK.KLOS;
  const fouten = faults(w, merken);
  assert.ok(fouten.some((f) => f.kind === 'kolom' || f.kind === 'rij'));
});

test('a wall with two answers is refused', () => {
  const w = tweeslachtig();
  assert.equal(tel(w, 3), 2);
  assert.equal(eenduidig(w), false);
  assert.equal(solve(w).klaar, false);
});

test('every shipped wall has exactly one answer', () => {
  for (const level of KLOS_LEVELS) {
    assert.ok(eenduidig(level.wand), level.id);
  }
});

test('every shipped wall can be reasoned out without guessing', () => {
  for (const level of KLOS_LEVELS) {
    const uit = solve(level.wand);
    assert.ok(uit.klaar, `${level.id} leaves squares unknown`);
  }
});

test('the rules never contradict the answer', () => {
  // The whole point. A rule that oversteps would hand the player a hole.
  for (const level of KLOS_LEVELS) {
    const { cel } = solve(level.wand, ALLE_REGELS);
    for (let i = 0; i < cel.length; i++) {
      const echt = level.wand.klossen.includes(i);
      if (cel[i] === MERK.KLOS) assert.ok(echt, `${level.id} wrongly deduced a klos at ${i}`);
      if (cel[i] === MERK.LEEG) assert.ok(!echt, `${level.id} wrongly ruled out ${i}`);
    }
  }
});

test('a hint is always something the player could have worked out', () => {
  for (const level of KLOS_LEVELS) {
    const merken = leeg(level.wand);
    for (let n = 0; n < level.wand.klossen.length; n++) {
      const hint = volgende(level.wand, merken);
      assert.ok(hint, `${level.id} ran out of hints`);
      if (hint.merk === MERK.KLOS) {
        assert.ok(level.wand.klossen.includes(hint.at), `${level.id} hinted a hole at ${hint.at}`);
        merken[hint.at] = MERK.KLOS;
      } else {
        assert.ok(!level.wand.klossen.includes(hint.at));
        merken[hint.at] = MERK.LEEG;
      }
    }
  }
});

test('hints eventually finish the wall', () => {
  const level = KLOS_LEVELS[0]!;
  const merken = leeg(level.wand);
  for (let n = 0; n < 200 && !isSolved(level.wand, merken); n++) {
    const hint = volgende(level.wand, merken);
    if (!hint) break;
    merken[hint.at] = hint.merk;
  }
  assert.ok(isSolved(level.wand, merken));
});

test('openings are blocked and come straight off the scan', () => {
  const surface = SURFACES.find((s) => s.id === 'tvkamer-kopgevel')!;
  const { cols } = gridSize(surface);
  const blok = blokVan(surface);
  const raam = openingCells(surface, surface.openings[0]!)!;
  assert.ok(blok[raam.r0 * cols + raam.c0]);
  assert.ok(!blok[0]);
  assert.equal(blok.filter(Boolean).length,
    (raam.r1 - raam.r0 + 1) * (raam.c1 - raam.c0 + 1));
});

test('no klos and nothing hanging ends up inside a window', () => {
  for (const level of KLOS_LEVELS) {
    for (const i of level.wand.klossen) assert.ok(!level.wand.blok[i], level.id);
    for (const d of level.wand.dingen) assert.ok(!level.wand.blok[d.at], level.id);
  }
});

test('as many klossen as there are things, each against its own', () => {
  for (const level of KLOS_LEVELS) {
    const w = level.wand;
    assert.equal(w.klossen.length, w.dingen.length, level.id);
    assert.ok(koppel(w, w.klossen) !== null, level.id);
    for (const i of w.klossen) {
      assert.ok(!buren8(w, i).some((j) => w.klossen.includes(j)), `${level.id} klossen touch`);
    }
  }
});

test('the opening wall needs no clever rules, the later ones do', () => {
  const kaal = { raak: true, tellen: true, enige: true, knel: false, nutteloos: false };
  assert.ok(solve(KLOS_LEVELS[0]!.wand, kaal).klaar, 'intro should be plain going');
  for (const level of KLOS_LEVELS.slice(1)) {
    assert.ok(!solve(level.wand, kaal).klaar, `${level.id} is too easy`);
  }
});

test('a seed that no longer yields a wall is a loud failure', () => {
  const surface = SURFACES.find((s) => s.id === 'keuken-zijwand')!;
  // Far more klossen than fit without touching: the scatter must give up.
  assert.equal(genereer({ surface, aantal: 40, seed: 1 }), null);
});

test('stars reward a wall without holes', () => {
  assert.equal(stars(0), 3);
  assert.equal(stars(2), 2);
  assert.equal(stars(3), 1);
});

test('grid coordinates round-trip', () => {
  const w = KLOS_LEVELS[2]!.wand;
  for (let i = 0; i < cellen(w); i++) {
    const { x, y } = xy(w, i);
    assert.equal(index(w, x, y), i);
  }
});
