import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  type Doorsnede, type Plaatsing, type Soort,
  BREEDTE, HOOGTE, SPELING, STUKKEN,
  balans, faults, isSolved, lozeCellen, lozeRuimte, stars, zwaartepunt,
} from './model.ts';
import { AS, BAND, DOORSNEDE, bouw, generate, rng } from './generate.ts';
import { besteLoos, bouwvolgorde, elkeOplossing, hint, pasHintToe, plekken, solve } from './solver.ts';
import { TUINHUIS_LEVEL } from './levels.ts';
import { TuinhuisScene } from '../../scenes/tuinhuis.ts';
import { PixelBuffer } from '../../engine/pixelbuffer.ts';
import { Save } from '../../engine/save.ts';
import type { Input } from '../../engine/input.ts';
import type { Scene, SceneContext } from '../../engine/scene.ts';
import type { Screen } from '../../engine/screen.ts';

const d = TUINHUIS_LEVEL.doorsnede;
const oplossing = TUINHUIS_LEVEL.oplossing;

const stuk = (soort: Soort): number => d.stukken.findIndex((s) => s.soort === soort);
const op = (soort: Soort, x: number, y: number): Plaatsing => ({ stuk: stuk(soort), x, y });
const soorten = (ps: readonly Plaatsing[]) => faults(d, ps).map((f) => f.kind).sort();

/** The stored house with one piece moved somewhere else. */
function verzet(soort: Soort, x: number, y: number): Plaatsing[] {
  return oplossing.map((p) => (p.stuk === stuk(soort) ? { ...p, x, y } : p));
}

// ---------------------------------------------------------------- the pieces

test('the nine pieces are the ones in the design, in half-metre cells', () => {
  assert.equal(STUKKEN.length, 9);
  assert.equal(new Set(STUKKEN.map((s) => s.soort)).size, 9);
  assert.equal(BREEDTE, 14);
  assert.equal(HOOGTE, 6, 'eight rows, less two of chassis');
  const kg = Object.fromEntries(STUKKEN.map((s) => [s.soort, s.kg]));
  assert.deepEqual(kg, {
    douche: 180, wc: 90, keuken: 250, techniek: 300, bank: 120,
    kasttrap: 110, vliering: 220, berging: 80, werkplek: 90,
  });
});

test('the floor is crowded: what must stand on it fills it exactly', () => {
  const breed = STUKKEN.filter((s) => s.eis === 'vloer').reduce((n, s) => n + s.w, 0);
  assert.equal(breed, BREEDTE);
});

// ------------------------------------------------------------ the baked level

test('the baked level is the tuinhuis, with all three of Wiep\'s beats', () => {
  assert.equal(TUINHUIS_LEVEL.id, 'tuinhuis');
  assert.equal(TUINHUIS_LEVEL.uitleg.length, 3);
  assert.deepEqual(TUINHUIS_LEVEL.uitBalans, ['ZO TREKT HIJ NIET. DE ZWARE DINGEN NAAR DE AS.']);
  assert.equal(TUINHUIS_LEVEL.afTitel, 'HIJ IS AF');
  assert.equal(TUINHUIS_LEVEL.afRegel, 'EEN MIDDAG. JOUW HUIS DOET ER NU TWEE JAAR OVER.');
  const tekst = [...TUINHUIS_LEVEL.uitleg, ...TUINHUIS_LEVEL.uitBalans,
    TUINHUIS_LEVEL.afTitel, TUINHUIS_LEVEL.afRegel, TUINHUIS_LEVEL.praatje, TUINHUIS_LEVEL.titel];
  for (const regel of tekst) assert.equal(regel, regel.toUpperCase(), 'the font has capitals only');
});

test('the stored solution is a finished house that keeps every rule', () => {
  assert.equal(oplossing.length, 9);
  assert.deepEqual(faults(d, oplossing), []);
  assert.ok(isSolved(d, oplossing));
});

test('the stored solution is worth three stars, so the hint never costs one', () => {
  assert.equal(balans(d, oplossing), 'netjes');
  assert.equal(lozeRuimte(d, oplossing), TUINHUIS_LEVEL.par);
  assert.equal(stars(lozeRuimte(d, oplossing), TUINHUIS_LEVEL.par, true), 3);
});

test('the baked level is what the generator still prints', () => {
  const vers = generate(1205);
  const sleutel = (ps: readonly Plaatsing[]) => ps.map((p) => `${p.stuk}@${p.x},${p.y}`).sort();
  assert.deepEqual(sleutel(vers.oplossing), sleutel(oplossing));
  assert.equal(vers.par, TUINHUIS_LEVEL.par);
  assert.deepEqual(vers.doorsnede, d);
  assert.equal(d.as, AS);
  assert.equal(d.band, BAND);
});

// ------------------------------------------------------------------ the rules

test('gravity: a piece with nothing under it floats', () => {
  assert.ok(soorten([op('berging', 0, 2)]).includes('zweeft'));
  // On the floor it is fine.
  assert.ok(!soorten([op('berging', 0, 0)]).includes('zweeft'));
});

test('gravity: half on is not on', () => {
  const keuken = op('keuken', 0, 0);
  // The vliering is six wide and the keukenblok five: one cell hangs over.
  assert.ok(soorten([keuken, op('vliering', 0, 2)]).includes('zweeft'));
  // With the techniek beside the keukenblok there is something under all of it.
  assert.ok(!soorten([keuken, op('techniek', 5, 0), op('vliering', 0, 2)]).includes('zweeft'));
});

test('pulling a piece out from under another leaves that one floating', () => {
  const zonderKeuken = oplossing.filter((p) => p.stuk !== stuk('keuken'));
  const fout = faults(d, zonderKeuken).filter((f) => f.kind === 'zweeft').map((f) => f.stuk);
  assert.ok(fout.includes(stuk('vliering')));
});

test('floor pieces have to stand on the chassis', () => {
  // On top of the keukenblok the douche rests perfectly well, and has no drain.
  const ps = [op('keuken', 0, 0), op('douche', 0, 2)];
  assert.deepEqual(faults(d, ps).filter((f) => f.kind !== 'balans'), [{ kind: 'vloer', stuk: stuk('douche') }]);
  for (const s of ['douche', 'wc', 'keuken', 'techniek', 'bank'] as const) {
    assert.equal(d.stukken[stuk(s)]!.eis, 'vloer');
  }
});

test('the vliering may not lie on the floor', () => {
  assert.ok(soorten([op('vliering', 0, 0)]).includes('boven'));
  assert.ok(!soorten([op('keuken', 0, 0), op('techniek', 5, 0), op('vliering', 0, 2)]).includes('boven'));
});

test('the kasttrap has to touch the vliering', () => {
  // In the stored house the stair stands against the end of the vliering.
  // Two cells towards the nose it still rests on the bank, and reaches nothing.
  const los = verzet('kasttrap', 4, 2);
  assert.deepEqual(faults(d, los), [{ kind: 'trap', stuk: stuk('kasttrap') }]);
  assert.ok(!isSolved(d, los));
});

test('touching is sharing an edge: a corner does not count, and neither does no vliering', () => {
  assert.ok(soorten([op('kasttrap', 0, 0)]).includes('trap'), 'vliering still in the tray');
  const vloer = [op('keuken', 0, 0), op('techniek', 5, 0), op('bank', 7, 0)];
  const vliering = op('vliering', 0, 2);
  assert.ok(!soorten([...vloer, vliering, op('kasttrap', 6, 2)]).includes('trap'), 'side by side');
  assert.ok(soorten([...vloer, vliering, op('kasttrap', 7, 2)]).includes('trap'), 'a cell apart');
  // Under it counts as well: a stair the vliering lies on does reach it.
  assert.ok(!soorten([op('vliering', 0, 3), op('kasttrap', 0, 0)]).includes('trap'), 'underneath');
  // The stair's top corner against the vliering's bottom corner is nothing.
  assert.ok(soorten([op('vliering', 0, 3), op('kasttrap', 6, 0)]).includes('trap'), 'only the corners meet');
});

test('nothing above four metres', () => {
  // Three cells of stair on top of four cells of douche is seven.
  const ps = [op('douche', 0, 0), op('kasttrap', 0, 4)];
  assert.ok(soorten(ps).includes('hoogte'));
  assert.ok(!soorten([op('douche', 0, 0)]).includes('hoogte'));
});

test('nothing past the nose or the tail', () => {
  assert.ok(soorten([op('bank', -1, 0)]).includes('buiten'));
  assert.ok(soorten([op('bank', BREEDTE - 2, 0)]).includes('buiten'));
  assert.ok(!soorten([op('bank', BREEDTE - 3, 0)]).includes('buiten'));
});

test('two pieces cannot be in one place', () => {
  const ps = [op('bank', 0, 0), op('techniek', 2, 0)];
  const fout = faults(d, ps).filter((f) => f.kind === 'overlap').map((f) => f.stuk).sort();
  assert.deepEqual(fout, [stuk('techniek'), stuk('bank')].sort());
  assert.ok(!soorten([op('bank', 0, 0), op('techniek', 3, 0)]).includes('overlap'));
});

test('off balance: the same house turned end for end keeps every rule but one', () => {
  const gespiegeld = oplossing.map((p) => ({ ...p, x: d.width - p.x - d.stukken[p.stuk]!.w }));
  assert.deepEqual(faults(d, gespiegeld), [{ kind: 'balans', stuk: -1 }]);
  assert.equal(balans(d, gespiegeld), 'neuszwaar');
  assert.ok(!isSolved(d, gespiegeld));
});

test('an unfinished house is not solved, however tidy', () => {
  assert.ok(!isSolved(d, []));
  assert.ok(!isSolved(d, oplossing.slice(0, 8)));
  // Nine placements of eight pieces is not nine pieces.
  assert.ok(!isSolved(d, [...oplossing.slice(0, 8), oplossing[0]!]));
});

// ---------------------------------------------------------------- the balance

test('the centre of mass is the weighted middle of what is in', () => {
  assert.equal(zwaartepunt(d, []), null);
  assert.equal(zwaartepunt(d, [op('techniek', 3, 0)]), 4, 'two wide, so its middle is a cell in');
  // 300 kg at 1 and 180 kg at 13: (300 + 2340) / 480.
  assert.equal(zwaartepunt(d, [op('techniek', 0, 0), op('douche', 12, 0)]), 5.5);
  // How high a thing sits does not come into it.
  assert.equal(zwaartepunt(d, [op('berging', 4, 0)]), zwaartepunt(d, [op('berging', 4, 4)]));
});

test('the band has a tidy half and a just-about half either side of the axle', () => {
  const smal: Doorsnede = { ...d, as: 8, band: 0.5 };
  const bij = (x: number) => balans(smal, [{ stuk: stuk('techniek'), x: 0, y: 0 }].map((p) => ({ ...p, x })));
  // The techniek is two wide: at x its weight hangs at x + 1.
  assert.equal(balans(smal, []), 'leeg');
  assert.equal(bij(7), 'netjes');
  assert.equal(balans({ ...smal, as: 8.25 }, [op('techniek', 7, 0)]), 'netjes', 'the edge of the tidy half is still tidy');
  assert.equal(balans({ ...smal, as: 8.4 }, [op('techniek', 7, 0)]), 'net');
  assert.equal(balans({ ...smal, as: 8.5 }, [op('techniek', 7, 0)]), 'net', 'the edge of the band is still in');
  assert.equal(bij(6), 'neuszwaar');
  assert.equal(bij(8), 'staartzwaar');
});

test('the band is tight: most houses that keep every other rule do not tow', () => {
  let alle = 0;
  elkeOplossing({ ...d, band: 100 }, () => { alle++; return false; });
  let goed = 0;
  let netjes = 0;
  elkeOplossing(d, (o) => {
    goed++;
    if (balans(d, o) === 'netjes') netjes++;
    return false;
  });
  assert.ok(alle > 1000, `plenty of ways to build it wrong (${alle})`);
  assert.ok(goed > 0 && goed < alle / 4, `${goed} of ${alle} tow`);
  assert.ok(netjes > 0 && netjes < alle / 8, `${netjes} of ${alle} tow tidily`);
});

test('packing the tray in order, heavy end wherever it falls, does not tow', () => {
  // Floor pieces nose to tail in tray order, the rest wherever they first fit.
  const naief: Plaatsing[] = [];
  let x = 0;
  d.stukken.forEach((s, i) => {
    if (s.eis !== 'vloer') return;
    naief.push({ stuk: i, x, y: 0 });
    x += s.w;
  });
  for (const soort of ['vliering', 'kasttrap', 'berging', 'werkplek'] as const) {
    const kan = plekken(d, naief, stuk(soort))
      .filter((p) => !faults(d, [...naief, p]).some((f) => f.kind === 'trap'));
    assert.ok(kan.length > 0, `${soort} fits somewhere`);
    naief.push(kan[0]!);
  }
  assert.deepEqual(faults(d, naief), [{ kind: 'balans', stuk: -1 }]);
});

// ------------------------------------------------------------ dead space, stars

test('dead space is the empty cells that are not part of the room', () => {
  assert.equal(lozeRuimte(d, []), 0, 'an empty trailer is all room');
  // Two tall pieces a cell apart wall off a slot: four cells, floor to their tops.
  const spleet = [op('douche', 0, 0), op('wc', 3, 0), op('keuken', 5, 0), op('techniek', 10, 0)];
  assert.equal(lozeRuimte(d, spleet), 0, 'the slot is still open at the top');
  // A lid on the slot makes it a hole.
  const dicht = [...spleet, op('berging', 0, 4)];
  assert.deepEqual(lozeCellen(d, dicht), [2, 16, 30, 44]);
  assert.equal(lozeRuimte(d, dicht), 4);
});

test('stars: three at par, two within the margin, one for finishing', () => {
  assert.equal(stars(0, 0, true), 3);
  assert.equal(stars(1, 0, true), 2);
  assert.equal(stars(SPELING, 0, true), 2);
  assert.equal(stars(SPELING + 1, 0, true), 1);
  assert.equal(stars(40, 0, true), 1);
  assert.equal(stars(6, 2, true), 2, 'measured from par, not from nothing');
  assert.equal(stars(1, 2, true), 3, 'better than par is still three');
});

test('stars: one off for towing only just inside the band, and never below one', () => {
  assert.equal(stars(0, 0, false), 2);
  assert.equal(stars(SPELING, 0, false), 1);
  assert.equal(stars(SPELING + 1, 0, false), 1);
});

// --------------------------------------------------------------- the generator

test('every house the generator builds keeps every rule, for many seeds', () => {
  for (let seed = 1; seed <= 400; seed++) {
    const huis = bouw(DOORSNEDE, rng(seed));
    assert.deepEqual(faults(DOORSNEDE, huis), [], `seed ${seed}`);
    assert.ok(isSolved(DOORSNEDE, huis), `seed ${seed}`);
  }
});

test('the generator is deterministic, and its par and solution agree', () => {
  for (const seed of [1, 7, 512, 1205]) {
    const a = generate(seed, 60);
    const b = generate(seed, 60);
    assert.deepEqual(a, b, `seed ${seed}`);
    assert.ok(isSolved(a.doorsnede, a.oplossing), `seed ${seed}`);
    assert.equal(a.par, lozeRuimte(a.doorsnede, a.oplossing), `seed ${seed}`);
  }
});

test('the generator does not always build the same house', () => {
  const huizen = new Set<string>();
  for (let seed = 1; seed <= 60; seed++) {
    huizen.add(bouw(DOORSNEDE, rng(seed)).map((p) => `${p.stuk}@${p.x},${p.y}`).sort().join(' '));
  }
  assert.ok(huizen.size >= 10, `${huizen.size} different houses in 60`);
});

// ------------------------------------------------------------------ the solver

test('the solver finds a house on its own, so the level is provably solvable', () => {
  const gevonden = solve(d);
  assert.ok(gevonden);
  assert.ok(isSolved(d, gevonden));
});

test('par is not just the generator\'s best: no house at all is tighter', () => {
  assert.equal(besteLoos(d), TUINHUIS_LEVEL.par);
});

test('the solver says so when there is no house to find', () => {
  // An axle hung off the nose: nothing balances.
  assert.equal(solve({ ...d, as: -5 }), null);
  assert.equal(besteLoos({ ...d, as: -5 }), null);
});

test('hints build the stored house from the floor up, nine of them', () => {
  let ps: Plaatsing[] = [];
  for (let n = 0; n < 9; n++) {
    const volgende = hint(oplossing, ps);
    assert.ok(volgende, `hint ${n + 1}`);
    ps = pasHintToe(d, oplossing, ps);
    assert.equal(ps.length, n + 1);
    // Nothing a hint puts in is ever left hanging.
    assert.ok(!soorten(ps).includes('zweeft'), `hint ${n + 1} rests on something`);
  }
  assert.ok(isSolved(d, ps));
  assert.equal(hint(oplossing, ps), null);
  assert.deepEqual(bouwvolgorde(oplossing).map((p) => p.y), [0, 0, 0, 0, 0, 2, 2, 4, 4]);
});

test('a hint clears out whatever is standing where its piece goes', () => {
  // The bank where the douche belongs, and the douche somewhere else.
  const ps = [op('bank', 0, 0), op('douche', 6, 0)];
  const na = pasHintToe(d, oplossing, ps);
  assert.deepEqual(na, [op('douche', 0, 0)]);
  // A piece that is in the way of nothing stays.
  const na2 = pasHintToe(d, oplossing, [op('techniek', 12, 0)]);
  assert.deepEqual(na2, [op('techniek', 12, 0), op('douche', 0, 0)]);
});

// ------------------------------------------------------------------- the scene

type Muis = {
  x: number; y: number;
  pressX?: number; pressY?: number;
  down?: boolean; clicked?: boolean; released?: boolean;
};

const stil: Muis = { x: 0, y: 0 };

function context(muis: Muis, keys: readonly string[] = [], pop: () => void = () => {}): SceneContext {
  const input = {
    mouseX: muis.x, mouseY: muis.y,
    mousePressX: muis.pressX ?? muis.x, mousePressY: muis.pressY ?? muis.y,
    mouseDown: muis.down ?? false, mouseClicked: muis.clicked ?? false, mouseReleased: muis.released ?? false,
    mouseOver: true,
    isDown: (code: string) => keys.includes(code),
    justPressed: (code: string) => keys.includes(code),
    justReleased: () => false,
    confirmed: () => keys.includes('Enter'),
    endFrame: () => {},
    drawCursor: () => {},
  } as unknown as Input;
  return {
    screen: undefined as unknown as Screen,
    input,
    push: (_: Scene) => {},
    pop,
    replace: (_: Scene) => {},
  };
}

/** Wiep talks first, and now and then again; this reads her out. */
function lees(scene: TuinhuisScene): void {
  for (let i = 0; i < 3; i++) scene.update(0.5, context(stil, ['Enter']));
}

const gezet = (scene: TuinhuisScene) =>
  (scene as unknown as { plaatsingen: Plaatsing[] }).plaatsingen;

function nieuw(): { scene: TuinhuisScene; save: Save } {
  const save = new Save(null);
  const scene = new TuinhuisScene(TUINHUIS_LEVEL, save);
  lees(scene);
  return { scene, save };
}

// Where things are on screen. The douche lies in the tray at (14, 66), 16 by
// 32; the trailer's top-left is (150, 44) at 14 pixels a cell, and a piece
// from the tray is held by its middle.
const DOUCHE_IN_LADE = { x: 22, y: 82 };
const DOUCHE_OP_0_0 = { x: 150 + 14, y: 44 + 2 * 14 + 28 };

test('scene: a drag from the tray into the trailer, all inside one step', () => {
  const { scene } = nieuw();
  scene.update(1 / 60, context({
    ...DOUCHE_OP_0_0, pressX: DOUCHE_IN_LADE.x, pressY: DOUCHE_IN_LADE.y, clicked: true, released: true,
  }));
  assert.deepEqual(gezet(scene), [op('douche', 0, 0)]);
});

test('scene: a drag spread over several steps', () => {
  const { scene } = nieuw();
  const pers = { pressX: DOUCHE_IN_LADE.x, pressY: DOUCHE_IN_LADE.y };
  scene.update(1 / 60, context({ ...DOUCHE_IN_LADE, ...pers, down: true, clicked: true }));
  scene.update(1 / 60, context({ x: 90, y: 90, ...pers, down: true }));
  assert.deepEqual(gezet(scene), [], 'still in the air');
  scene.update(1 / 60, context({ ...DOUCHE_OP_0_0, ...pers, released: true }));
  assert.deepEqual(gezet(scene), [op('douche', 0, 0)]);
});

test('scene: click to pick up, click to put down', () => {
  const { scene } = nieuw();
  scene.update(1 / 60, context({ ...DOUCHE_IN_LADE, clicked: true, released: true }));
  assert.deepEqual(gezet(scene), [], 'a click picks up and does not drop');
  scene.update(1 / 60, context({ ...DOUCHE_OP_0_0, clicked: true, released: true }));
  assert.deepEqual(gezet(scene), [op('douche', 0, 0)]);
});

test('scene: a piece can be taken back out, and dropped outside it returns to the tray', () => {
  const { scene } = nieuw();
  scene.update(1 / 60, context({ ...DOUCHE_IN_LADE, clicked: true, released: true }));
  scene.update(1 / 60, context({ ...DOUCHE_OP_0_0, clicked: true, released: true }));
  // Drag it from the trailer to the middle of the tray.
  scene.update(1 / 60, context({
    x: 60, y: 140, pressX: DOUCHE_OP_0_0.x, pressY: DOUCHE_OP_0_0.y, clicked: true, released: true,
  }));
  assert.deepEqual(gezet(scene), []);
  // And it is there to be picked up again.
  scene.update(1 / 60, context({
    ...DOUCHE_OP_0_0, pressX: DOUCHE_IN_LADE.x, pressY: DOUCHE_IN_LADE.y, clicked: true, released: true,
  }));
  assert.deepEqual(gezet(scene), [op('douche', 0, 0)]);
});

test('scene: a piece does not go down on top of another, and stays in hand', () => {
  const { scene } = nieuw();
  scene.update(1 / 60, context({
    ...DOUCHE_OP_0_0, pressX: DOUCHE_IN_LADE.x, pressY: DOUCHE_IN_LADE.y, clicked: true, released: true,
  }));
  // The wc lies beside the douche in the tray, 24 pixels on.
  const wc = { x: DOUCHE_IN_LADE.x + 24, y: DOUCHE_IN_LADE.y };
  scene.update(1 / 60, context({ ...DOUCHE_OP_0_0, pressX: wc.x, pressY: wc.y, clicked: true, released: true }));
  assert.deepEqual(gezet(scene), [op('douche', 0, 0)], 'refused');
  // Two cells along there is room, and one more click puts it there.
  scene.update(1 / 60, context({ x: DOUCHE_OP_0_0.x + 28, y: DOUCHE_OP_0_0.y, clicked: true, released: true }));
  assert.deepEqual(gezet(scene), [op('douche', 0, 0), op('wc', 2, 0)]);
});

test('scene: a drop near the edge is pulled inside the section', () => {
  const { scene } = nieuw();
  // Let go half a cell under the floor and half a cell before the nose.
  scene.update(1 / 60, context({
    x: 150 + 14 - 7, y: DOUCHE_OP_0_0.y + 7, pressX: DOUCHE_IN_LADE.x, pressY: DOUCHE_IN_LADE.y,
    clicked: true, released: true,
  }));
  assert.deepEqual(gezet(scene), [op('douche', 0, 0)]);
});

test('scene: H nine times builds the house, records it once, and Enter leaves', () => {
  const { scene, save } = nieuw();
  for (let n = 0; n < 9; n++) {
    assert.equal(save.get('tuinhuis'), undefined, 'not before it is finished');
    scene.update(1 / 60, context(stil, ['KeyH']));
    // Wiep may have something to say about the balance halfway.
    if (n < 8) lees(scene);
  }
  assert.ok(isSolved(d, gezet(scene)));
  assert.deepEqual(save.get('tuinhuis'), { swings: TUINHUIS_LEVEL.par, stars: 3 });

  let weg = 0;
  const pop = () => { weg++; };
  scene.update(0.3, context(stil, ['Enter'], pop));
  assert.equal(weg, 0, 'not before the panel has been up a moment');
  scene.update(0.4, context(stil, [], pop));
  scene.update(1 / 60, context(stil, ['Enter'], pop));
  assert.equal(weg, 1);
});

test('scene: H works with a piece in hand and with the wrong thing in the way', () => {
  const { scene } = nieuw();
  // The wc where the douche belongs, then the douche picked up and held.
  const wc = { x: DOUCHE_IN_LADE.x + 24, y: DOUCHE_IN_LADE.y };
  scene.update(1 / 60, context({ ...DOUCHE_OP_0_0, pressX: wc.x, pressY: wc.y, clicked: true, released: true }));
  scene.update(1 / 60, context({ ...DOUCHE_IN_LADE, clicked: true, released: true }));
  scene.update(1 / 60, context(stil, ['KeyH']));
  assert.deepEqual(gezet(scene), [op('douche', 0, 0)]);
});

test('scene: R empties the trailer, Escape leaves', () => {
  const { scene } = nieuw();
  scene.update(1 / 60, context(stil, ['KeyH']));
  assert.equal(gezet(scene).length, 1);
  scene.update(1 / 60, context(stil, ['KeyR']));
  assert.deepEqual(gezet(scene), []);
  let weg = 0;
  scene.update(1 / 60, context(stil, ['Escape'], () => { weg++; }));
  assert.equal(weg, 1);
});

test('scene: Wiep warns about the balance once, and only once', () => {
  const { scene } = nieuw();
  const praat = () => (scene as unknown as { uitleg: unknown }).uitleg !== null;
  // The stored house goes in from the nose, so five pieces in it hangs on the towbar.
  let gezegd = 0;
  for (let n = 0; n < 8; n++) {
    scene.update(1 / 60, context(stil, ['KeyH']));
    if (praat()) gezegd++;
    lees(scene);
  }
  assert.equal(gezegd, 1);
  // Start again and unbalance it again: she has said it.
  scene.update(1 / 60, context(stil, ['KeyR']));
  for (let n = 0; n < 8; n++) {
    scene.update(1 / 60, context(stil, ['KeyH']));
    assert.ok(!praat(), `hint ${n + 1}`);
  }
});

test('scene: draws inside the screen in every state without throwing', () => {
  const save = new Save(null);
  const scene = new TuinhuisScene(TUINHUIS_LEVEL, save);
  const buffer = new PixelBuffer(384, 216) as unknown as Screen;
  const teken = (muis: Muis = stil) => scene.render(buffer, context(muis));
  teken();                                            // Wiep on the drive
  lees(scene);
  teken({ x: 40, y: 90 });                            // full tray, pointing at a piece
  scene.update(1 / 60, context({ ...DOUCHE_IN_LADE, clicked: true, released: true }));
  teken({ x: 250, y: 90 });                           // piece in hand over the trailer
  teken({ x: 380, y: 210 });                          // piece in hand in the far corner
  scene.update(1 / 60, context({ x: 300, y: 60, clicked: true, released: true }));
  teken();                                            // a douche in mid air: faults showing
  scene.update(1 / 60, context(stil, ['KeyR']));
  for (let n = 0; n < 9; n++) {
    scene.update(1 / 60, context(stil, ['KeyH']));
    teken();
    if (n < 8) lees(scene);
  }
  teken();                                            // the win panel
  assert.deepEqual(save.get('tuinhuis'), { swings: 0, stars: 3 });
});
