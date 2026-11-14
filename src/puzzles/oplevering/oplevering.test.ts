import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEEG } from '../kanalen/model.ts';
import { WANDEN, bezetting, kandidatenVoor, maakBaas, reken, zaadVan, type Werk } from './baas.ts';
import {
  SCHACHTEN, begin, isSolved, kamerVan, magSchacht, roostersAan, stars, type Stand,
} from './model.ts';

function rng(seed: number): () => number {
  let s = seed || 1;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** Cables and klossen wherever, including walls with every column taken. */
function willekeurigWerk(seed: number): Werk {
  const next = rng(seed);
  const werk: Werk = {};
  for (const wand of WANDEN) {
    if (next() < 0.15) continue;                       // a wall with nothing saved
    const breedte = 9 + Math.floor(next() * 10);
    const vol = next() < 0.2;
    const kabel: number[] = [];
    for (let k = 0; k < (vol ? breedte * 6 : Math.floor(next() * 40)); k++) {
      kabel.push(vol ? k % breedte : Math.floor(next() * breedte));
    }
    const klos = Array.from({ length: Math.floor(next() * 6) }, () => Math.floor(next() * breedte));
    werk[wand.surface] = { breedte, kabel, klos };
  }
  return werk;
}

function opgelost(bord: ReturnType<typeof maakBaas>): Stand {
  return {
    vloer: [...bord.oplossing.vloer],
    plafond: [...bord.oplossing.plafond],
    schachten: [...bord.oplossing.schachten],
  };
}

test('however the cables lie, every wall keeps a cell free', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const werk = willekeurigWerk(seed);
    for (const wand of WANDEN) {
      const bezet = bezetting(wand, werk[wand.surface]);
      assert.ok(bezet.some((r) => r === null), `seed ${seed}: ${wand.surface} is shut completely`);
    }
  }
});

test('a wall with cable in it loses at least one cell to it', () => {
  const wand = WANDEN.find((w) => w.cellen.length === 4)!;
  const bezet = bezetting(wand, { breedte: 12, kabel: [0, 1, 2, 3, 4, 5, 6, 7], klos: [] });
  assert.ok(bezet.includes('kabel'));
  assert.equal(bezetting(wand, undefined).filter(Boolean).length, 0, 'no saved work, nothing in the way');
});

test('the board is solvable for any history, because it is built from its answer', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const werk = willekeurigWerk(seed);
    const bord = maakBaas(werk, zaadVan(werk));
    assert.ok(isSolved(bord, opgelost(bord)), `seed ${seed}: the kept answer does not solve it`);
    assert.equal(bord.oplossing.schachten.length, SCHACHTEN);
    assert.deepEqual(bord.oplossing.schachten.map(kamerVan).sort(), [0, 1, 2], 'one schacht per room');
    for (const cel of bord.oplossing.schachten) {
      assert.equal(magSchacht(bord, begin(bord), cel), null, `seed ${seed}: the answer stands somewhere forbidden`);
    }
    assert.ok(bord.roosters.length >= 8, `seed ${seed}: only ${bord.roosters.length} roosters`);
  }
});

test('it does not arrive already solved, and no drawing is finished alone', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const werk = willekeurigWerk(seed);
    const bord = maakBaas(werk, zaadVan(werk));
    assert.ok(!isSolved(bord, begin(bord)));
    // Everything turned right but no schachten: the ceilings hang loose.
    const zonder = { ...opgelost(bord), schachten: [] };
    assert.ok(!isSolved(bord, zonder));
    assert.equal(roostersAan(bord, zonder), 0);
    assert.equal(roostersAan(bord, opgelost(bord)), bord.roosters.length);
  }
});

test('par is the cost of reaching a right answer, and zero once there', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const werk = willekeurigWerk(seed);
    const bord = maakBaas(werk, zaadVan(werk));
    const { par, vloer, plafond } = reken(bord, bord.vloer, bord.plafond);
    assert.ok(par >= 20, `seed ${seed}: par ${par} is no boss`);
    const stand: Stand = { vloer, plafond, schachten: [...bord.oplossing.schachten] };
    assert.ok(isSolved(bord, stand), `seed ${seed}: the solver's answer is not one`);
    assert.equal(reken(bord, vloer, plafond).par, 0);
  }
});

test('the same history always gives the same board', () => {
  const werk = willekeurigWerk(11);
  assert.deepEqual(maakBaas(werk, zaadVan(werk)), maakBaas(werk, zaadVan(werk)));
  assert.notEqual(zaadVan(werk), zaadVan(willekeurigWerk(12)));
});

test('a schacht is refused on his own cable, on a rooster, and where no duct runs', () => {
  const werk: Werk = { 'keuken-zijwand': { breedte: 12, kabel: [0, 0, 1, 1, 2, 2], klos: [11] } };
  const bord = maakBaas(werk, 5);
  const kandidaten = kandidatenVoor(werk);
  const kabel = kandidaten.find((k) => k.bezet === 'kabel')!;
  const klos = kandidaten.find((k) => k.bezet === 'klos')!;
  assert.equal(magSchacht(bord, begin(bord), kabel.cel), 'kabel');
  assert.equal(magSchacht(bord, begin(bord), klos.cel), 'klos');
  assert.equal(magSchacht(bord, begin(bord), 59), 'geen');
  for (const k of bord.kandidaten) {
    if (!k.bezet && bord.plafond[k.cel] === LEEG) assert.equal(magSchacht(bord, begin(bord), k.cel), 'leeg');
  }
  const vol = { ...begin(bord), schachten: [...bord.oplossing.schachten] };
  const over = bord.kandidaten.find((k) => magSchacht(bord, begin(bord), k.cel) === null && !vol.schachten.includes(k.cel));
  if (over) assert.equal(magSchacht(bord, vol, over.cel), 'vol');
});

test('stars follow the turns, and fresh paint costs one', () => {
  assert.equal(stars(40, 40, false), 3);
  assert.equal(stars(41, 40, false), 2);
  assert.equal(stars(90, 40, false), 1);
  assert.equal(stars(40, 40, true), 2);
  assert.equal(stars(90, 40, true), 1, 'never below one');
});
